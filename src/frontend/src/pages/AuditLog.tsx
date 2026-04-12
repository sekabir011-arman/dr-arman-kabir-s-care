// Enhanced Audit Log — full before/after trail visible only to Admin + Consultant Doctor

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  Download,
  FileText,
  Lock,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { type AuditLogEntry, getAuditLog } from "../hooks/useEmailAuth";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { useRolePermissions } from "../hooks/useRolePermissions";
import type { AuditEntry } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClinicalAuditEntries(): AuditEntry[] {
  try {
    const store = JSON.parse(
      localStorage.getItem("medicare_clinical_data") || "{}",
    ) as Record<string, unknown[]>;
    return (store.auditTrail ?? []) as AuditEntry[];
  } catch {
    return [];
  }
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-100 text-amber-800",
  doctor: "bg-blue-100 text-blue-800",
  consultant_doctor: "bg-purple-100 text-purple-800",
  medical_officer: "bg-sky-100 text-sky-800",
  intern_doctor: "bg-cyan-100 text-cyan-800",
  nurse: "bg-pink-100 text-pink-800",
  staff: "bg-gray-100 text-gray-700",
  patient: "bg-teal-100 text-teal-800",
};

const ENTITY_TYPES = [
  "All",
  "Patient",
  "Visit",
  "Prescription",
  "Observation",
  "ClinicalNote",
  "ClinicalOrder",
  "BedRecord",
];

const PAGE_SIZE = 50;

// ── Legacy log row ────────────────────────────────────────────────────────────

function LegacyLogRow({ log, idx }: { log: AuditLogEntry; idx: number }) {
  return (
    <TableRow data-ocid={`audit_log.item.${idx + 1}`}>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
      </TableCell>
      <TableCell className="font-medium text-sm">{log.userName}</TableCell>
      <TableCell>
        <Badge
          className={`text-xs border-0 ${ROLE_COLORS[log.userRole] ?? "bg-gray-100 text-gray-700"}`}
        >
          {log.userRole}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">—</TableCell>
      <TableCell className="text-sm">{log.action}</TableCell>
      <TableCell className="text-sm text-muted-foreground">—</TableCell>
      <TableCell className="text-sm text-muted-foreground">—</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
        {log.target}
      </TableCell>
    </TableRow>
  );
}

// ── Clinical audit row ────────────────────────────────────────────────────────

