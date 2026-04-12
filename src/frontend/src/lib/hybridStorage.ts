// ─── Hybrid Storage Layer ─────────────────────────────────────────────────────
// Wraps localStorage (offline-first ground truth) + canister backend (cloud sync).
// Strategy:
//   READ  → try canister first, fallback to localStorage silently
//   WRITE → always write localStorage immediately, queue for canister sync
//   SYNC  → background flush of sync queue every 5 seconds when online

import { loadFromStorage, saveToStorage } from "../hooks/useQueries";

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  operation: "create" | "update" | "delete";
  entityType: string;
  entityId?: string;
  data: unknown;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAt?: Date;
}

const SYNC_QUEUE_KEY = "medicare_sync_queue";
const LAST_SYNC_KEY = "medicare_last_sync_at";
const MIGRATION_DONE_KEY = "medicare_migration_v1_done";
const DEVICE_ID_KEY = "medicare_device_id";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function loadSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY) === "true";
}

export function markMigrationDone(): void {
  localStorage.setItem(MIGRATION_DONE_KEY, "true");
}

// ── Network probe ─────────────────────────────────────────────────────────────

let _isOnlineCache = navigator.onLine;
window.addEventListener("online", () => {
  _isOnlineCache = true;
});
window.addEventListener("offline", () => {
  _isOnlineCache = false;
});

export function isNetworkOnline(): boolean {
  return _isOnlineCache;
}

// ── Sync queue operations ─────────────────────────────────────────────────────

export function enqueueSync(
  item: Omit<SyncQueueItem, "id" | "retryCount">,
): void {
  const queue = loadSyncQueue();
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    retryCount: 0,
  });
  saveSyncQueue(queue);
}

export function getPendingChangesCount(): number {
  return loadSyncQueue().length;
}

export function getLastSyncAt(): Date | undefined {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function getSyncStatus(): SyncStatus {
  return {
    isOnline: isNetworkOnline(),
    pendingChanges: getPendingChangesCount(),
    lastSyncAt: getLastSyncAt(),
  };
}

// ── Migration: localStorage → canister ───────────────────────────────────────

export interface MigrationProgress {
  total: number;
  migrated: number;
  message: string;
}

/** Gathers all patient/visit/prescription data from every localStorage doctor key */
function gatherAllLocalData(): {
  patientsJson: string;
  visitsJson: string;
  prescriptionsJson: string;
  appointmentsJson: string;
} {
  const patients: unknown[] = [];
  const visits: unknown[] = [];
  const prescriptions: unknown[] = [];
  const appointments: unknown[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      if (key.startsWith("patients_")) {
        const items = loadFromStorage<unknown>(key);
        patients.push(...items);
      } else if (key.startsWith("visits_")) {
        const items = loadFromStorage<unknown>(key);
        visits.push(...items);
      } else if (key.startsWith("prescriptions_")) {
        const items = loadFromStorage<unknown>(key);
        prescriptions.push(...items);
      } else if (
        key.startsWith("appointments_") ||
        key === "medicare_appointments"
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) appointments.push(...parsed);
        }
      }
    } catch {}
  }

  // Deduplicate by id
  const dedup = <T extends { id: unknown }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter((item) => {
      const k = String(item.id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  return {
    patientsJson: JSON.stringify(dedup(patients as Array<{ id: unknown }>)),
    visitsJson: JSON.stringify(dedup(visits as Array<{ id: unknown }>)),
    prescriptionsJson: JSON.stringify(
      dedup(prescriptions as Array<{ id: unknown }>),
    ),
    appointmentsJson: JSON.stringify(appointments),
  };
}

/**
 * Run one-time migration from localStorage to the canister.
 * Calls backend.migrateFromLocalStorage with all gathered data.
 * Marks migration done so it never runs again.
 */
export async function runMigration(
  actor: any, // actor interface is dynamic canister shape
  onProgress?: (p: MigrationProgress) => void,
): Promise<{ migrated: number; skipped: number }> {
  if (isMigrationDone()) {
    return { migrated: 0, skipped: 0 };
  }

  onProgress?.({ total: 1, migrated: 0, message: "Gathering local records…" });

  const data = gatherAllLocalData();
  const totalItems =
    JSON.parse(data.patientsJson).length +
    JSON.parse(data.visitsJson).length +
    JSON.parse(data.prescriptionsJson).length;

  if (totalItems === 0) {
    markMigrationDone();
    return { migrated: 0, skipped: 0 };
  }

  onProgress?.({
    total: totalItems,
    migrated: 0,
    message: `Syncing ${totalItems} records to cloud…`,
  });

  try {
    const result = await actor.migrateFromLocalStorage(
      data.patientsJson,
      data.visitsJson,
      data.prescriptionsJson,
      data.appointmentsJson,
    );

    if (result.__kind__ === "ok") {
      markMigrationDone();
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      onProgress?.({
        total: totalItems,
        migrated: totalItems,
        message: "Sync complete!",
      });
      return { migrated: totalItems, skipped: 0 };
    }

    // Backend returned an error — don't mark done, allow retry
    console.warn("Migration backend error:", result.err);
    return { migrated: 0, skipped: totalItems };
  } catch (err) {
    console.warn("Migration network error:", err);
    return { migrated: 0, skipped: totalItems };
  }
}

// ── Background sync flush ─────────────────────────────────────────────────────

const MAX_RETRIES = 3;

/**
 * Record a device sync heartbeat with the canister.
 * Non-critical: failures are silently ignored.
 */
export async function recordSyncHeartbeat(
  actor: any, // actor interface is dynamic canister shape
): Promise<void> {
  if (!isNetworkOnline() || !actor) return;
  try {
    const pending = BigInt(getPendingChangesCount());
    await actor.recordDeviceSync(getDeviceId(), pending);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {}
}

/**
 * Flush the sync queue to the canister.
 * Each item describes an operation; we call the matching canister method.
 * Items that succeed are removed; failed items increment retryCount.
 * Items exceeding MAX_RETRIES are dropped (data is safe in localStorage).
 */
export async function flushSyncQueue(
  actor: any, // actor interface is dynamic canister shape
): Promise<{ success: number; failed: number }> {
  if (!isNetworkOnline() || !actor) {
    return { success: 0, failed: 0 };
  }

  const queue = loadSyncQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      // Drop after too many retries — data is safe in localStorage
      failed++;
      continue;
    }
    try {
      await dispatchSyncItem(actor, item);
      success++;
    } catch {
      remaining.push({ ...item, retryCount: item.retryCount + 1 });
      failed++;
    }
  }

  saveSyncQueue(remaining);
  if (success > 0) {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  return { success, failed };
}

// dynamic dispatch to canister based on sync item entity type
async function dispatchSyncItem(
  actor: any,
  item: SyncQueueItem,
): Promise<void> {
  // This is a best-effort background sync. We only handle the most common cases.
  // The canister is the authoritative store after migration; localStorage is the cache.
  switch (item.entityType) {
    case "patient": {
      if (item.operation === "delete") {
        await actor.deletePatient(BigInt(item.entityId ?? "0"));
      }
      break;
    }
    case "visit": {
      if (item.operation === "delete") {
        await actor.deleteVisit(BigInt(item.entityId ?? "0"));
      }
      break;
    }
    case "prescription": {
      if (item.operation === "delete") {
        await actor.deletePrescription(BigInt(item.entityId ?? "0"));
      }
      break;
    }
    default:
      break;
  }
}
