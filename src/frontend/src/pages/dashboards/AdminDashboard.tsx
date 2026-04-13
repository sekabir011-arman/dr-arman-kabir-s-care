import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getAuditLog,
  loadPatientRegistry,
  loadRegistry,
  savePatientRegistry,
  saveRegistry,
} from "../../hooks/useEmailAuth";
import type { DoctorAccount, PatientAccount } from "../../hooks/useEmailAuth";
import { STAFF_ROLE_LABELS } from "../../types";
import type { StaffRole } from "../../types";

function getTotalPatients(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("patients_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as unknown[];
      count += arr.length;
    } catch {}
  }
  return count;
}

function getSyncStatus(): string {
  const lastSync = localStorage.getItem("medicare_last_sync");
  if (!lastSync) return "Never synced";
  const diffMs = Date.now() - Number(lastSync);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export default function AdminDashboard() {
  const [pendingStaff, setPendingStaff] = useState<DoctorAccount[]>([]);
  const [pendingPatients, setPendingPatients] = useState<PatientAccount[]>([]);
  const [approvalRoles, setApprovalRoles] = useState<Record<string, StaffRole>>(
    {},
  );
  const [, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setPendingStaff(loadRegistry().filter((d) => d.status === "pending"));
    setPendingPatients(
      loadPatientRegistry().filter((p) => p.status === "pending"),
    );
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [refresh]);

  const allStaff = useMemo(
    () => loadRegistry().filter((d) => d.status === "approved"),
    [],
  );
  const recentLogs = useMemo(() => getAuditLog().slice(-10).reverse(), []);
  const totalPatients = useMemo(getTotalPatients, []);
  const syncStatus = useMemo(getSyncStatus, []);

  const approveStaff = (acc: DoctorAccount) => {
    const role = approvalRoles[acc.id] ?? acc.role ?? "doctor";
    const reg = loadRegistry();
    const idx = reg.findIndex((d) => d.id === acc.id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "approved", role };
      saveRegistry(reg);
      refresh();
      toast.success(
        `${acc.name} approved as ${STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role}`,
      );
    }
  };

  const rejectStaff = (id: string) => {
    const reg = loadRegistry();
    const idx = reg.findIndex((d) => d.id === id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "rejected" };
      saveRegistry(reg);
      refresh();
      toast.success("Account rejected");
    }
  };

  const approvePatient = (id: string) => {
    const reg = loadPatientRegistry();
    const idx = reg.findIndex((p) => p.id === id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "approved" };
      savePatientRegistry(reg);
      refresh();
      toast.success("Patient account approved");
    }
  };

  const rejectPatient = (id: string) => {
    const reg = loadPatientRegistry();
    const idx = reg.findIndex((p) => p.id === id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "rejected" };
      savePatientRegistry(reg);
      refresh();
      toast.success("Patient account rejected");
    }
  };

  const totalPending = pendingStaff.length + pendingPatients.length;

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="admin.dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            System management & approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <Badge className="bg-amber-600 text-white text-xs px-3 py-1 animate-pulse">
              {totalPending} Pending Approval{totalPending !== 1 ? "s" : ""}
            </Badge>
          )}
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-3 py-1">
            Admin
          </Badge>
        </div>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {totalPatients}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Patients
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {allStaff.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Staff
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {totalPending}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pending Approvals
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none truncate">
                {syncStatus}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Last Sync</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Staff approvals */}
        <Card className={pendingStaff.length > 0 ? "border-amber-200" : ""}>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-foreground text-sm">
                Staff / Doctor Approvals
              </h2>
              {pendingStaff.length > 0 && (
                <Badge className="ml-auto bg-amber-600 text-white text-xs">
                  {pendingStaff.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {pendingStaff.length === 0 ? (
              <div
                className="flex items-center gap-2 text-emerald-600 py-3"
                data-ocid="admin.staff_approvals.empty_state"
              >
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-sm">No pending staff approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStaff.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2"
                    data-ocid={`admin.staff_item.${acc.id}`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {acc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acc.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(acc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={approvalRoles[acc.id] ?? acc.role ?? "doctor"}
                        onValueChange={(v) =>
                          setApprovalRoles((prev) => ({
                            ...prev,
                            [acc.id]: v as StaffRole,
                          }))
                        }
                      >
                        <SelectTrigger
                          className="h-7 text-xs flex-1"
                          data-ocid="admin.role.select"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(STAFF_ROLE_LABELS) as Array<
                              keyof typeof STAFF_ROLE_LABELS
                            >
                          ).map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {STAFF_ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 shrink-0"
                        onClick={() => approveStaff(acc)}
                        data-ocid="admin.approve.button"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50 gap-1 shrink-0"
                        onClick={() => rejectStaff(acc.id)}
                        data-ocid="admin.reject.button"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient approvals */}
        <Card className={pendingPatients.length > 0 ? "border-teal-200" : ""}>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-foreground text-sm">
                Patient Account Approvals
              </h2>
              {pendingPatients.length > 0 && (
                <Badge className="ml-auto bg-teal-600 text-white text-xs">
                  {pendingPatients.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {pendingPatients.length === 0 ? (
              <div
                className="flex items-center gap-2 text-emerald-600 py-3"
                data-ocid="admin.patient_approvals.empty_state"
              >
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-sm">No pending patient accounts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPatients.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between gap-3"
                    data-ocid={`admin.patient_item.${acc.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {acc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acc.phone}
                      </p>
                      {acc.registerNumber && (
                        <p className="text-xs font-mono text-teal-700">
                          {acc.registerNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                        onClick={() => approvePatient(acc.id)}
                        data-ocid="admin.approve.button"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50 gap-1"
                        onClick={() => rejectPatient(acc.id)}
                        data-ocid="admin.reject.button"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit log */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-foreground text-sm">
              Recent Audit Log
            </h2>
            <Badge className="ml-auto bg-purple-100 text-purple-700 border-purple-200 text-xs">
              {recentLogs.length} entries
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => {
                window.location.href = "/AuditLog";
              }}
              data-ocid="admin.view_audit.button"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {recentLogs.length === 0 ? (
            <p
              className="text-sm text-muted-foreground py-3 text-center"
              data-ocid="admin.audit.empty_state"
            >
              No audit entries yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentLogs.map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  className="py-2.5 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{entry.userName}</span>{" "}
                      <span className="text-muted-foreground">
                        {entry.action}
                      </span>
                      {entry.target && entry.target !== "System" && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {entry.target}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-purple-200 text-purple-700"
                      >
                        {entry.userRole}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
