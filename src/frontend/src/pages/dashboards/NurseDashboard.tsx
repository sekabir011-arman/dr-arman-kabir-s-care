import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Clock,
  Droplets,
  Moon,
  Sun,
  Sunset,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import type { Patient } from "../../types";

interface LocalPatient extends Patient {
  bedNumber?: string;
  ward?: string;
  isAdmitted?: boolean;
  weight?: number;
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

function getCurrentShift(): {
  label: string;
  color: string;
  icon: React.ElementType;
} {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14)
    return {
      label: "Morning Shift",
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Sun,
    };
  if (hour >= 14 && hour < 22)
    return {
      label: "Evening Shift",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: Sunset,
    };
  return {
    label: "Night Shift",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Moon,
  };
}

interface MedDueEntry {
  patientId: string;
  patientName: string;
  drugName: string;
  scheduledTime: string;
  status: "given" | "not_given" | "delayed" | "pending";
}

function getMedsDue(patients: LocalPatient[]): MedDueEntry[] {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const results: MedDueEntry[] = [];

  const patientMap: Record<string, string> = {};
  for (const p of patients) {
    patientMap[String(p.id)] = p.fullName;
  }

  try {
    const reminders = JSON.parse(
      localStorage.getItem("medicare_drug_reminders") || "[]",
    ) as Array<{
      patientId: string;
      drugName: string;
      times: string[];
      enabled: boolean;
    }>;
    for (const r of reminders) {
      if (!r.enabled || !patientMap[r.patientId]) continue;
      for (const t of r.times) {
        const [hh, mm] = t.split(":").map(Number);
        const tMin = hh * 60 + mm;
        if (Math.abs(tMin - nowMin) > 120) continue; // ±2hr window

        const records: Array<{ scheduledTime?: string; status?: string }> =
          (() => {
            try {
              return JSON.parse(
                localStorage.getItem(
                  `medAdminRecord_${r.patientId}_${today}`,
                ) || "[]",
              );
            } catch {
              return [];
            }
          })();
        const rec = records.find((x) => x.scheduledTime === t);
        results.push({
          patientId: r.patientId,
          patientName: patientMap[r.patientId] || r.patientId,
          drugName: r.drugName,
          scheduledTime: t,
          status: rec
            ? (rec.status as "given" | "not_given" | "delayed")
            : "pending",
        });
      }
    }
  } catch {}
  return results.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

function getPatientsWithoutVitalsToday(
  patients: LocalPatient[],
): LocalPatient[] {
  const today = new Date().toISOString().split("T")[0];
  return patients.filter((p) => {
    try {
      const vitals = JSON.parse(
        localStorage.getItem(`vitals_${String(p.id)}`) || "[]",
      ) as Array<{ date: string; createdAt?: string }>;
      return !vitals.some((v) =>
        (v.date || v.createdAt || "").startsWith(today),
      );
    } catch {
      return true;
    }
  });
}

function getIOSummary(patients: LocalPatient[]) {
  const today = new Date().toISOString().split("T")[0];
  return patients
    .map((p) => {
      let totalIn = 0;
      let totalOut = 0;
      let uoAlert = false;
      try {
        const io = JSON.parse(
          localStorage.getItem(`intakeOutput_${String(p.id)}_${today}`) || "{}",
        ) as {
          intake?: { oral?: number; iv?: number; ng?: number };
          output?: {
            urine?: number;
            drain?: number;
            ttube?: number;
            vomitus?: number;
          };
        };
        totalIn =
          (io.intake?.oral || 0) + (io.intake?.iv || 0) + (io.intake?.ng || 0);
        totalOut =
          (io.output?.urine || 0) +
          (io.output?.drain || 0) +
          (io.output?.ttube || 0) +
          (io.output?.vomitus || 0);
        // UO alert if urine < 0.5ml/kg/hr for 24h
        const urinePerKgHr = p.weight
          ? (io.output?.urine || 0) / (p.weight * 24)
          : 0;
        uoAlert = p.weight ? urinePerKgHr < 0.5 : false;
      } catch {}
      return { patient: p, totalIn, totalOut, uoAlert };
    })
    .filter((e) => e.totalIn > 0 || e.totalOut > 0 || e.uoAlert);
}

export default function NurseDashboard() {
  const { currentDoctor } = useEmailAuth();
  const navigate = useNavigate();
  const shift = getCurrentShift();
  const ShiftIcon = shift.icon;

  const admittedPatients = useMemo(loadAdmittedPatients, []);
  const medsDue = useMemo(
    () => getMedsDue(admittedPatients),
    [admittedPatients],
  );
  const vitalsNeeded = useMemo(
    () => getPatientsWithoutVitalsToday(admittedPatients),
    [admittedPatients],
  );
  const ioSummary = useMemo(
    () => getIOSummary(admittedPatients),
    [admittedPatients],
  );
  const [handoverText, setHandoverText] = useState(() => {
    try {
      return (
        localStorage.getItem(
          `handover_${new Date().toISOString().split("T")[0]}_${currentDoctor?.email}`,
        ) || ""
      );
    } catch {
      return "";
    }
  });
  const [handoverSubmitted, setHandoverSubmitted] = useState(() => {
    try {
      return (
        localStorage.getItem(
          `handover_submitted_${new Date().toISOString().split("T")[0]}_${currentDoctor?.email}`,
        ) === "true"
      );
    } catch {
      return false;
    }
  });

  const statusColors: Record<string, string> = {
    given: "bg-emerald-100 text-emerald-700 border-emerald-200",
    not_given: "bg-red-100 text-red-700 border-red-200",
    delayed: "bg-amber-100 text-amber-700 border-amber-200",
    pending: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="nurse.dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {currentDoctor?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Nurse Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`text-xs px-3 py-1.5 flex items-center gap-1.5 border ${shift.color}`}
          >
            <ShiftIcon className="w-3.5 h-3.5" />
            {shift.label}
          </Badge>
          <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-xs px-3 py-1">
            Nurse
          </Badge>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {admittedPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {medsDue.filter((m) => m.status === "pending").length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Meds Due</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {vitalsNeeded.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vitals Pending
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Medications Due */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-foreground text-sm">
                Medications Due Now
              </h2>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {medsDue.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="nurse.meds.empty_state"
              >
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm">No medications due in this window</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medsDue.map((m, i) => (
                  <div
                    key={`${m.patientId}-${m.drugName}-${i}`}
                    className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5"
                    data-ocid={`nurse.med_row.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {m.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.drugName}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {m.scheduledTime}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 capitalize border ${statusColors[m.status]}`}
                    >
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Vitals Pending */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-foreground text-sm">
                  Vitals Not Recorded Today
                </h2>
                {vitalsNeeded.length > 0 && (
                  <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200 text-xs">
                    {vitalsNeeded.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {vitalsNeeded.length === 0 ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 py-2"
                  data-ocid="nurse.vitals.empty_state"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm">All vitals recorded today</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {vitalsNeeded.slice(0, 5).map((p) => (
                    <button
                      key={String(p.id)}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors text-left"
                      data-ocid={`nurse.vitals_pending.${String(p.id)}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <p className="text-sm font-medium text-foreground flex-1 truncate">
                        {p.fullName}
                      </p>
                      <span className="text-xs text-amber-700 shrink-0">
                        Bed {p.bedNumber || "—"}
                      </span>
                    </button>
                  ))}
                  {vitalsNeeded.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs gap-1"
                      onClick={() => navigate({ to: "/Patients" })}
                    >
                      +{vitalsNeeded.length - 5} more{" "}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* I/O Summary */}
          {ioSummary.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-teal-600" />
                  <h2 className="font-semibold text-foreground text-sm">
                    Intake–Output Summary
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {ioSummary.map(({ patient: p, totalIn, totalOut, uoAlert }) => (
                  <div
                    key={String(p.id)}
                    className={`rounded-lg px-3 py-2 flex items-center gap-3 ${uoAlert ? "bg-red-50 border border-red-200" : "bg-muted/30 border border-border"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In: {totalIn}ml · Out: {totalOut}ml
                      </p>
                    </div>
                    {uoAlert && (
                      <Badge className="bg-red-600 text-white text-[10px] shrink-0">
                        Low UO ⚠
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Shift Handover */}
      <Card className="border-indigo-200">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-foreground text-sm">
              {shift.label} Handover
            </h2>
            {handoverSubmitted && (
              <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                Submitted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          {handoverSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
              Handover submitted. The next nurse can add their notes below.
            </div>
          ) : null}
          <textarea
            rows={4}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Document patient status, critical issues, pending tasks, medications administered, I/O summary..."
            value={handoverText}
            onChange={(e) => {
              setHandoverText(e.target.value);
              try {
                localStorage.setItem(
                  `handover_${new Date().toISOString().split("T")[0]}_${currentDoctor?.email}`,
                  e.target.value,
                );
              } catch {}
            }}
            disabled={handoverSubmitted}
            data-ocid="nurse.handover.textarea"
          />
          {!handoverSubmitted && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              onClick={() => {
                if (!handoverText.trim()) {
                  toast.error(
                    "Please write the handover notes before submitting",
                  );
                  return;
                }
                try {
                  localStorage.setItem(
                    `handover_submitted_${new Date().toISOString().split("T")[0]}_${currentDoctor?.email}`,
                    "true",
                  );
                } catch {}
                setHandoverSubmitted(true);
                toast.success("Handover submitted successfully");
              }}
              data-ocid="nurse.handover.submit_button"
            >
              Submit Handover
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
