/**
 * DailyProgressNote — Daily SOAP-based clinical note for admitted/follow-up patients.
 * Includes:
 *   - Active Complaints Tab (with auto-carry, trend, quick chips)
 *   - Active Diagnosis Tab (multi-class: Primary/Secondary/Comorbidity)
 *   - Subjective Section (CC + ROS with 5 systems)
 *   - Objective Section (Vitals display, IOChart, DrainMonitor, Investigations)
 *   - Assessment Section (auto-generated, editable)
 *   - Plan Section (drugs, investigations, procedures → save as Prescription)
 *   - All Findings Tab (auto-summary)
 *   - Quick Templates
 *   - Auto Carry Forward with banner
 *   - Alert System (U/O, fever, drain spike)
 *
 * Only visible for admitted patients to clinical roles.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  BookTemplate,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit2,
  FlaskConical,
  Layers,
  ListChecks,
  MessageCircle,
  Pill,
  Plus,
  RefreshCw,
  Stethoscope,
  Thermometer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRolePermissions } from "../hooks/useRolePermissions";
import type { Prescription, Visit, VitalSigns } from "../types";
import type { StaffRole } from "../types";
import { STAFF_ROLE_LABELS } from "../types";
import DrainMonitor from "./DrainMonitor";
import IOChart from "./IOChart";

// ── Types ─────────────────────────────────────────────────────────────────────
type TrendIndicator = "↑ improving" | "↓ worsening" | "= same";
type DiagnosisClass = "Primary" | "Secondary" | "Comorbidity";
type AssessmentStatus = "Improving" | "Stable" | "Worsening";

interface ActiveComplaint {
  id: string;
  text: string;
  trend: TrendIndicator;
  resolved: boolean;
}

interface ActiveDiagnosis {
  id: string;
  name: string;
  classification: DiagnosisClass;
  status: "active" | "resolved";
}

interface ROSSystem {
  name: string;
  symptoms: Array<{ key: string; label: string; value: "yes" | "no" | "" }>;
  notes: string;
}

interface InvestigationEntry {
  id: string;
  date: string;
  type: string;
  name: string;
  interpretation: string;
  fileName?: string;
}

interface PlanItem {
  id: string;
  category: "drug" | "investigation" | "procedure";
  description: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  form?: string;
}

interface DailyNoteData {
  date: string;
  // Complaints
  activeComplaints: ActiveComplaint[];
  // Diagnoses
  activeDiagnoses: ActiveDiagnosis[];
  // Subjective
  chiefComplaintsToday: string;
  rosData: ROSSystem[];
  // Objective
  objectiveNotes: string;
  todayInvestigations: InvestigationEntry[];
  // Assessment
  assessment: string;
  assessmentStatus: AssessmentStatus;
  // Plan
  planItems: PlanItem[];
  // Carry-forward dismissed
  carryForwardDismissed: boolean;
}

const ROS_SYSTEMS_TEMPLATE: ROSSystem[] = [
  {
    name: "CVS",
    symptoms: [
      { key: "chestPain", label: "Chest Pain", value: "" },
      { key: "palpitations", label: "Palpitations", value: "" },
      { key: "legSwelling", label: "Leg Swelling", value: "" },
    ],
    notes: "",
  },
  {
    name: "Respiratory",
    symptoms: [
      { key: "cough", label: "Cough", value: "" },
      { key: "sob", label: "SOB", value: "" },
      { key: "wheeze", label: "Wheeze", value: "" },
    ],
    notes: "",
  },
  {
    name: "GI",
    symptoms: [
      { key: "nausea", label: "Nausea", value: "" },
      { key: "vomiting", label: "Vomiting", value: "" },
      { key: "diarrhea", label: "Diarrhea", value: "" },
      { key: "constipation", label: "Constipation", value: "" },
      { key: "abdoPain", label: "Abdominal Pain", value: "" },
    ],
    notes: "",
  },
  {
    name: "CNS",
    symptoms: [
      { key: "headache", label: "Headache", value: "" },
      { key: "dizziness", label: "Dizziness", value: "" },
      { key: "weakness", label: "Weakness", value: "" },
      { key: "seizure", label: "Seizure", value: "" },
    ],
    notes: "",
  },
  {
    name: "GU",
    symptoms: [
      { key: "dysuria", label: "Dysuria", value: "" },
      { key: "hematuria", label: "Hematuria", value: "" },
      { key: "reducedUO", label: "Reduced Urine Output", value: "" },
    ],
    notes: "",
  },
];

const QUICK_COMPLAINT_CHIPS = [
  "Fever",
  "Pain",
  "Vomiting",
  "Cough",
  "SOB",
  "Dizziness",
  "Nausea",
  "Headache",
  "Weakness",
  "Constipation",
  "Diarrhea",
];

const INVESTIGATION_TYPES = [
  "CBC",
  "Electrolytes",
  "Renal Function",
  "Liver Function",
  "Blood Sugar",
  "Lipid Profile",
  "Imaging",
  "Blood Culture",
  "Urine RE",
  "Others",
];

const QUICK_TEMPLATES = {
  "Post-op Day 1": {
    chiefComplaintsToday: "Pain at wound site, minimal nausea",
    rosData: ROS_SYSTEMS_TEMPLATE.map((s) => ({
      ...s,
      symptoms: s.symptoms.map((sym) => ({ ...sym, value: "no" as const })),
    })),
    assessment:
      "Post-operative Day 1, patient is stable. Wound appears clean. Vitals within acceptable range.",
    assessmentStatus: "Stable" as AssessmentStatus,
    planItems: [
      {
        id: "t1",
        category: "drug" as const,
        description: "IV Antibiotics",
        dose: "As ordered",
        frequency: "8 hrly",
        duration: "5 days",
        route: "IV",
        form: "Inj.",
      },
      {
        id: "t2",
        category: "drug" as const,
        description: "PCA Analgesia",
        dose: "As needed",
        frequency: "PRN",
        duration: "48 hrs",
        route: "IV",
        form: "Inj.",
      },
      {
        id: "t3",
        category: "procedure" as const,
        description: "Wound care and dressing",
      },
      {
        id: "t4",
        category: "procedure" as const,
        description: "Drain monitoring — record daily output",
      },
    ],
  },
  "ICU Patient": {
    chiefComplaintsToday:
      "Patient sedated / intubated — family reports no acute changes",
    rosData: ROS_SYSTEMS_TEMPLATE,
    assessment:
      "Critical care patient, hemodynamically monitored. Continue ICU protocol.",
    assessmentStatus: "Stable" as AssessmentStatus,
    planItems: [
      {
        id: "t5",
        category: "procedure" as const,
        description: "ICU protocol — hourly vitals and I/O monitoring",
      },
      {
        id: "t6",
        category: "investigation" as const,
        description: "Daily CBC, RFT, electrolytes",
      },
    ],
  },
  "Stable Patient": {
    chiefComplaintsToday: "No new complaints today.",
    rosData: ROS_SYSTEMS_TEMPLATE.map((s) => ({
      ...s,
      symptoms: s.symptoms.map((sym) => ({ ...sym, value: "no" as const })),
    })),
    assessment: "Patient is stable and improving. Continue current management.",
    assessmentStatus: "Improving" as AssessmentStatus,
    planItems: [
      {
        id: "t7",
        category: "procedure" as const,
        description: "Continue current medications",
      },
    ],
  },
};

// ── Storage helpers ───────────────────────────────────────────────────────────
function noteKey(doctorEmail: string, patientId: string, date: string) {
  return `daily_note_${doctorEmail}_${patientId}_${date}`;
}

function loadNote(
  doctorEmail: string,
  patientId: string,
  date: string,
): DailyNoteData | null {
  try {
    const raw = localStorage.getItem(noteKey(doctorEmail, patientId, date));
    return raw ? (JSON.parse(raw) as DailyNoteData) : null;
  } catch {
    return null;
  }
}

function saveNote(
  doctorEmail: string,
  patientId: string,
  date: string,
  data: DailyNoteData,
) {
  localStorage.setItem(
    noteKey(doctorEmail, patientId, date),
    JSON.stringify(data),
  );
}

function freshNote(date: string): DailyNoteData {
  return {
    date,
    activeComplaints: [],
    activeDiagnoses: [],
    chiefComplaintsToday: "",
    rosData: ROS_SYSTEMS_TEMPLATE.map((s) => ({
      ...s,
      symptoms: s.symptoms.map((sym) => ({ ...sym })),
    })),
    objectiveNotes: "",
    todayInvestigations: [],
    assessment: "",
    assessmentStatus: "Stable",
    planItems: [],
    carryForwardDismissed: false,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DailyProgressNoteProps {
  patientId: string;
  doctorEmail: string;
  authorName: string;
  viewerRole: StaffRole;
  latestVitals: VitalSigns | null;
  patientWeightKg?: number;
  prescriptions: Prescription[];
  /** Most recent visit — used by parent to guard admission-only access */
  latestVisit?: Visit | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(s: AssessmentStatus) {
  if (s === "Improving") return "bg-green-100 text-green-700 border-green-300";
  if (s === "Worsening") return "bg-red-100 text-red-700 border-red-300";
  return "bg-amber-100 text-amber-700 border-amber-300";
}

