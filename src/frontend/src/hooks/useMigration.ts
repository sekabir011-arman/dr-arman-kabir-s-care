// ─── Migration & Sync Hook ────────────────────────────────────────────────────
// Handles one-time transparent migration from localStorage → canister.
// Also drives the 15-second polling loop that keeps all devices in sync:
//   1. Flush pending local writes → canister
//   2. Pull remote updates from canister → localStorage
//   3. Invalidate React Query cache so both devices show fresh data

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type MigrationProgress,
  flushSyncQueue,
  isMigrationDone,
  isNetworkOnline,
  markMigrationDone,
  pollAndUpdateFromCanister,
  recordSyncHeartbeat,
  runMigration,
} from "../lib/hybridStorage";

export type MigrationStatus = "idle" | "running" | "complete" | "failed";

export interface MigrationState {
  migrationStatus: MigrationStatus;
  migrationProgress: MigrationProgress;
  runManualMigration: () => void;
}

const DEFAULT_PROGRESS: MigrationProgress = {
  total: 0,
  migrated: 0,
  message: "",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMigration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any | null,
  /** Optional: pass queryClient.invalidateQueries so the sync loop triggers UI refresh */
  invalidateAll?: () => void,
): MigrationState {
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [progress, setProgress] = useState<MigrationProgress>(DEFAULT_PROGRESS);
  const hasRunRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doMigration = useCallback(async () => {
    if (!actor || hasRunRef.current) return;
    if (isMigrationDone()) {
      await recordSyncHeartbeat(actor);
      return;
    }

    if (!isNetworkOnline()) return;

    hasRunRef.current = true;
    setStatus("running");
    setProgress({ total: 0, migrated: 0, message: "Preparing sync…" });

    await new Promise((r) => setTimeout(r, 500));

    try {
      const result = await runMigration(actor, (p) => setProgress(p));
      if (result.migrated > 0) {
        setProgress({
          total: result.migrated,
          migrated: result.migrated,
          message: `${result.migrated} records synced to cloud`,
        });
      }
      setStatus("complete");
    } catch (err) {
      console.warn("Migration failed:", err);
      setStatus("failed");
      hasRunRef.current = false;
    }
  }, [actor]);

  // ── Full sync cycle: flush writes + pull remote + invalidate cache ───────────
  const doSyncCycle = useCallback(async () => {
    if (!actor || !isNetworkOnline()) return;
    try {
      // 1. Push any pending local writes to canister
      await flushSyncQueue(actor);

      // 2. Pull remote updates from canister into localStorage
      const hadUpdates = await pollAndUpdateFromCanister(actor);

      // 3. Always invalidate React Query cache so pages re-read from localStorage
      //    (which now contains the freshest canister data)
      if (hadUpdates && invalidateAll) {
        invalidateAll();
      } else if (invalidateAll) {
        // Even without detected updates, invalidate to pick up any
        // canister data that differs from stale query cache
        invalidateAll();
      }

      // 4. Record heartbeat
      await recordSyncHeartbeat(actor);
    } catch (err) {
      console.warn("Sync cycle error:", err);
    }
  }, [actor, invalidateAll]);

  // Auto-run migration on mount when actor becomes available
  useEffect(() => {
    if (!actor) return;
    doMigration();
  }, [actor, doMigration]);

  // ── Polling loop: runs every 15s ─────────────────────────────────────────────
  useEffect(() => {
    if (!actor) return;

    // Run once immediately after mount (staggered 2s to let migration go first)
    const initialTimer = setTimeout(() => doSyncCycle(), 2000);

    syncIntervalRef.current = setInterval(doSyncCycle, 15_000);
    return () => {
      clearTimeout(initialTimer);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [actor, doSyncCycle]);

  // ── On window 'online' event: immediate flush + poll ─────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      // Retry migration if not done
      if (!isMigrationDone() && actor && !hasRunRef.current) {
        doMigration();
      }
      // Immediately sync and invalidate so the newly-online device gets
      // all changes made by the other device while this one was offline
      doSyncCycle();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [actor, doMigration, doSyncCycle]);

  // ── On window focus: trigger a sync so switching back to the tab refreshes ──
  useEffect(() => {
    const handleFocus = () => {
      doSyncCycle();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) handleFocus();
    });
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [doSyncCycle]);

  const runManualMigration = useCallback(() => {
    if (status === "running") return;
    hasRunRef.current = false;
    doMigration();
  }, [status, doMigration]);

  return {
    migrationStatus: status,
    migrationProgress: progress,
    runManualMigration,
  };
}

// ── Offline queue size hook ───────────────────────────────────────────────────

import { getPendingChangesCount, getSyncStatus } from "../lib/hybridStorage";
import type { SyncStatus } from "../lib/hybridStorage";

export function useSyncStatus(): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => {
    const update = () => setSyncStatus(getSyncStatus());
    const iv = setInterval(update, 3000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      clearInterval(iv);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return syncStatus;
}

export { getPendingChangesCount, markMigrationDone, isMigrationDone };
