import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Bell,
  ClipboardList,
  Clock,
  FileText,
  Stethoscope,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import type { Patient } from "../../types";

interface LocalPatient extends Patient {
  registerNumber?: string;
  bedNumber?: string;
  ward?: string;
  isAdmitted?: boolean;
}

function loadAllPatients(): LocalPatient[] {
  const result: LocalPatient[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("patients_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as LocalPatient[];
      result.push(...arr);
    } catch {}
  }
  return result;
}

function getAlertSeverity(
  patient: LocalPatient,
): "critical" | "warning" | "stable" {
  try {
    const alerts: Array<{ severity: string }> = JSON.parse(
      localStorage.getItem(`alerts_${String(patient.id)}`) || "[]",
    );
    if (
      alerts.some((a) => a.severity === "Critical" || a.severity === "critical")
    )
      return "critical";
    if (
      alerts.some((a) => a.severity === "Warning" || a.severity === "warning")
    )
      return "warning";
  } catch {}
  return "stable";
}

function getRecentPrescriptions() {
  const results: Array<{
    id: string;
    patientName: string;
    diagnosis: string;
    createdAt: string;
    status: string;
  }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("prescriptions_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as Array<
        Record<string, unknown>
      >;
      for (const rx of arr) {
        results.push({
          id: String(rx.id ?? ""),
          patientName: String(rx.patientName ?? "Unknown"),
          diagnosis: String(rx.diagnosis ?? "—"),
          createdAt: String(rx.createdAt ?? ""),
          status: String(rx.status ?? "active"),
        });
      }
    } catch {}
  }
  return results
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConsultantDashboard() {
  const { currentDoctor } = useEmailAuth();
  const navigate = useNavigate();

  const allPatients = useMemo(loadAllPatients, []);
  const admittedPatients = allPatients.filter(
    (p) =>
      p.isAdmitted || p.patientType === "admitted" || p.status === "Admitted",
  );
  const opdPatients = allPatients.filter(
    (p) =>
      !p.isAdmitted && p.patientType !== "admitted" && p.status !== "Admitted",
  );
  const criticalPatients = admittedPatients.filter(
    (p) => getAlertSeverity(p) === "critical",
  );
  const recentRx = useMemo(getRecentPrescriptions, []);

  const today = new Date().toISOString().split("T")[0];
  const opdToday = opdPatients.filter((p) => {
    const created = String((p as Record<string, unknown>).createdAt ?? "");
    return created.startsWith(today);
  }).length;

  const pendingRx = recentRx.filter(
    (r) => r.status === "draft_awaiting_approval",
  ).length;

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="consultant.dashboard"
    >
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {currentDoctor?.designation} {currentDoctor?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Consultant Doctor Dashboard
          </p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs px-3 py-1">
          Consultant
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={BedDouble}
          label="Total Admitted"
          value={admittedPatients.length}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={Users}
          label="OPD Seen Today"
          value={opdToday}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={FileText}
          label="Pending Prescriptions"
          value={pendingRx}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={Bell}
          label="Active Alerts"
          value={criticalPatients.length}
          color="bg-red-100 text-red-700"
        />
      </div>

      {/* Critical Alerts */}
      {criticalPatients.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="font-semibold text-red-800 text-sm">
                Critical Patients — Immediate Attention Required
              </h2>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {criticalPatients.slice(0, 4).map((p) => (
              <button
                key={String(p.id)}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/PatientProfile",
                    search: { id: String(p.id) },
                  })
                }
                className="w-full flex items-center gap-3 bg-white border border-red-200 rounded-lg px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
                data-ocid={`consultant.critical_patient.${String(p.id)}`}
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-red-700 text-sm">
                    {p.fullName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {p.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bed {p.bedNumber || "—"} · {p.ward || "General"}
                  </p>
                </div>
                <Badge className="bg-red-600 text-white text-[10px] shrink-0">
                  CRITICAL
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patient Tabs */}
      <Tabs defaultValue="ipd">
        <TabsList className="mb-4">
          <TabsTrigger value="ipd" data-ocid="consultant.tab.ipd">
            Admitted (IPD){" "}
            <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {admittedPatients.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="opd" data-ocid="consultant.tab.opd">
            Outpatient (OPD){" "}
            <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {opdPatients.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ipd">
          {admittedPatients.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="consultant.ipd.empty_state"
            >
              <BedDouble className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No admitted patients</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {admittedPatients.map((p) => {
                const severity = getAlertSeverity(p);
                const severityColors = {
                  critical: "border-red-300 bg-red-50/30",
                  warning: "border-amber-300 bg-amber-50/30",
                  stable: "border-border bg-card",
                };
                const badgeColors = {
                  critical: "bg-red-600 text-white",
                  warning: "bg-amber-500 text-white",
                  stable: "bg-emerald-500 text-white",
                };
                return (
                  <button
                    key={String(p.id)}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/PatientProfile",
                        search: { id: String(p.id) },
                      })
                    }
                    className={`border rounded-xl p-4 text-left hover:shadow-md transition-all ${severityColors[severity]}`}
                    data-ocid={`consultant.ipd_card.${String(p.id)}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="font-bold text-indigo-700">
                            {p.fullName.charAt(0)}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-foreground truncate">
                          {p.fullName}
                        </p>
                      </div>
                      <Badge
                        className={`text-[10px] shrink-0 capitalize ${badgeColors[severity]}`}
                      >
                        {severity}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 pl-11">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> Bed{" "}
                        {p.bedNumber || "—"} · {p.ward || "General Ward"}
                      </p>
                      {p.registerNumber && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.registerNumber}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center text-xs text-primary font-medium gap-1">
                      View Profile <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opd">
          {opdPatients.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="consultant.opd.empty_state"
            >
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No outpatients found</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {opdPatients.slice(0, 12).map((p) => (
                <button
                  key={String(p.id)}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/PatientProfile",
                      search: { id: String(p.id) },
                    })
                  }
                  className="border rounded-xl p-4 text-left hover:shadow-md transition-all bg-card"
                  data-ocid={`consultant.opd_card.${String(p.id)}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="font-bold text-emerald-700">
                        {p.fullName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {p.fullName}
                      </p>
                      {p.registerNumber && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.registerNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Prescriptions */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">
              Recent Prescriptions
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => navigate({ to: "/Patients" })}
          >
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {recentRx.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-ocid="consultant.recent_rx.empty_state"
            >
              No prescriptions yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentRx.map((rx) => (
                <div
                  key={rx.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {rx.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rx.diagnosis}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rx.status === "draft_awaiting_approval" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-300 text-amber-700"
                      >
                        Draft
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rx.createdAt
                        ? new Date(rx.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
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
