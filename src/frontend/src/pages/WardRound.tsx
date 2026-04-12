// Ward Round Mode — full-screen swipe interface for admitted patients
// Supports offline: all writes go to localStorage immediately, queued for sync

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Principal } from "@icp-sdk/core/principal";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  PillIcon,
  TestTube,
  ThumbsDown,
  ThumbsUp,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  getDoctorEmail,
  loadFromAllDoctorKeys,
  loadFromStorage,
  saveToStorage,
  storageKey,
  useCreateClinicalNote,
  useCreateObservation,
  useCreateOrder,
  useGetAlertsByPatient,
  useGetClinicalNotesByPatient,
} from "../hooks/useQueries";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  type VitalAlertResult,
  checkVitalAlerts,
} from "../lib/clinicalIntelligence";
import type { ClinicalAlert, Patient, StaffRole } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAge(dob?: bigint): number | null {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - Number(dob / 1_000_000n)) / (365.25 * 24 * 3600 * 1000),
  );
}

function daysSince(ts?: bigint | string): number {
  if (!ts) return 0;
  const ms =
    typeof ts === "bigint"
      ? Number(ts / 1_000_000n)
      : new Date(ts as string).getTime();
  return Math.floor((Date.now() - ms) / (1000 * 3600 * 24));
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({
  values,
  color = "#0d9488",
}: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 80;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      className="overflow-visible"
      role="img"
      aria-label="Vital trend sparkline"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Vital Entry Form ──────────────────────────────────────────────────────────

interface VitalEntryFormProps {
  patientId: bigint;
  onSaved: () => void;
  onCancel: () => void;
}

function VitalEntryForm({ patientId, onSaved, onCancel }: VitalEntryFormProps) {
  const { currentDoctor } = useEmailAuth();
  const createObs = useCreateObservation();
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [rr, setRr] = useState("");
  const [weight, setWeight] = useState("");
  const bpRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    bpRef.current?.focus();
  }, []);

  const handleSave = async () => {
    const now = BigInt(Date.now()) * 1_000_000n;
    const base = {
      patientId,
      observationType: "Vital" as const,
      observationDate: now,
      recordedBy: { toString: () => "local" } as unknown as Principal,
      recordedByName: currentDoctor?.name ?? "Unknown",
      recordedByRole: (currentDoctor?.role ?? "doctor") as StaffRole,
    };
    const entries = [
      { code: "BP", value: bp, unit: "mmHg" },
      { code: "Pulse", value: pulse, unit: "beats/min" },
      { code: "Temperature", value: temp, unit: "°C" },
      { code: "SpO2", value: spo2, unit: "%" },
      { code: "RR", value: rr, unit: "breaths/min" },
      { code: "Weight", value: weight, unit: "kg" },
    ].filter((e) => e.value.trim());

    for (const e of entries) {
      await createObs.mutateAsync({
        ...base,
        code: e.code,
        value: e.value,
        unit: e.unit,
        numericValue: Number.parseFloat(e.value) || undefined,
      });
    }
    toast.success("Vitals saved");
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "BP (mmHg)",
            val: bp,
            set: setBp,
            ref: bpRef,
            placeholder: "120/80",
          },
          {
            label: "Pulse (beats/min)",
            val: pulse,
            set: setPulse,
            ref: null,
            placeholder: "72",
          },
          {
            label: "Temp (°C)",
            val: temp,
            set: setTemp,
            ref: null,
            placeholder: "37.0",
          },
          {
            label: "SpO₂ (%)",
            val: spo2,
            set: setSpo2,
            ref: null,
            placeholder: "98",
          },
          {
            label: "RR (breaths/min)",
            val: rr,
            set: setRr,
            ref: null,
            placeholder: "16",
          },
          {
            label: "Weight (kg)",
            val: weight,
            set: setWeight,
            ref: null,
            placeholder: "65",
          },
        ].map(({ label, val, set, ref, placeholder }) => (
          <div key={label} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              ref={ref as React.RefObject<HTMLInputElement>}
              inputMode="decimal"
              placeholder={placeholder}
              value={val}
              onChange={(e) => set(e.target.value)}
              className="h-9 text-sm font-mono"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={createObs.isPending}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
          data-ocid="ward_round.save_vitals.button"
        >
          {createObs.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Save Vitals
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-3">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Add Drug Quick Form ───────────────────────────────────────────────────────

interface AddDrugFormProps {
  patientId: bigint;
  onSaved: () => void;
  onCancel: () => void;
}

function AddDrugForm({ patientId, onSaved, onCancel }: AddDrugFormProps) {
  const { currentDoctor } = useEmailAuth();
  const createOrder = useCreateOrder();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    await createOrder.mutateAsync({
      patientId,
      orderType: "Medication",
      code: "DRUG",
      description: `${name.trim()} ${dose.trim()}`.trim(),
      orderedAt: BigInt(Date.now()) * 1_000_000n,
      orderedBy: { toString: () => "local" } as unknown as Principal,
      orderedByName: currentDoctor?.name ?? "Unknown",
      orderedByRole: (currentDoctor?.role ?? "doctor") as StaffRole,
    });
    toast.success(`${name} added to orders`);
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Drug Name</Label>
        <Input
          autoFocus
          placeholder="e.g. Tab. Amoxicillin 500mg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Dose / Instructions</Label>
        <Input
          placeholder="e.g. 1+0+1 — 5 days"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={createOrder.isPending || !name.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          data-ocid="ward_round.add_drug.button"
        >
          Add Drug
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-3">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Order Test Form ───────────────────────────────────────────────────────────

interface OrderTestFormProps {
  patientId: bigint;
  onSaved: () => void;
  onCancel: () => void;
}

function OrderTestForm({ patientId, onSaved, onCancel }: OrderTestFormProps) {
  const { currentDoctor } = useEmailAuth();
  const createOrder = useCreateOrder();
  const COMMON = [
    "CBC",
    "Blood Glucose (RBS)",
    "Serum Creatinine",
    "Chest X-Ray",
    "ECG",
    "Urine R/E",
    "Blood Culture",
    "LFT",
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const toggle = (t: string) =>
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const handleSave = async () => {
    const list = [
      ...selected,
      ...(custom.trim() ? custom.split(",").map((s) => s.trim()) : []),
    ];
    for (const test of list) {
      await createOrder.mutateAsync({
        patientId,
        orderType: "Investigation",
        code: "LAB",
        description: test,
        orderedAt: BigInt(Date.now()) * 1_000_000n,
        orderedBy: { toString: () => "local" } as unknown as Principal,
        orderedByName: currentDoctor?.name ?? "Unknown",
        orderedByRole: (currentDoctor?.role ?? "doctor") as StaffRole,
      });
    }
    toast.success(`${list.length} test(s) ordered`);
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {COMMON.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(t)
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-card border-border text-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <Input
        placeholder="Other tests (comma separated)"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={
            createOrder.isPending || (selected.length === 0 && !custom.trim())
          }
          className="flex-1 bg-purple-600 hover:bg-purple-700"
          data-ocid="ward_round.order_test.button"
        >
          Order Tests
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-3">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Patient Card (Ward Round) ─────────────────────────────────────────────────

interface PatientCardProps {
  patient: Patient;
  alerts: ClinicalAlert[];
  vitalAlerts: VitalAlertResult[];
  vitals: {
    bp?: string;
    spo2?: string;
    temp?: string;
    pulse?: string;
    bpHistory?: number[];
    spo2History?: number[];
  };
  onAction: (
    action: "vitals" | "drug" | "test" | "stable" | "deteriorating",
  ) => void;
  onRoundComplete: () => void;
  permissions: ReturnType<typeof useRolePermissions>;
}

function PatientCard({
  patient,
  alerts,
  vitalAlerts,
  vitals,
  onAction,
  onRoundComplete,
  permissions,
}: PatientCardProps) {
  const age = getAge(patient.dateOfBirth);
  const admitted = daysSince(patient.admissionDate ?? patient.createdAt);
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "Critical" && !a.isAcknowledged,
  );
  const hasCritical =
    criticalAlerts.length > 0 ||
    vitalAlerts.some((a) => a.severity === "critical");

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full"
      data-ocid="ward_round.patient_card"
    >
      {/* Left — Patient Info */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-lg text-foreground leading-tight">
              {patient.fullName}
            </h2>
            {patient.nameBn && (
              <p className="text-sm text-muted-foreground">{patient.nameBn}</p>
            )}
          </div>
          {hasCritical && (
            <Badge className="bg-red-100 text-red-700 border-0 text-xs animate-pulse">
              🚨 Critical
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">Age / Gender</p>
            <p className="font-semibold">
              {age !== null ? `${age} yrs` : "—"} / {patient.gender}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">Bed / Ward</p>
            <p className="font-semibold">
              {patient.bedNumber || "—"} / {patient.department || "General"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">Admitted</p>
            <p className="font-semibold">
              {admitted > 0 ? `${admitted} days ago` : "Today"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">Reg No</p>
            <p className="font-semibold font-mono text-xs">
              {patient.registerNumber || "—"}
            </p>
          </div>
        </div>

        {/* Active problems */}
        {patient.chronicConditions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              Active Problems
            </p>
            <div className="flex flex-wrap gap-1">
              {patient.chronicConditions.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {patient.allergies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 font-medium">
              Allergy: {patient.allergies.slice(0, 2).join(", ")}
            </span>
          </div>
        )}

        {/* Alert badges */}
        {vitalAlerts.length > 0 && (
          <div className="space-y-1">
            {vitalAlerts.slice(0, 2).map((a) => (
              <div
                key={a.field}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  a.severity === "critical"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {a.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center — Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {permissions.canEnterVitals && (
            <button
              type="button"
              onClick={() => onAction("vitals")}
              className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-teal-50 border-2 border-teal-200 hover:bg-teal-100 text-teal-700 transition-colors font-medium text-sm"
              data-ocid="ward_round.vitals.button"
            >
              <Activity className="w-6 h-6" />📝 Vitals
            </button>
          )}
          {permissions.canCreateOrder && (
            <button
              type="button"
              onClick={() => onAction("drug")}
              className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 transition-colors font-medium text-sm"
              data-ocid="ward_round.add_drug.button"
            >
              <PillIcon className="w-6 h-6" />💊 Add Drug
            </button>
          )}
          {permissions.canCreateOrder && (
            <button
              type="button"
              onClick={() => onAction("test")}
              className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 text-purple-700 transition-colors font-medium text-sm"
              data-ocid="ward_round.order_test.button"
            >
              <TestTube className="w-6 h-6" />🧪 Order Test
            </button>
          )}
          {permissions.canFinalizeClinicalNote && (
            <button
              type="button"
              onClick={() => onAction("stable")}
              className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-green-50 border-2 border-green-200 hover:bg-green-100 text-green-700 transition-colors font-medium text-sm"
              data-ocid="ward_round.mark_stable.button"
            >
              <ThumbsUp className="w-6 h-6" />✅ Stable
            </button>
          )}
          {permissions.canFinalizeClinicalNote && (
            <button
              type="button"
              onClick={() => onAction("deteriorating")}
              className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-red-50 border-2 border-red-200 hover:bg-red-100 text-red-700 transition-colors font-medium text-sm"
              data-ocid="ward_round.mark_deteriorating.button"
            >
              <ThumbsDown className="w-6 h-6" />
              ⚠️ Deteriorating
            </button>
          )}
        </div>
        <Button
          onClick={onRoundComplete}
          className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
          data-ocid="ward_round.complete.button"
        >
          <CheckCircle2 className="w-4 h-4" />✓ Round Complete
        </Button>
      </div>

      {/* Right — Mini Vitals Trend */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Last 24h Vitals
        </h3>
        <div className="space-y-3">
          {/* BP sparkline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                BP (mmHg)
              </span>
              <span
                className={`text-xs font-bold ${vitalAlerts.find((a) => a.field === "BP") ? "text-red-600" : "text-teal-600"}`}
              >
                {vitals.bp || "—"}
              </span>
            </div>
            {vitals.bpHistory && vitals.bpHistory.length > 1 ? (
              <MiniSparkline values={vitals.bpHistory} color="#0d9488" />
            ) : (
              <div className="h-7 bg-muted/30 rounded text-xs text-muted-foreground flex items-center justify-center">
                No trend data
              </div>
            )}
          </div>
          {/* SpO2 sparkline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                SpO₂ (%)
              </span>
              <span
                className={`text-xs font-bold ${vitalAlerts.find((a) => a.field === "SpO2") ? "text-red-600" : "text-blue-600"}`}
              >
                {vitals.spo2 || "—"}
              </span>
            </div>
            {vitals.spo2History && vitals.spo2History.length > 1 ? (
              <MiniSparkline values={vitals.spo2History} color="#2563eb" />
            ) : (
              <div className="h-7 bg-muted/30 rounded text-xs text-muted-foreground flex items-center justify-center">
                No trend data
              </div>
            )}
          </div>
          {/* Temp */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-foreground">
              Temp (°C)
            </span>
            <span
              className={`text-sm font-bold ${vitals.temp && Number.parseFloat(vitals.temp) > 38.5 ? "text-red-600" : "text-foreground"}`}
            >
              {vitals.temp || "—"}
            </span>
          </div>
          {/* Pulse */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-foreground">
              Pulse (beats/min)
            </span>
            <span
              className={`text-sm font-bold ${vitalAlerts.find((a) => a.field === "Pulse") ? "text-amber-600" : "text-foreground"}`}
            >
              {vitals.pulse || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Ward Round Page ──────────────────────────────────────────────────────

type SortOrder = "bed" | "priority";
type ActiveAction = "vitals" | "drug" | "test" | null;

export default function WardRound() {
  const { currentDoctor } = useEmailAuth();
  const permissions = useRolePermissions();
  const isOnline = useOnlineStatus();
  const createNote = useCreateClinicalNote();

  const [sortOrder, setSortOrder] = useState<SortOrder>("bed");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [roundedPatientIds, setRoundedPatientIds] = useState<Set<string>>(
    new Set(),
  );

  // Load admitted patients
  const allPatients = useMemo(() => {
    const email = getDoctorEmail();
    const primary = loadFromStorage<Patient>(`patients_${email}`);
    const all =
      primary.length > 0 ? primary : loadFromAllDoctorKeys<Patient>("patients");
    return all.filter(
      (p) =>
        p.isAdmitted === true ||
        p.patientType === "admitted" ||
        p.patientType === "indoor",
    );
  }, []);

  const sortedPatients = useMemo(() => {
    if (sortOrder === "bed") {
      return [...allPatients].sort((a, b) =>
        (a.bedNumber ?? "").localeCompare(b.bedNumber ?? ""),
      );
    }
    // Priority: patients with alerts first
    return [...allPatients].sort((a, b) => {
      const aHasAlert = a.chronicConditions.length > 0 ? 1 : 0;
      const bHasAlert = b.chronicConditions.length > 0 ? 1 : 0;
      return bHasAlert - aHasAlert;
    });
  }, [allPatients, sortOrder]);

  const currentPatient = sortedPatients[currentIndex] ?? null;

  // Load latest vitals for current patient
  const currentVitals = useMemo(() => {
    if (!currentPatient) return {};
    const email = getDoctorEmail();
    // Scan for the latest visit form data for this patient
    const bpHistory: number[] = [];
    const spo2History: number[] = [];
    let bp = "";
    let spo2 = "";
    let temp = "";
    let pulse = "";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("visit_form_data_") && key.endsWith(`_${email}`)) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (
            parsed.patientId !== undefined &&
            String(parsed.patientId) !== String(currentPatient.id)
          )
            continue;
          const vs = parsed.vitalSigns as Record<string, string> | undefined;
          if (vs) {
            if (vs.bloodPressure) {
              const sys = Number.parseInt(vs.bloodPressure.split("/")[0]);
              if (!Number.isNaN(sys)) bpHistory.push(sys);
              bp = vs.bloodPressure;
            }
            if (vs.oxygenSaturation) {
              const v = Number.parseFloat(vs.oxygenSaturation);
              if (!Number.isNaN(v)) spo2History.push(v);
              spo2 = vs.oxygenSaturation;
            }
            if (vs.temperature) temp = vs.temperature;
            if (vs.pulse) pulse = vs.pulse;
          }
        } catch {}
      }
    }
    return { bp, spo2, temp, pulse, bpHistory, spo2History };
  }, [currentPatient]);

  const vitalAlerts = useMemo(
    () =>
      checkVitalAlerts({
        bloodPressure: currentVitals.bp,
        pulse: currentVitals.pulse,
        oxygenSaturation: currentVitals.spo2,
        temperature: currentVitals.temp,
      }),
    [currentVitals],
  );

  // Alerts from store (for current patient)
  const { data: storedAlerts = [] } = useGetAlertsByPatient(
    currentPatient?.id ?? null,
  );

  const navigate = (dir: -1 | 1) => {
    setCurrentIndex((prev) =>
      Math.max(0, Math.min(sortedPatients.length - 1, prev + dir)),
    );
    setActiveAction(null);
  };

  const handleMarkStable = useCallback(async () => {
    if (!currentPatient) return;
    await createNote.mutateAsync({
      patientId: currentPatient.id,
      noteType: "SOAP",
      noteSubtype: "WardRound",
      authorId: { toString: () => "local" } as unknown as Principal,
      authorName: currentDoctor?.name ?? "Unknown",
      authorRole: (currentDoctor?.role ?? "doctor") as StaffRole,
      content: JSON.stringify({
        subjective: "Patient comfortable. No acute complaints.",
        objective: "Vitals within acceptable range.",
        assessment: "Stable. No acute deterioration.",
        plan: "Continue current management.",
      }),
      isDraft: false,
      createdAt: BigInt(Date.now()) * 1_000_000n,
    });
    toast.success("Marked as stable");
    setActiveAction(null);
  }, [currentPatient, currentDoctor, createNote]);

  const handleMarkDeteriorating = useCallback(async () => {
    if (!currentPatient) return;
    await createNote.mutateAsync({
      patientId: currentPatient.id,
      noteType: "SOAP",
      noteSubtype: "WardRound-Urgent",
      authorId: { toString: () => "local" } as unknown as Principal,
      authorName: currentDoctor?.name ?? "Unknown",
      authorRole: (currentDoctor?.role ?? "doctor") as StaffRole,
      content: JSON.stringify({
        subjective: "Patient appears to be deteriorating.",
        objective: "Vitals require review.",
        assessment: "⚠️ DETERIORATING — urgent review required.",
        plan: "Escalate to senior doctor. Review vitals stat.",
      }),
      isDraft: false,
      createdAt: BigInt(Date.now()) * 1_000_000n,
    });
    toast.error("⚠️ Patient marked as deteriorating — alert logged");
    setActiveAction(null);
  }, [currentPatient, currentDoctor, createNote]);

  const handleRoundComplete = useCallback(async () => {
    if (!currentPatient) return;
    await createNote.mutateAsync({
      patientId: currentPatient.id,
      noteType: "SOAP",
      noteSubtype: "WardRound-Complete",
      authorId: { toString: () => "local" } as unknown as Principal,
      authorName: currentDoctor?.name ?? "Unknown",
      authorRole: (currentDoctor?.role ?? "doctor") as StaffRole,
      content: JSON.stringify({
        assessment: "Ward round completed for this patient.",
        plan: "Continue as per current treatment plan.",
        timestamp: new Date().toISOString(),
      }),
      isDraft: false,
      createdAt: BigInt(Date.now()) * 1_000_000n,
    });
    setRoundedPatientIds(
      (prev) => new Set([...prev, String(currentPatient.id)]),
    );
    toast.success("Round complete for this patient");
    // Auto-advance to next patient
    if (currentIndex < sortedPatients.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setActiveAction(null);
    }
  }, [
    currentPatient,
    currentDoctor,
    createNote,
    currentIndex,
    sortedPatients.length,
  ]);

  const handleAction = useCallback(
    async (action: "vitals" | "drug" | "test" | "stable" | "deteriorating") => {
      if (action === "stable") {
        await handleMarkStable();
      } else if (action === "deteriorating") {
        await handleMarkDeteriorating();
      } else {
        setActiveAction(action);
      }
    },
    [handleMarkStable, handleMarkDeteriorating],
  );

  // ── Empty State ───────────────────────────────────────────────────────────────
  if (sortedPatients.length === 0) {
    return (
      <div
        className="max-w-2xl mx-auto p-6 mt-12 text-center"
        data-ocid="ward_round.empty_state"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <BedDouble className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          No Admitted Patients
        </h2>
        <p className="text-muted-foreground text-sm">
          Ward Round Mode shows only admitted patients. Mark patients as
          admitted in their profile to see them here.
        </p>
      </div>
    );
  }

  const doneSoFar = roundedPatientIds.size;
  const isRounded = currentPatient
    ? roundedPatientIds.has(String(currentPatient.id))
    : false;

  return (
    <div
      className="flex flex-col h-[calc(100vh-64px)] bg-background"
      data-ocid="ward_round.page"
    >
      {/* Header Bar */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Patient counter */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BedDouble className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-tight">
              {currentPatient?.fullName ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Bed {currentPatient?.bedNumber ?? "—"} · Patient{" "}
              {currentIndex + 1} of {sortedPatients.length}
            </p>
          </div>
          {isRounded && (
            <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" /> Done
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Offline indicator */}
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
            data-ocid="ward_round.sync_status"
          >
            {isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {isOnline ? "Online" : "Offline"}
          </div>

          {/* Sort toggle */}
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === "bed" ? "priority" : "bed"))
            }
            className="text-xs bg-muted/60 hover:bg-muted text-foreground px-2.5 py-1 rounded-full border border-border transition-colors"
            data-ocid="ward_round.sort_toggle"
          >
            {sortOrder === "bed" ? "📋 By Bed" : "🔴 By Priority"}
          </button>

          {/* Navigation arrows */}
          <Button
            variant="outline"
            size="icon"
            disabled={currentIndex === 0}
            onClick={() => navigate(-1)}
            className="h-8 w-8"
            data-ocid="ward_round.prev.button"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentIndex === sortedPatients.length - 1}
            onClick={() => navigate(1)}
            className="h-8 w-8"
            data-ocid="ward_round.next.button"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* End round */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={() =>
              toast.success(
                `Ward round complete. ${doneSoFar}/${sortedPatients.length} patients reviewed.`,
              )
            }
            data-ocid="ward_round.end_round.button"
          >
            <X className="w-3.5 h-3.5" />
            End Round
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-4 py-2 bg-card/80 border-b border-border flex-shrink-0 overflow-x-auto">
        {sortedPatients.map((p, i) => (
          <button
            key={p.id.toString()}
            type="button"
            onClick={() => {
              setCurrentIndex(i);
              setActiveAction(null);
            }}
            className={`h-2 flex-1 min-w-4 rounded-full transition-colors ${
              roundedPatientIds.has(String(p.id))
                ? "bg-green-500"
                : i === currentIndex
                  ? "bg-primary"
                  : "bg-muted"
            }`}
            title={p.fullName}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap self-center">
          {doneSoFar}/{sortedPatients.length} reviewed
        </span>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentPatient && (
          <PatientCard
            patient={currentPatient}
            alerts={storedAlerts}
            vitalAlerts={vitalAlerts}
            vitals={currentVitals}
            onAction={handleAction}
            onRoundComplete={handleRoundComplete}
            permissions={permissions}
          />
        )}

        {/* Inline action panels */}
        {activeAction && currentPatient && (
          <div className="bg-card border border-border rounded-xl p-4 max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">
                {activeAction === "vitals"
                  ? "📝 Record Vitals"
                  : activeAction === "drug"
                    ? "💊 Add Drug"
                    : "🧪 Order Test"}
              </h3>
            </div>
            {activeAction === "vitals" && (
              <VitalEntryForm
                patientId={currentPatient.id}
                onSaved={() => setActiveAction(null)}
                onCancel={() => setActiveAction(null)}
              />
            )}
            {activeAction === "drug" && (
              <AddDrugForm
                patientId={currentPatient.id}
                onSaved={() => setActiveAction(null)}
                onCancel={() => setActiveAction(null)}
              />
            )}
            {activeAction === "test" && (
              <OrderTestForm
                patientId={currentPatient.id}
                onSaved={() => setActiveAction(null)}
                onCancel={() => setActiveAction(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom nav arrows for mobile */}
      <div className="md:hidden flex border-t border-border bg-card px-4 py-3 gap-3 flex-shrink-0">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          disabled={currentIndex === 0}
          onClick={() => navigate(-1)}
          data-ocid="ward_round.mobile_prev.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>
        <div className="flex items-center gap-1 px-3 text-sm font-medium text-muted-foreground">
          {currentIndex + 1}/{sortedPatients.length}
        </div>
        <Button
          className="flex-1 gap-2 bg-primary"
          disabled={currentIndex === sortedPatients.length - 1}
          onClick={() => navigate(1)}
          data-ocid="ward_round.mobile_next.button"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
