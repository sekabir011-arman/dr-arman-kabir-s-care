// ─── Migration Hook ───────────────────────────────────────────────────────────
// Handles one-time transparent migration from localStorage → canister.
// Runs automatically on first mount if not previously done.
// Shows a brief toast (not an intrusive modal) during migration.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type MigrationProgress,
  isMigrationDone,
  isNetworkOnline,
  markMigrationDone,
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
  actor: any | null, // dynamic canister interface
): MigrationState {
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [progress, setProgress] = useState<MigrationProgress>(DEFAULT_PROGRESS);
  const hasRunRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doMigration = useCallback(async () => {
    if (!actor || hasRunRef.current) return;
    if (isMigrationDone()) {
      // Migration already complete — just run heartbeat
      await recordSyncHeartbeat(actor);
      return;
    }

    if (!isNetworkOnline()) {
      // Skip gracefully — will retry next time online
      return;
    }

    hasRunRef.current = true;
    setStatus("running");
    setProgress({ total: 0, migrated: 0, message: "Preparing sync…" });

    // Brief delay so the toast has time to show
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
      // Don't block the app — localStorage is still the ground truth
      setStatus("failed");
      hasRunRef.current = false; // allow retry
    }
  }, [actor]);

  // Auto-run migration on mount when actor becomes available
  useEffect(() => {
    if (!actor) return;
    doMigration();
  }, [actor, doMigration]);

  // Background sync heartbeat every 5 seconds when online
  useEffect(() => {
    if (!actor) return;

    const runHeartbeat = async () => {
      if (isNetworkOnline()) {
        await recordSyncHeartbeat(actor);
      }
    };

    syncIntervalRef.current = setInterval(runHeartbeat, 5000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [actor]);

  // Re-attempt migration when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (!isMigrationDone() && actor && !hasRunRef.current) {
        doMigration();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [actor, doMigration]);

  const runManualMigration = useCallback(() => {
    if (status === "running") return;
    // Force re-run (clear the done flag is NOT done here — manual migration
    // is additive, not destructive)
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
