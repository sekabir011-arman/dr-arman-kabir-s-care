import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Loader2,
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

interface DraftItem {
  id: string;
  patientName: string;
  diagnosis: string;
  createdAt: string;
  type: "prescription" | "note";
}

function loadMyDrafts(doctorEmail: string): DraftItem[] {
  const results: DraftItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("prescriptions_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as Array<
        Record<string, unknown>
      >;
      for (const rx of arr) {
        if (
          rx.status === "draft_awaiting_approval" &&
          (rx.createdBy === doctorEmail || rx.createdByEmail === doctorEmail)
        ) {
          results.push({
            id: String(rx.id ?? ""),
            patientName: String(rx.patientName ?? "Unknown"),
            diagnosis: String(rx.diagnosis ?? "—"),
            createdAt: String(rx.createdAt ?? ""),
            type: "prescription",
          });
        }
      }
    } catch {}
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export default function InternDashboard() {
  const { currentDoctor } = useEmailAuth();
  const navigate = useNavigate();

  const admittedPatients = useMemo(loadAdmittedPatients, []);
  const myDrafts = useMemo(
    () => loadMyDrafts(currentDoctor?.email ?? ""),
    [currentDoctor?.email],
  );

  // Pending tasks: patients without a progress note today
  const today = new Date().toISOString().split("T")[0];
  const patientsNeedingHistory = admittedPatients.filter((p) => {
    try {
      const notes = JSON.parse(
        localStorage.getItem(`clinicalNotes_${String(p.id)}`) || "[]",
      ) as Array<{ createdAt: string }>;
      return !notes.some((n) => n.createdAt?.startsWith(today));
    } catch {
      return true;
    }
  });

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="intern.dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {currentDoctor?.designation} {currentDoctor?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Intern Doctor Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          {myDrafts.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-3 py-1">
              {myDrafts.length} Awaiting Review
            </Badge>
          )}
          <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs px-3 py-1">
            Intern Doctor
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {admittedPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Admitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Loader2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {myDrafts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">My Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {patientsNeedingHistory.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pending Tasks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Admitted patients list */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-sky-600" />
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
                data-ocid="intern.admitted.empty_state"
              >
                <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No admitted patients</p>
              </div>
            ) : (
              admittedPatients.slice(0, 8).map((p) => (
                <button
                  key={String(p.id)}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/PatientProfile",
                      search: { id: String(p.id) },
                    })
                  }
                  className="w-full border border-border rounded-xl p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                  data-ocid={`intern.patient_card.${String(p.id)}`}
                >
                  <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-sky-700 text-sm">
                      {p.fullName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {p.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bed {p.bedNumber || "—"} ·{" "}
                      {((p as Record<string, unknown>)
                        .currentDiagnosis as string) ||
                        p.ward ||
                        "No diagnosis yet"}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* My drafts */}
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-foreground text-sm">
                  My Drafts — Awaiting Review
                </h2>
                {myDrafts.length > 0 && (
                  <Badge className="ml-auto bg-amber-600 text-white text-xs">
                    {myDrafts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {myDrafts.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-2"
                  data-ocid="intern.drafts.empty_state"
                >
                  No drafts waiting
                </p>
              ) : (
                <div className="space-y-2">
                  {myDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="bg-card border border-amber-200 rounded-lg px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-foreground truncate">
                          {d.patientName}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-300 text-amber-700 shrink-0"
                        >
                          Draft
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.diagnosis}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.createdAt
                          ? new Date(d.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending tasks */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-rose-600" />
                <h2 className="font-semibold text-foreground text-sm">
                  Pending Tasks Today
                </h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {patientsNeedingHistory.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-2"
                  data-ocid="intern.tasks.empty_state"
                >
                  All notes complete for today ✓
                </p>
              ) : (
                <div className="space-y-2">
                  {patientsNeedingHistory.slice(0, 5).map((p) => (
                    <button
                      key={String(p.id)}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      className="w-full flex items-center gap-2 text-left bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-100 transition-colors"
                      data-ocid={`intern.task_item.${String(p.id)}`}
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <p className="text-sm font-medium text-foreground flex-1 truncate">
                        {p.fullName}
                      </p>
                      <span className="text-xs text-rose-600 shrink-0">
                        Add note →
                      </span>
                    </button>
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