function ClinicalAuditRow({ entry, idx }: { entry: AuditEntry; idx: number }) {
  const changedAt = new Date(Number(entry.changedAt) / 1_000_000);
  return (
    <TableRow data-ocid={`audit_log.item.${idx + 1}`}>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(changedAt, "MMM d, yyyy HH:mm:ss")}
      </TableCell>
      <TableCell className="font-medium text-sm">
        {entry.changedByName}
      </TableCell>
      <TableCell>
        <Badge
          className={`text-xs border-0 ${ROLE_COLORS[entry.changedByRole] ?? "bg-gray-100 text-gray-700"}`}
        >
          {entry.changedByRole}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <Badge variant="outline" className="text-xs font-mono">
          {entry.entityType}
        </Badge>
      </TableCell>
      <TableCell className="text-sm font-medium">{entry.fieldName}</TableCell>
      <TableCell className="text-xs max-w-[120px]">
        {entry.beforeValue ? (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-mono truncate block">
            {entry.beforeValue}
          </span>
        ) : (
          <span className="text-muted-foreground italic">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs max-w-[120px]">
        <span className="bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-mono truncate block">
          {entry.afterValue}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
        {entry.reason ?? "—"}
      </TableCell>
    </TableRow>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const { currentDoctor } = useEmailAuth();
  const { isAdmin } = useAdminAuth();
  const permissions = useRolePermissions();

  const canView =
    isAdmin ||
    (currentDoctor?.role === "consultant_doctor" &&
      permissions.canViewAuditTrail);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Legacy logs
  const legacyLogs = useMemo(() => {
    const logs = getAuditLog();
    return [...logs].reverse();
  }, []);

  // Clinical audit entries
  const clinicalEntries = useMemo(() => getClinicalAuditEntries(), []);

  // All unique roles in logs
  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const l of legacyLogs) roles.add(l.userRole);
    for (const e of clinicalEntries) roles.add(e.changedByRole);
    return ["All", ...Array.from(roles)];
  }, [legacyLogs, clinicalEntries]);

  const filteredLegacy = useMemo(() => {
    return legacyLogs.filter((log) => {
      if (roleFilter !== "All" && log.userRole !== roleFilter) return false;
      if (entityFilter !== "All") return false; // legacy has no entity type
      if (search) {
        const q = search.toLowerCase();
        if (
          !log.userName.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q) &&
          !log.target.toLowerCase().includes(q)
        )
          return false;
      }
      if (fromDate && new Date(log.timestamp) < new Date(fromDate))
        return false;
      if (toDate && new Date(log.timestamp) > new Date(`${toDate}T23:59:59`))
        return false;
      return true;
    });
  }, [legacyLogs, search, fromDate, toDate, entityFilter, roleFilter]);

  const filteredClinical = useMemo(() => {
    return clinicalEntries.filter((entry) => {
      if (roleFilter !== "All" && entry.changedByRole !== roleFilter)
        return false;
      if (entityFilter !== "All" && entry.entityType !== entityFilter)
        return false;
      const changedAt = new Date(Number(entry.changedAt) / 1_000_000);
      if (fromDate && changedAt < new Date(fromDate)) return false;
      if (toDate && changedAt > new Date(`${toDate}T23:59:59`)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !entry.changedByName.toLowerCase().includes(q) &&
          !entry.fieldName.toLowerCase().includes(q) &&
          !entry.entityType.toLowerCase().includes(q) &&
          !(entry.afterValue ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [clinicalEntries, search, fromDate, toDate, entityFilter, roleFilter]);

  const totalEntries = filteredLegacy.length + filteredClinical.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  // Paginate: show clinical entries first (most detailed), then legacy
  const pagedClinical = filteredClinical.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const remainingSlots = PAGE_SIZE - pagedClinical.length;
  const legacyOffset = Math.max(
    0,
    (page - 1) * PAGE_SIZE - filteredClinical.length,
  );
  const pagedLegacy = filteredLegacy.slice(
    legacyOffset,
    legacyOffset + remainingSlots,
  );

  const exportCSV = () => {
    const header =
      "Timestamp,User,Role,EntityType,Field,BeforeValue,AfterValue,Target/Reason";
    const clinicalRows = filteredClinical.map((e) => {
      const changedAt = new Date(Number(e.changedAt) / 1_000_000).toISOString();
      return `"${changedAt}","${e.changedByName}","${e.changedByRole}","${e.entityType}","${e.fieldName}","${e.beforeValue ?? ""}","${e.afterValue}","${e.reason ?? ""}"`;
    });
    const legacyRows = filteredLegacy.map(
      (l) =>
        `"${l.timestamp}","${l.userName}","${l.userRole}","—","${l.action}","—","—","${l.target}"`,
    );
    const csv = [header, ...clinicalRows, ...legacyRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Access denied
  if (!canView) {
    return (
      <div
        className="max-w-2xl mx-auto p-6 mt-16 text-center"
        data-ocid="audit_log.access_denied_state"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-700" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Restricted Access
        </h2>
        <p className="text-muted-foreground text-sm">
          The Audit Trail is only visible to <strong>Admin</strong> and{" "}
          <strong>Consultant Doctor</strong> roles for medico-legal compliance.
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5"
      data-ocid="audit_log.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Full Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalEntries} entries — before/after values tracked for
            medico-legal safety
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
        <ArrowRightLeft className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Before → After Audit Trail</p>
          <p className="text-xs mt-0.5">
            Every change is recorded with the original value (amber) and new
            value (green). This log is immutable — no records can be deleted.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48 space-y-1">
          <label
            htmlFor="audit-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              id="audit-search"
              placeholder="User, action, field..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              data-ocid="audit_log.search_input"
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Entity Type
          </p>
          <Select
            value={entityFilter}
            onValueChange={(v) => {
              setEntityFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-40 h-9 text-sm"
              data-ocid="audit_log.entity_filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-40 h-9 text-sm"
              data-ocid="audit_log.role_filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allRoles.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-2"
          data-ocid="audit_log.export.button"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div
        className="bg-card border border-border rounded-xl overflow-hidden"
        data-ocid="audit_log.table"
      >
        {totalEntries === 0 ? (
          <div className="text-center py-16" data-ocid="audit_log.empty_state">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No audit entries found</p>
          </div>
        ) : (
          <ScrollArea className="h-[58vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-xs w-40">
                    Timestamp
                  </TableHead>
                  <TableHead className="font-semibold text-xs">
                    Changed By
                  </TableHead>
                  <TableHead className="font-semibold text-xs w-28">
                    Role
                  </TableHead>
                  <TableHead className="font-semibold text-xs w-28">
                    Entity
                  </TableHead>
                  <TableHead className="font-semibold text-xs">
                    Field / Action
                  </TableHead>
                  <TableHead className="font-semibold text-xs w-32 text-amber-700">
                    Before
                  </TableHead>
                  <TableHead className="font-semibold text-xs w-32 text-green-700">
                    After
                  </TableHead>
                  <TableHead className="font-semibold text-xs">
                    Reason / Target
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedClinical.map((entry, idx) => (
                  <ClinicalAuditRow
                    key={entry.id.toString()}
                    entry={entry}
                    idx={idx}
                  />
                ))}
                {pagedLegacy.map((log, idx) => (
                  <LegacyLogRow
                    key={log.id}
                    log={log}
                    idx={pagedClinical.length + idx}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between text-sm"
          data-ocid="audit_log.pagination"
        >
          <p className="text-muted-foreground">
            Page {page} of {totalPages} · {totalEntries} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              data-ocid="audit_log.prev_page.button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-ocid="audit_log.next_page.button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