function trendColor(t: TrendIndicator) {
  if (t === "↑ improving") return "text-green-600";
  if (t === "↓ worsening") return "text-red-600";
  return "text-gray-500";
}

function diagnosisClassColor(c: DiagnosisClass) {
  if (c === "Primary") return "bg-red-100 text-red-700 border-red-300";
  if (c === "Secondary")
    return "bg-orange-100 text-orange-700 border-orange-300";
  return "bg-gray-100 text-gray-600 border-gray-300";
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DailyProgressNote({
  patientId,
  doctorEmail,
  authorName,
  viewerRole,
  latestVitals,
  patientWeightKg,
  prescriptions,
}: DailyProgressNoteProps) {
  // latestVisit used by parent to guard admission status; unused here
  const permissions = useRolePermissions();
  const canEdit =
    permissions.canEditClinical ||
    permissions.canWriteNursingNotes ||
    viewerRole === "intern_doctor" ||
    viewerRole === "medical_officer" ||
    viewerRole === "consultant_doctor" ||
    viewerRole === "nurse";

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  // ── Note state ────────────────────────────────────────────────────────────
  const [note, setNote] = useState<DailyNoteData>(() => {
    const existing = loadNote(doctorEmail, patientId, today);
    if (existing) return existing;
    return freshNote(today);
  });

  // ── Carry-forward banner ──────────────────────────────────────────────────
  const [carriedFrom, setCarriedFrom] = useState<string | null>(null);
  useEffect(() => {
    const existing = loadNote(doctorEmail, patientId, today);
    if (existing?.carryForwardDismissed) return;
    const prev = loadNote(doctorEmail, patientId, yesterday);
    if (!prev) return;
    if (
      existing &&
      (existing.activeComplaints.length > 0 ||
        existing.activeDiagnoses.length > 0)
    )
      return;
    // Carry forward
    const carried = existing ?? freshNote(today);
    carried.activeComplaints = prev.activeComplaints
      .filter((c) => !c.resolved)
      .map((c) => ({ ...c, id: Date.now().toString(36) + c.id }));
    carried.activeDiagnoses = prev.activeDiagnoses.map((d) => ({ ...d }));
    setNote(carried);
    saveNote(doctorEmail, patientId, today, carried);
    setCarriedFrom(yesterday);
  }, [doctorEmail, patientId, today, yesterday]);

  // ── Active tab ────────────────────────────────────────────────────────────
  type NoteTab =
    | "complaints"
    | "diagnosis"
    | "subjective"
    | "objective"
    | "assessment"
    | "plan"
    | "allFindings";
  const [activeTab, setActiveTab] = useState<NoteTab>("complaints");

  // ── Derived alerts ────────────────────────────────────────────────────────
  const vitalAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (latestVitals?.temperature) {
      const t = Number.parseFloat(latestVitals.temperature);
      if (t > 38.5) alerts.push(`🌡️ High fever: ${t}°C`);
    }
    if (latestVitals?.bloodPressure) {
      const sys = Number.parseInt(latestVitals.bloodPressure.split("/")[0]);
      if (!Number.isNaN(sys) && sys < 90)
        alerts.push(`🩸 Hypotension: BP ${latestVitals.bloodPressure} mmHg`);
    }
    if (latestVitals?.oxygenSaturation) {
      const spo2 = Number.parseFloat(latestVitals.oxygenSaturation);
      if (spo2 < 90) alerts.push(`💨 Hypoxia: SpO₂ ${spo2}%`);
    }
    return alerts;
  }, [latestVitals]);

  // ── Persisting helpers ────────────────────────────────────────────────────
  function updateNote(partial: Partial<DailyNoteData>) {
    const updated = { ...note, ...partial };
    setNote(updated);
    saveNote(doctorEmail, patientId, today, updated);
  }

  // ── Active Complaints ─────────────────────────────────────────────────────
  const [newComplaintText, setNewComplaintText] = useState("");
  const [newComplaintTrend, setNewComplaintTrend] =
    useState<TrendIndicator>("= same");

  function addComplaint(text?: string) {
    const t = (text || newComplaintText).trim();
    if (!t) return;
    const c: ActiveComplaint = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      text: t,
      trend: newComplaintTrend,
      resolved: false,
    };
    updateNote({ activeComplaints: [...note.activeComplaints, c] });
    setNewComplaintText("");
  }

  function removeComplaint(id: string) {
    updateNote({
      activeComplaints: note.activeComplaints.filter((c) => c.id !== id),
    });
  }

  function toggleComplaintResolved(id: string) {
    updateNote({
      activeComplaints: note.activeComplaints.map((c) =>
        c.id === id ? { ...c, resolved: !c.resolved } : c,
      ),
    });
  }

  function updateComplaintTrend(id: string, trend: TrendIndicator) {
    updateNote({
      activeComplaints: note.activeComplaints.map((c) =>
        c.id === id ? { ...c, trend } : c,
      ),
    });
  }

  // ── Active Diagnoses ──────────────────────────────────────────────────────
  const [newDiagText, setNewDiagText] = useState("");
  const [newDiagClass, setNewDiagClass] = useState<DiagnosisClass>("Primary");

  function addDiagnosis() {
    if (!newDiagText.trim()) return;
    const d: ActiveDiagnosis = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: newDiagText.trim(),
      classification: newDiagClass,
      status: "active",
    };
    updateNote({ activeDiagnoses: [...note.activeDiagnoses, d] });
    setNewDiagText("");
  }

  function toggleDiagStatus(id: string) {
    updateNote({
      activeDiagnoses: note.activeDiagnoses.map((d) =>
        d.id === id
          ? {
              ...d,
              status: d.status === "active" ? "resolved" : "active",
            }
          : d,
      ),
    });
  }

  function removeDiagnosis(id: string) {
    updateNote({
      activeDiagnoses: note.activeDiagnoses.filter((d) => d.id !== id),
    });
  }

  // ── ROS ───────────────────────────────────────────────────────────────────
  function updateROSSymptom(
    sysIdx: number,
    symKey: string,
    value: "yes" | "no" | "",
  ) {
    const ros = note.rosData.map((s, i) => {
      if (i !== sysIdx) return s;
      return {
        ...s,
        symptoms: s.symptoms.map((sym) =>
          sym.key === symKey ? { ...sym, value } : sym,
        ),
      };
    });
    updateNote({ rosData: ros });
  }

  function updateROSNotes(sysIdx: number, notes: string) {
    const ros = note.rosData.map((s, i) =>
      i === sysIdx ? { ...s, notes } : s,
    );
    updateNote({ rosData: ros });
  }

  // ── Investigations ────────────────────────────────────────────────────────
  const [invForm, setInvForm] = useState({
    type: "CBC",
    name: "",
    date: today,
    interpretation: "",
  });

  function addInvestigation() {
    const entry: InvestigationEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      date: invForm.date,
      type: invForm.type,
      name: invForm.name || invForm.type,
      interpretation: invForm.interpretation.trim(),
    };
    updateNote({
      todayInvestigations: [...note.todayInvestigations, entry],
    });
    setInvForm({ type: "CBC", name: "", date: today, interpretation: "" });
  }

  function removeInvestigation(id: string) {
    updateNote({
      todayInvestigations: note.todayInvestigations.filter((i) => i.id !== id),
    });
  }

  // ── Assessment auto-generate ──────────────────────────────────────────────
  function generateAssessment() {
    const primaryDx = note.activeDiagnoses.find(
      (d) => d.classification === "Primary" && d.status === "active",
    );
    const activeComplaints = note.activeComplaints
      .filter((c) => !c.resolved)
      .map((c) => c.text)
      .join(", ");
    const vitalsSummary = latestVitals
      ? [
          latestVitals.bloodPressure
            ? `BP ${latestVitals.bloodPressure} mmHg`
            : null,
          latestVitals.pulse ? `Pulse ${latestVitals.pulse} beats/min` : null,
          latestVitals.temperature
            ? `Temp ${latestVitals.temperature}°C`
            : null,
          latestVitals.oxygenSaturation
            ? `SpO₂ ${latestVitals.oxygenSaturation}%`
            : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "Vitals not recorded";
    const statusText =
      note.assessmentStatus === "Improving"
        ? "improving"
        : note.assessmentStatus === "Worsening"
          ? "deteriorating"
          : "stable";
    const text = [
      `Patient is ${statusText}.`,
      activeComplaints
        ? `Complains of ${activeComplaints}.`
        : "No active complaints.",
      `Vitals: ${vitalsSummary}.`,
      primaryDx ? `Primary diagnosis: ${primaryDx.name}.` : "",
      vitalAlerts.length > 0
        ? `Abnormal findings: ${vitalAlerts.join("; ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    updateNote({ assessment: text });
    toast.success("Assessment generated");
  }

  // ── Plan Items ────────────────────────────────────────────────────────────
  const [planCategory, setPlanCategory] = useState<
    "drug" | "investigation" | "procedure"
  >("drug");
  const [planForm, setPlanForm] = useState({
    description: "",
    dose: "",
    frequency: "",
    duration: "",
    route: "",
    form: "Tab.",
  });
  const [showPlanForm, setShowPlanForm] = useState(false);

  function addPlanItem() {
    if (!planForm.description.trim()) {
      toast.error("Enter a description");
      return;
    }
    const item: PlanItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      category: planCategory,
      description: planForm.description.trim(),
      dose: planForm.dose || undefined,
      frequency: planForm.frequency || undefined,
      duration: planForm.duration || undefined,
      route: planForm.route || undefined,
      form: planCategory === "drug" ? planForm.form : undefined,
    };
    updateNote({ planItems: [...note.planItems, item] });
    setPlanForm({
      description: "",
      dose: "",
      frequency: "",
      duration: "",
      route: "",
      form: "Tab.",
    });
    setShowPlanForm(false);
  }

  function removePlanItem(id: string) {
    updateNote({ planItems: note.planItems.filter((p) => p.id !== id) });
  }

  function savePlanAsPrescription() {
    if (note.planItems.filter((p) => p.category === "drug").length === 0) {
      toast.error("Add at least one drug to save as prescription");
      return;
    }
    const primaryDx = note.activeDiagnoses.find(
      (d) => d.classification === "Primary" && d.status === "active",
    );
    const rx: Prescription = {
      id: BigInt(Date.now()),
      patientId: BigInt(patientId),
      prescriptionDate: BigInt(Date.now() * 1_000_000),
      diagnosis: primaryDx
        ? primaryDx.name
        : note.activeDiagnoses
            .filter((d) => d.status === "active")
            .map((d) => d.name)
            .join(", ") || "Daily Progress Note",
      medications: note.planItems
        .filter((p) => p.category === "drug")
        .map((p) => ({
          name: p.description,
          dose: p.dose || "",
          frequency: p.frequency || "",
          duration: p.duration || "",
          instructions: p.route || "",
          drugForm: p.form || "",
          drugName: p.description,
          route: p.route || "",
        })),
      notes: `From Daily Progress Note — ${today}`,
      createdAt: BigInt(Date.now() * 1_000_000),
    };
    // Save to localStorage under the same key pattern as prescriptions
    const key = `prescriptions_${doctorEmail}_${patientId}`;
    try {
      const all: Prescription[] = (() => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw) as Prescription[];
      })();
      // Stringify BigInts for storage
      const serialised = [rx, ...all].map((p) => ({
        ...p,
        id: String(p.id),
        patientId: String(p.patientId),
        prescriptionDate: String(p.prescriptionDate),
        createdAt: String(p.createdAt),
      }));
      localStorage.setItem(key, JSON.stringify(serialised));
      toast.success("Plan saved as prescription!");
    } catch {
      toast.error("Could not save prescription");
    }
  }

  function loadPreviousPlanDrugs() {
    const prev = loadNote(doctorEmail, patientId, yesterday);
    if (!prev || prev.planItems.length === 0) {
      toast.info("No previous plan found");
      return;
    }
    const merged = [...note.planItems];
    for (const item of prev.planItems) {
      if (!merged.find((x) => x.description === item.description)) {
        merged.push({
          ...item,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        });
      }
    }
    updateNote({ planItems: merged });
    toast.success("Previous plan loaded");
  }

  // ── Quick Templates ───────────────────────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false);

  function applyTemplate(name: keyof typeof QUICK_TEMPLATES) {
    const tpl = QUICK_TEMPLATES[name];
    const uniqueId = () =>
      Date.now().toString(36) + Math.random().toString(36).slice(2);
    updateNote({
      chiefComplaintsToday: tpl.chiefComplaintsToday,
      rosData: tpl.rosData,
      assessment: tpl.assessment,
      assessmentStatus: tpl.assessmentStatus,
      planItems: tpl.planItems.map((p) => ({ ...p, id: uniqueId() })),
    });
    setShowTemplates(false);
    toast.success(`Template "${name}" applied`);
  }

  // ── Save note (explicit) ──────────────────────────────────────────────────
  function saveCurrentNote() {
    saveNote(doctorEmail, patientId, today, note);
    toast.success("Daily note saved");
  }

  const TABS: Array<{ key: NoteTab; label: string; color: string }> = [
    {
      key: "complaints",
      label: "💬 Complaints",
      color: "bg-pink-500",
    },
    {
      key: "diagnosis",
      label: "🏷️ Diagnosis",
      color: "bg-red-500",
    },
    {
      key: "subjective",
      label: "📝 Subjective",
      color: "bg-blue-500",
    },
    {
      key: "objective",
      label: "🔬 Objective",
      color: "bg-teal-600",
    },
    {
      key: "assessment",
      label: "📊 Assessment",
      color: "bg-amber-500",
    },
    {
      key: "plan",
      label: "💊 Plan",
      color: "bg-indigo-600",
    },
    {
      key: "allFindings",
      label: "🗂 All Findings",
      color: "bg-slate-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Alert Banners ── */}
      {vitalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">
              🚨 Clinical Alerts ({vitalAlerts.length})
            </p>
            {vitalAlerts.map((a) => (
              <p key={a} className="text-xs text-red-600">
                • {a}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Carry-forward Banner ── */}
      {carriedFrom && !note.carryForwardDismissed && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              📋 Carried forward from{" "}
              <span className="font-semibold">{carriedFrom}</span>. Review and
              update.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              updateNote({ carryForwardDismissed: true });
              setCarriedFrom(null);
            }}
            className="text-blue-400 hover:text-blue-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Header: Title + Template Picker + Save ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            Daily Progress Note
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(), "EEEE, MMMM d, yyyy")} ·{" "}
            {STAFF_ROLE_LABELS[viewerRole] ?? viewerRole} — {authorName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-indigo-300 text-indigo-700"
                onClick={() => setShowTemplates(!showTemplates)}
                data-ocid="daily_note.template_button"
              >
                <BookTemplate className="w-3.5 h-3.5" />
                Templates
              </Button>
              {showTemplates && (
                <div className="absolute right-0 top-8 z-50 bg-white rounded-xl border border-gray-200 shadow-xl w-52">
                  {(
                    Object.keys(QUICK_TEMPLATES) as Array<
                      keyof typeof QUICK_TEMPLATES
                    >
                  ).map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 hover:text-indigo-800 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      onClick={() => applyTemplate(name)}
                    >
                      <BookOpen className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canEdit && (
            <Button
              size="sm"
              onClick={saveCurrentNote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              data-ocid="daily_note.save_button"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Note
            </Button>
          )}
        </div>
      </div>

      {/* ── Section Tab Navigator ── */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            data-ocid={`daily_note.tab.${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ACTIVE COMPLAINTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "complaints" && (
        <div className="bg-white rounded-xl border border-pink-200 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-pink-800 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Active Complaints
            <span className="text-xs font-normal text-gray-400 ml-auto">
              {note.activeComplaints.filter((c) => !c.resolved).length} active
            </span>
          </h3>

          {/* Quick chips */}
          {canEdit && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COMPLAINT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => addComplaint(chip)}
                  className="text-xs bg-pink-50 border border-pink-200 text-pink-700 px-2.5 py-1 rounded-full hover:bg-pink-100 transition-colors font-medium"
                  data-ocid="daily_note.complaint_chip"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Free text + trend */}
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Input
                value={newComplaintText}
                onChange={(e) => setNewComplaintText(e.target.value)}
                placeholder="Custom complaint..."
                onKeyDown={(e) => e.key === "Enter" && addComplaint()}
                className="flex-1 min-w-[200px]"
                data-ocid="daily_note.complaint_input"
              />
              <select
                value={newComplaintTrend}
                onChange={(e) =>
                  setNewComplaintTrend(e.target.value as TrendIndicator)
                }
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                <option value="↑ improving">↑ improving</option>
                <option value="↓ worsening">↓ worsening</option>
                <option value="= same">= same</option>
              </select>
              <Button
                size="sm"
                onClick={() => addComplaint()}
                className="bg-pink-600 hover:bg-pink-700 text-white gap-1"
                data-ocid="daily_note.add_complaint_button"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Complaint list */}
          {note.activeComplaints.length === 0 ? (
            <p
              className="text-sm text-gray-400 text-center py-4"
              data-ocid="daily_note.complaints_empty_state"
            >
              No active complaints recorded. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {note.activeComplaints.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                    c.resolved
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-pink-50 border-pink-200"
                  }`}
                  data-ocid="daily_note.complaint_item"
                >
                  <span
                    className={`flex-1 text-sm font-medium ${c.resolved ? "line-through text-gray-400" : "text-gray-800"}`}
                  >
                    {c.text}
                  </span>
                  {canEdit && (
                    <select
                      value={c.trend}
                      onChange={(e) =>
                        updateComplaintTrend(
                          c.id,
                          e.target.value as TrendIndicator,
                        )
                      }
                      className={`text-xs border border-gray-200 rounded-lg px-1.5 py-0.5 font-semibold bg-white ${trendColor(c.trend)}`}
                    >
                      <option value="↑ improving">↑ improving</option>
                      <option value="↓ worsening">↓ worsening</option>
                      <option value="= same">= same</option>
                    </select>
                  )}
                  {!canEdit && (
                    <span
                      className={`text-xs font-semibold ${trendColor(c.trend)}`}
                    >
                      {c.trend}
                    </span>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleComplaintResolved(c.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          c.resolved
                            ? "bg-gray-100 text-gray-500 border-gray-200"
                            : "bg-green-100 text-green-700 border-green-200"
                        }`}
                        data-ocid="daily_note.complaint_toggle"
                      >
                        {c.resolved ? "Resolved" : "Active"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeComplaint(c.id)}
                        className="text-red-400 hover:text-red-600"
                        data-ocid="daily_note.complaint_delete_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ACTIVE DIAGNOSIS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "diagnosis" && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Active Diagnosis List
          </h3>

          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Input
                value={newDiagText}
                onChange={(e) => setNewDiagText(e.target.value)}
                placeholder="Diagnosis (e.g. Typhoid Fever)"
                onKeyDown={(e) => e.key === "Enter" && addDiagnosis()}
                className="flex-1 min-w-[180px]"
                data-ocid="daily_note.diagnosis_input"
              />
              <select
                value={newDiagClass}
                onChange={(e) =>
                  setNewDiagClass(e.target.value as DiagnosisClass)
                }
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="Comorbidity">Comorbidity</option>
              </select>
              <Button
                size="sm"
                onClick={addDiagnosis}
                className="bg-red-600 hover:bg-red-700 text-white gap-1"
                data-ocid="daily_note.add_diagnosis_button"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          )}

          {note.activeDiagnoses.length === 0 ? (
            <p
              className="text-sm text-gray-400 text-center py-4"
              data-ocid="daily_note.diagnoses_empty_state"
            >
              No diagnoses recorded. Add one above or sync from prescriptions.
            </p>
          ) : (
            <div className="space-y-2">
              {note.activeDiagnoses.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                    d.status === "resolved"
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-red-50 border-red-200"
                  }`}
                  data-ocid="daily_note.diagnosis_item"
                >
                  <span
                    className={`flex-1 text-sm font-medium ${d.status === "resolved" ? "line-through text-gray-400" : "text-gray-800"}`}
                  >
                    {d.name}
                  </span>
                  <span
                    className={`text-xs border rounded-full px-2 py-0.5 font-semibold ${diagnosisClassColor(d.classification)}`}
                  >
                    {d.classification}
                  </span>
                  <Badge
                    className={`text-xs border-0 ${d.status === "active" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {d.status === "active" ? "Active" : "Resolved"}
                  </Badge>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleDiagStatus(d.id)}
                        className="text-xs px-2 py-0.5 rounded-full border font-medium bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                        data-ocid="daily_note.diagnosis_toggle"
                      >
                        Toggle
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDiagnosis(d.id)}
                        className="text-red-400 hover:text-red-600"
                        data-ocid="daily_note.diagnosis_delete_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sync from prescriptions */}
          {canEdit && prescriptions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-300 text-red-700"
              onClick={() => {
                const diagSet = new Set(
                  note.activeDiagnoses.map((d) => d.name.toLowerCase()),
                );
                const newDiags: ActiveDiagnosis[] = [];
                for (const rx of prescriptions) {
                  if (rx.diagnosis) {
                    for (const part of rx.diagnosis.split(/[,|;]/)) {
                      const name = part.trim();
                      if (name && !diagSet.has(name.toLowerCase())) {
                        newDiags.push({
                          id: Date.now().toString(36) + name,
                          name,
                          classification:
                            newDiags.length === 0 ? "Primary" : "Secondary",
                          status: "active",
                        });
                        diagSet.add(name.toLowerCase());
                      }
                    }
                  }
                }
                if (newDiags.length > 0) {
                  updateNote({
                    activeDiagnoses: [...note.activeDiagnoses, ...newDiags],
                  });
                  toast.success(`Synced ${newDiags.length} diagnosis(es)`);
                } else {
                  toast.info("No new diagnoses to sync");
                }
              }}
              data-ocid="daily_note.sync_diagnosis_button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync from Prescriptions
            </Button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SUBJECTIVE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "subjective" && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 space-y-5">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Subjective Section
          </h3>

          {/* Chief Complaints Today */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-2">
            <Label className="text-xs font-bold text-blue-800 uppercase">
              Chief Complaints (Today)
            </Label>
            {canEdit && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_COMPLAINT_CHIPS.slice(0, 8).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      updateNote({
                        chiefComplaintsToday: note.chiefComplaintsToday
                          ? `${note.chiefComplaintsToday}, ${chip}`
                          : chip,
                      })
                    }
                    className="text-xs bg-blue-100 border border-blue-300 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={note.chiefComplaintsToday}
              onChange={(e) =>
                updateNote({ chiefComplaintsToday: e.target.value })
              }
              placeholder="Today's main complaints..."
              rows={2}
              disabled={!canEdit}
              className="border-blue-200"
              data-ocid="daily_note.cc_today_input"
            />
          </div>

          {/* ROS Systems */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              System Review (ROS)
            </p>
            {note.rosData.map((sys, sysIdx) => (
              <ROSSystemSection
                key={sys.name}
                sys={sys}
                sysIdx={sysIdx}
                canEdit={canEdit}
                onSymptomChange={updateROSSymptom}
                onNotesChange={updateROSNotes}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: OBJECTIVE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "objective" && (
        <div className="space-y-4">
          {/* Vitals display */}
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-5">
            <h3 className="font-semibold text-rose-800 mb-3 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4" /> Latest Vitals
            </h3>
            {latestVitals ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    label: "BP",
                    value: latestVitals.bloodPressure || "—",
                    unit: "mmHg",
                  },
                  {
                    label: "Pulse",
                    value: latestVitals.pulse || "—",
                    unit: "beats/min",
                  },
                  {
                    label: "SpO₂",
                    value: latestVitals.oxygenSaturation || "—",
                    unit: "%",
                  },
                  {
                    label: "Temp",
                    value: latestVitals.temperature || "—",
                    unit: "°C",
                  },
                  {
                    label: "RR",
                    value: latestVitals.respiratoryRate || "—",
                    unit: "breaths/min",
                  },
                  {
                    label: "Weight",
                    value: latestVitals.weight || "—",
                    unit: "kg",
                  },
                ].map(({ label, value, unit }) => (
                  <div
                    key={label}
                    className="bg-white rounded-lg border border-rose-200 p-2.5 text-center"
                  >
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-bold text-gray-800">{value}</p>
                    <p className="text-xs font-bold text-gray-500">{unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No vitals recorded yet.</p>
            )}
          </div>

          {/* Additional Objective Notes */}
          {canEdit && (
            <div className="bg-white rounded-xl border border-teal-200 p-4">
              <Label className="text-xs font-bold text-teal-800 mb-2 block uppercase">
                Additional Objective Notes
              </Label>
              <Textarea
                value={note.objectiveNotes}
                onChange={(e) => updateNote({ objectiveNotes: e.target.value })}
                placeholder="General examination, systemic findings..."
                rows={3}
                className="border-teal-200"
                data-ocid="daily_note.objective_notes"
              />
            </div>
          )}

          {/* I/O Chart */}
          <IOChart
            patientId={patientId}
            doctorEmail={doctorEmail}
            patientWeightKg={patientWeightKg}
            canEdit={canEdit}
          />

          {/* Drain Monitor */}
          <DrainMonitor
            patientId={patientId}
            doctorEmail={doctorEmail}
            canEdit={canEdit}
          />

          {/* Today's Investigations */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2 text-sm">
              <FlaskConical className="w-4 h-4" /> Investigations
            </h3>
            {canEdit && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Type</Label>
                    <select
                      value={invForm.type}
                      onChange={(e) =>
                        setInvForm((f) => ({ ...f, type: e.target.value }))
                      }
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      data-ocid="daily_note.inv_type_select"
                    >
                      {INVESTIGATION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Date</Label>
                    <input
                      type="date"
                      value={invForm.date}
                      onChange={(e) =>
                        setInvForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">
                    Specific Name (if different)
                  </Label>
                  <Input
                    value={invForm.name}
                    onChange={(e) =>
                      setInvForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Blood Culture"
                    className="mt-1"
                    data-ocid="daily_note.inv_name_input"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Clinical Interpretation
                  </Label>
                  <Input
                    value={invForm.interpretation}
                    onChange={(e) =>
                      setInvForm((f) => ({
                        ...f,
                        interpretation: e.target.value,
                      }))
                    }
                    placeholder="e.g. Hb ↓, WBC ↑, USG: fluid collection"
                    className="mt-1"
                    data-ocid="daily_note.inv_interpretation_input"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={addInvestigation}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  data-ocid="daily_note.add_inv_button"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Investigation
                </Button>
              </div>
            )}

            {note.todayInvestigations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                No investigations added today.
              </p>
            ) : (
              <div className="space-y-2">
                {note.todayInvestigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100"
                    data-ocid="daily_note.inv_item"
                  >
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        {inv.name}
                      </p>
                      {inv.interpretation && (
                        <p className="text-xs text-amber-600">
                          → {inv.interpretation}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{inv.date}</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeInvestigation(inv.id)}
                        className="text-red-400 hover:text-red-600"
                        data-ocid="daily_note.inv_delete_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ASSESSMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "assessment" && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Assessment
              <span className="text-xs font-normal text-gray-400">
                (auto-generated, editable)
              </span>
            </h3>
            {canEdit && (
              <div className="flex gap-2">
                <select
                  value={note.assessmentStatus}
                  onChange={(e) =>
                    updateNote({
                      assessmentStatus: e.target.value as AssessmentStatus,
                    })
                  }
                  className={`border rounded-lg px-3 py-1.5 text-sm font-semibold ${statusColor(note.assessmentStatus)}`}
                  data-ocid="daily_note.assessment_status_select"
                >
                  <option value="Improving">✅ Improving</option>
                  <option value="Stable">⚠️ Stable</option>
                  <option value="Worsening">🔴 Worsening</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-amber-300 text-amber-700"
                  onClick={generateAssessment}
                  data-ocid="daily_note.regenerate_button"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>

          <Textarea
            value={note.assessment}
            onChange={(e) => updateNote({ assessment: e.target.value })}
            placeholder="Patient is stable. Complains of... Vitals: ... Diagnosis: ..."
            rows={6}
            disabled={!canEdit}
            className="border-amber-200 text-sm"
            data-ocid="daily_note.assessment_textarea"
          />

          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 border text-sm font-semibold ${statusColor(note.assessmentStatus)}`}
          >
            <Activity className="w-4 h-4" />
            Overall Status: {note.assessmentStatus}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: PLAN
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "plan" && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
              <Pill className="w-4 h-4" /> Plan
            </h3>
            {canEdit && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-gray-300 text-gray-600"
                  onClick={loadPreviousPlanDrugs}
                  data-ocid="daily_note.continue_previous_button"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Continue Previous
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() => setShowPlanForm(!showPlanForm)}
                  data-ocid="daily_note.add_plan_button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
              </div>
            )}
          </div>

          {/* Plan form */}
          {showPlanForm && canEdit && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 space-y-3">
              <div className="flex gap-2">
                {(["drug", "investigation", "procedure"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPlanCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${planCategory === cat ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {planCategory === "drug" && (
                  <div>
                    <Label className="text-xs">Form</Label>
                    <select
                      value={planForm.form}
                      onChange={(e) =>
                        setPlanForm((f) => ({ ...f, form: e.target.value }))
                      }
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {["Tab.", "Cap.", "Syp.", "Inj.", "Inf.", "Supp."].map(
                        (f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
                <div className={planCategory === "drug" ? "" : "col-span-2"}>
                  <Label className="text-xs">
                    {planCategory === "drug"
                      ? "Drug Name"
                      : planCategory === "investigation"
                        ? "Investigation"
                        : "Procedure"}
                  </Label>
                  <Input
                    value={planForm.description}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder={
                      planCategory === "drug"
                        ? "e.g. Amoxicillin, Metronidazole"
                        : planCategory === "investigation"
                          ? "e.g. CBC, RFT"
                          : "e.g. Wound dressing"
                    }
                    className="mt-1"
                    data-ocid="daily_note.plan_description_input"
                  />
                </div>
                {planCategory === "drug" && (
                  <>
                    <div>
                      <Label className="text-xs">Dose</Label>
                      <Input
                        value={planForm.dose}
                        onChange={(e) =>
                          setPlanForm((f) => ({ ...f, dose: e.target.value }))
                        }
                        placeholder="e.g. 500mg"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Frequency</Label>
                      <Input
                        value={planForm.frequency}
                        onChange={(e) =>
                          setPlanForm((f) => ({
                            ...f,
                            frequency: e.target.value,
                          }))
                        }
                        placeholder="e.g. 1+1+1 / BD / TDS"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Duration</Label>
                      <Input
                        value={planForm.duration}
                        onChange={(e) =>
                          setPlanForm((f) => ({
                            ...f,
                            duration: e.target.value,
                          }))
                        }
                        placeholder="e.g. 5 days"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Route</Label>
                      <Input
                        value={planForm.route}
                        onChange={(e) =>
                          setPlanForm((f) => ({ ...f, route: e.target.value }))
                        }
                        placeholder="e.g. Oral, IV"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addPlanItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-ocid="daily_note.save_plan_item_button"
                >
                  Add to Plan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPlanForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Plan items table */}
          {note.planItems.length === 0 ? (
            <div
              className="text-center py-8"
              data-ocid="daily_note.plan_empty_state"
            >
              <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No plan items yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Type",
                      "Item",
                      "Dose",
                      "Frequency",
                      "Duration",
                      "Route",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {note.planItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      data-ocid="daily_note.plan_item_row"
                    >
                      <td className="px-3 py-2.5">
                        <Badge
                          className={`text-xs border-0 ${
                            item.category === "drug"
                              ? "bg-indigo-100 text-indigo-700"
                              : item.category === "investigation"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {item.form && (
                          <span className="text-gray-500 mr-1">
                            {item.form}
                          </span>
                        )}
                        {item.description}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {item.dose || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {item.frequency || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {item.duration || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {item.route || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removePlanItem(item.id)}
                            className="text-red-400 hover:text-red-600"
                            data-ocid="daily_note.plan_delete_button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save as prescription */}
          {canEdit && note.planItems.some((p) => p.category === "drug") && (
            <Button
              onClick={savePlanAsPrescription}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              data-ocid="daily_note.save_as_prescription_button"
            >
              <Zap className="w-4 h-4" />
              Save Plan as Prescription
            </Button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ALL FINDINGS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "allFindings" && (
        <AllFindingsTab
          patientId={patientId}
          doctorEmail={doctorEmail}
          note={note}
          latestVitals={latestVitals}
          today={today}
        />
      )}
    </div>
  );
}

// ── ROS System Section ────────────────────────────────────────────────────────
function ROSSystemSection({
  sys,
  sysIdx,
  canEdit,
  onSymptomChange,
  onNotesChange,
}: {
  sys: ROSSystem;
  sysIdx: number;
  canEdit: boolean;
  onSymptomChange: (
    sysIdx: number,
    key: string,
    val: "yes" | "no" | "",
  ) => void;
  onNotesChange: (sysIdx: number, notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const positive = sys.symptoms.filter((s) => s.value === "yes").length;

  const SYS_COLORS: Record<string, string> = {
    CVS: "bg-red-50 border-red-200",
    Respiratory: "bg-sky-50 border-sky-200",
    GI: "bg-yellow-50 border-yellow-200",
    CNS: "bg-purple-50 border-purple-200",
    GU: "bg-teal-50 border-teal-200",
  };
  const SYS_HEADER: Record<string, string> = {
    CVS: "text-red-800",
    Respiratory: "text-sky-800",
    GI: "text-yellow-800",
    CNS: "text-purple-800",
    GU: "text-teal-800",
  };

  return (
    <div
      className={`rounded-xl border ${SYS_COLORS[sys.name] ?? "bg-gray-50 border-gray-200"}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span
          className={`font-semibold text-sm ${SYS_HEADER[sys.name] ?? "text-gray-700"}`}
        >
          {sys.name}
        </span>
        <div className="flex items-center gap-2">
          {positive > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-0">
              {positive} positive
            </Badge>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {sys.symptoms.map((sym) => (
              <div
                key={sym.key}
                className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2"
              >
                <span className="flex-1 text-xs text-gray-700">
                  {sym.label}
                </span>
                {canEdit ? (
                  <div className="flex gap-1">
                    {(["yes", "no", ""] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onSymptomChange(sysIdx, sym.key, v)}
                        className={`text-xs px-1.5 py-0.5 rounded border font-medium transition-colors ${
                          sym.value === v
                            ? v === "yes"
                              ? "bg-red-500 text-white border-red-500"
                              : v === "no"
                                ? "bg-green-500 text-white border-green-500"
                                : "bg-gray-300 text-gray-700 border-gray-300"
                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {v === "" ? "?" : v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span
                    className={`text-xs font-semibold ${sym.value === "yes" ? "text-red-600" : sym.value === "no" ? "text-green-600" : "text-gray-400"}`}
                  >
                    {sym.value || "?"}
                  </span>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <Input
              value={sys.notes}
              onChange={(e) => onNotesChange(sysIdx, e.target.value)}
              placeholder={`${sys.name} notes (optional)...`}
              className="text-sm"
            />
          )}
          {!canEdit && sys.notes && (
            <p className="text-xs text-gray-600 mt-1">{sys.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── All Findings Tab ─────────────────────────────────────────────────────────
function AllFindingsTab({
  patientId,
  doctorEmail,
  note,
  latestVitals,
  today,
}: {
  patientId: string;
  doctorEmail: string;
  note: DailyNoteData;
  latestVitals: VitalSigns | null;
  today: string;
}) {
  // Load today's I/O totals
  const ioTotals = useMemo(() => {
    try {
      const raw = localStorage.getItem(
        `io_chart_${doctorEmail}_${patientId}_${today}`,
      );
      if (!raw) return null;
      const entries = JSON.parse(raw) as Array<{
        oralIntake: number;
        ivFluidAmount: number;
        ngFeed: number;
        urineOutput: number;
        drainOutput: number;
        tTubeOutput: number;
        vomitus: number;
      }>;
      const totalIntake = entries.reduce(
        (s, e) => s + e.oralIntake + e.ivFluidAmount + e.ngFeed,
        0,
      );
      const totalOutput = entries.reduce(
        (s, e) => s + e.urineOutput + e.drainOutput + e.tTubeOutput + e.vomitus,
        0,
      );
      return { totalIntake, totalOutput, balance: totalIntake - totalOutput };
    } catch {
      return null;
    }
  }, [patientId, doctorEmail, today]);

  // Load drain entries
  const drainSummary = useMemo(() => {
    try {
      const raw = localStorage.getItem(
        `drain_monitoring_${doctorEmail}_${patientId}`,
      );
      if (!raw) return [];
      const entries = JSON.parse(raw) as Array<{
        date: string;
        drainType: string;
        amount: number;
        color: string;
      }>;
      const todayEntries = entries.filter((e) => e.date === today);
      const byType: Record<string, { total: number; color: string }> = {};
      for (const e of todayEntries) {
        if (!byType[e.drainType])
          byType[e.drainType] = { total: 0, color: e.color };
        byType[e.drainType].total += e.amount;
        byType[e.drainType].color = e.color;
      }
      return Object.entries(byType).map(([t, v]) => ({
        type: t,
        ...v,
      }));
    } catch {
      return [];
    }
  }, [patientId, doctorEmail, today]);

  const activeComplaintsCount = note.activeComplaints.filter(
    (c) => !c.resolved,
  ).length;
  const primaryDx = note.activeDiagnoses.find(
    (d) => d.classification === "Primary" && d.status === "active",
  );

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Thermometer className="w-4 h-4" /> All Findings Summary —{" "}
          <span className="text-xs font-normal text-gray-400">{today}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vitals */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="text-xs font-bold text-rose-700 mb-2 uppercase">
              Latest Vitals
            </p>
            {latestVitals ? (
              <div className="space-y-1">
                {latestVitals.bloodPressure && (
                  <p className="text-xs text-rose-800">
                    BP:{" "}
                    <span className="font-bold">
                      {latestVitals.bloodPressure}
                    </span>{" "}
                    <span className="font-bold text-rose-500">mmHg</span>
                  </p>
                )}
                {latestVitals.pulse && (
                  <p className="text-xs text-rose-800">
                    Pulse:{" "}
                    <span className="font-bold">{latestVitals.pulse}</span>{" "}
                    <span className="font-bold text-rose-500">beats/min</span>
                  </p>
                )}
                {latestVitals.temperature && (
                  <p className="text-xs text-rose-800">
                    Temp:{" "}
                    <span className="font-bold">
                      {latestVitals.temperature}
                    </span>{" "}
                    <span className="font-bold text-rose-500">°C</span>
                  </p>
                )}
                {latestVitals.oxygenSaturation && (
                  <p className="text-xs text-rose-800">
                    SpO₂:{" "}
                    <span className="font-bold">
                      {latestVitals.oxygenSaturation}
                    </span>{" "}
                    <span className="font-bold text-rose-500">%</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No vitals recorded</p>
            )}
          </div>

          {/* I/O Summary */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
            <p className="text-xs font-bold text-cyan-700 mb-2 uppercase">
              I/O Today
            </p>
            {ioTotals ? (
              <div className="space-y-1">
                <p className="text-xs text-cyan-800">
                  Intake:{" "}
                  <span className="font-bold">{ioTotals.totalIntake}</span>{" "}
                  <span className="font-bold text-cyan-500">ml</span>
                </p>
                <p className="text-xs text-cyan-800">
                  Output:{" "}
                  <span className="font-bold">{ioTotals.totalOutput}</span>{" "}
                  <span className="font-bold text-cyan-500">ml</span>
                </p>
                <p
                  className={`text-xs font-bold ${ioTotals.balance >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  Balance: {ioTotals.balance >= 0 ? "+" : ""}
                  {ioTotals.balance} <span className="font-bold">ml</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No I/O data today</p>
            )}
          </div>

          {/* Drain Summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs font-bold text-orange-700 mb-2 uppercase">
              Drain Status
            </p>
            {drainSummary.length > 0 ? (
              <div className="space-y-1">
                {drainSummary.map((d) => (
                  <p key={d.type} className="text-xs text-orange-800">
                    {d.type}: <span className="font-bold">{d.total}</span>{" "}
                    <span className="font-bold text-orange-500">ml</span>
                    {" — "}
                    <span className="italic">{d.color}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No drain data today</p>
            )}
          </div>

          {/* Complaints & Diagnosis */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs font-bold text-purple-700 mb-2 uppercase">
              Clinical Summary
            </p>
            <p className="text-xs text-purple-800">
              Active complaints:{" "}
              <span className="font-bold">{activeComplaintsCount}</span>
            </p>
            {primaryDx && (
              <p className="text-xs text-purple-800 mt-1">
                Primary Dx: <span className="font-bold">{primaryDx.name}</span>
              </p>
            )}
            {note.todayInvestigations.length > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs font-semibold text-purple-600">
                  Key findings:
                </p>
                {note.todayInvestigations.slice(0, 3).map((inv) => (
                  <p key={inv.id} className="text-xs text-purple-700">
                    • {inv.name}: {inv.interpretation || "See report"}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assessment Status */}
        {note.assessment && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-600 mb-1 uppercase">
              Assessment
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {note.assessment}
            </p>
          </div>
        )}

        {/* Plan Summary */}
        {note.planItems.length > 0 && (
          <div className="mt-4 bg-indigo-50 rounded-xl border border-indigo-200 p-4">
            <p className="text-xs font-bold text-indigo-700 mb-2 uppercase">
              Plan
            </p>
            <ul className="space-y-1">
              {note.planItems.slice(0, 5).map((item) => (
                <li key={item.id} className="text-xs text-indigo-800">
                  • {item.form ? `${item.form} ` : ""}
                  {item.description}
                  {item.dose ? ` ${item.dose}` : ""}
                  {item.frequency ? ` ${item.frequency}` : ""}
                  {item.duration ? ` × ${item.duration}` : ""}
                </li>
              ))}
              {note.planItems.length > 5 && (
                <li className="text-xs text-indigo-500">
                  + {note.planItems.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
