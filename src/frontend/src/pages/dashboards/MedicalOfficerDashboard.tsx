import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { useMemo } from "react";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import type { Patient } from "../../types";

interface LocalPatient extends Patient {
  bedNumber?: string;
  ward?: string;
  isAdmitted?: boolean;
}

function loadAdmittedPatients(): LocalPatient[] {
  const result: LocalPatient[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("patients_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as LocalPatient[];
      result.push(
        ...arr.filter(
          (p) =>
            p.isAdmitted ||
            p.patientType === "admitted" ||
            p.status === "Admitted",
        ),
      );
    } catch {}
  }
  return result;
}

function getPendingDrafts() {
  const results: Array<{ id: string; patientName: string; createdAt: string }> =
    [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("prescriptions_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as Array<
        Record<string, unknown>
      >;
      for (const rx of arr) {
        if (rx.status === "draft_awaiting_approval") {
          results.push({
            id: String(rx.id ?? ""),
            patientName: String(rx.patientName ?? "Unknown"),
            createdAt: String(rx.createdAt ?? ""),
          });
        }
      }
    } catch {}
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getRecentActivity() {
  const logs: Array<{
    timestamp: string;
    userName: string;
    action: string;
    target: string;
  }> = [];
  try {
    const raw = localStorage.getItem("medicare_audit_log");
    if (raw) {
      const all = JSON.parse(raw) as typeof logs;
      return all.slice(-8).reverse();
    }
  } catch {}
  return logs;
}

export default function MedicalOfficerDashboard() {
  const { currentDoctor } = useEmailAuth();
  const navigate = useNavigate();

  const admittedPatients = useMemo(loadAdmittedPatients, []);
  const pendingDrafts = useMemo(getPendingDrafts, []);
  const recentActivity = useMemo(getRecentActivity, []);

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="mo.dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {currentDoctor?.designation} {currentDoctor?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Medical Officer Dashboard
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-3 py-1">
          Medical Officer
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {admittedPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admitted Patients
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {pendingDrafts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pending Approvals
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {recentActivity.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recent Activities
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Admitted patients */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-foreground text-sm">
                Admitted Patients
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => navigate({ to: "/Patients" })}
            >
              All <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {admittedPatients.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="mo.admitted.empty_state"
              >
                <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No admitted patients</p>
              </div>
            ) : (
              admittedPatients.slice(0, 6).map((p) => (
                <div
                  key={String(p.id)}
                  className="border border-border rounded-xl p-3 flex items-center gap-3"
                  data-ocid={`mo.patient_card.${String(p.id)}`}
                >
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-green-700 text-sm">
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
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      data-ocid="mo.add_note.button"
                    >
                      <PlusCircle className="w-3 h-3" /> Note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      data-ocid="mo.view_patient.button"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pending drafts */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-foreground text-sm">
                  Prescriptions Awaiting Approval
                </h2>
                {pendingDrafts.length > 0 && (
                  <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200 text-xs">
                    {pendingDrafts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {pendingDrafts.length === 0 ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 py-2"
                  data-ocid="mo.drafts.empty_state"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm">All prescriptions approved</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDrafts.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2"
                    >
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {d.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-300 text-amber-700 shrink-0"
                      >
                        Draft
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Recent Activity
                </h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {recentActivity.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-2"
                  data-ocid="mo.activity.empty_state"
                >
                  No recent activity
                </p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.slice(0, 5).map((entry, i) => (
                    <div
                      key={`${entry.timestamp}-${i}`}
                      className="text-xs text-muted-foreground flex items-start gap-2 py-1 border-b border-border last:border-0"
                    >
                      <span className="font-medium text-foreground min-w-0 truncate">
                        {entry.userName}
                      </span>
                      <span className="shrink-0">{entry.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
