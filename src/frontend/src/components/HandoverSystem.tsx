/**
 * HandoverSystem — Shift handover management for admitted patients.
 *
 * NURSE HANDOVER:
 *   - Shift-wise (Morning/Evening/Night), auto-detected
 *   - Draft while editing; locked ("submitted") on submit
 *   - Consultant Doctor can add comments to submitted handovers
 *   - New nurse always gets a fresh entry; old entries are immutable after submission
 *
 * MEDICAL OFFICER HANDOVER:
 *   - Auto-generated from current diagnosis, vitals, plan, pending investigations
 *   - MO edits before submitting; locked after submit
 *   - Consultant Doctor sees a "Finalize & Add Notes" panel with "Add to Daily Progress" option
 *
 * Placement: Added as the "Handover" tab in PatientDashboard.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Lock,
  MessageSquare,
  Plus,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { StaffRole } from "../types";
import { STAFF_ROLE_LABELS } from "../types";
import type { TrackedInvestigation } from "./InvestigationTracker";
import { loadTrackedInvestigations } from "./InvestigationTracker";

// ── Types ──────────────────────────────────────────────────────────────────────

export type HandoverShift = "Morning" | "Evening" | "Night";
export type HandoverType = "nurse" | "mo";
export type HandoverStatus = "draft" | "submitted";

export interface HandoverComment {
  comment: string;
  commentBy: string;
  commentByRole: StaffRole;
  commentAt: string;
}

export interface PendingTasks {
  pendingInvestigations: string[]; // names
  pendingProcedures: string[];
  otherPending: string;
}

export interface HandoverVitals {
  bp: string;
  pulse: string;
  temp: string;
  spo2: string;
  rr: string;
}

export interface HandoverMedication {
  drugName: string;
  dose: string;
  frequency: string;
}

export interface HandoverEntry {
  id: string;
  patientId: string;
  type: HandoverType;
  shift: HandoverShift;
  date: string; // YYYY-MM-DD
  status: HandoverStatus;
  createdBy: string;
  createdByRole: StaffRole;
  createdAt: string;
  submittedAt?: string;
  vitals: HandoverVitals;
  medications: HandoverMedication[];
  pendingTasks: PendingTasks;
  notes: string;
  /** Nurse handover: who the handover is given to */
  handoverTo: string;
  /** MO handover: consultant's directive notes */
  consultantNotes?: string;
  consultantNotesBy?: string;
  consultantNotesAt?: string;
  /** Should MO notes be copied into daily progress */
  addedToDailyProgress?: boolean;
  comments: HandoverComment[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function detectShift(): HandoverShift {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return "Morning";
  if (h >= 14 && h < 22) return "Evening";
  return "Night";
}

function shiftColor(shift: HandoverShift) {
  if (shift === "Morning")
    return "bg-amber-100 text-amber-800 border-amber-300";
  if (shift === "Evening")
    return "bg-indigo-100 text-indigo-800 border-indigo-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

const HANDOVER_KEY = (patientId: string) => `handovers_${patientId}`;

function loadHandovers(patientId: string): HandoverEntry[] {
  try {
    const raw = localStorage.getItem(HANDOVER_KEY(patientId));
    return raw ? (JSON.parse(raw) as HandoverEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHandovers(patientId: string, entries: HandoverEntry[]) {
  try {
    localStorage.setItem(HANDOVER_KEY(patientId), JSON.stringify(entries));
  } catch {}
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ShiftBadge({ shift }: { shift: HandoverShift }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${shiftColor(shift)}`}
    >
      {shift === "Morning" ? "🌅" : shift === "Evening" ? "🌆" : "🌙"} {shift}
    </span>
  );
}

function StatusBadge({ status }: { status: HandoverStatus }) {
  return status === "submitted" ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
      <Lock className="w-3 h-3" /> Submitted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
      <Clock className="w-3 h-3" /> Draft
    </span>
  );
}

// ── Nurse Handover Form ────────────────────────────────────────────────────────

interface NurseHandoverFormProps {
  patientId: string;
  patientName: string;
  bed: string;
  ward: string;
  authorName: string;
  authorRole: StaffRole;
  existingEntry?: HandoverEntry | null;
  latestVitals: Record<string, string> | null;
  activeMedications: HandoverMedication[];
  trackedInvestigations: TrackedInvestigation[];
  onSaved: () => void;
}

function NurseHandoverForm({
  patientId,
  patientName,
  bed,
  ward,
  authorName,
  authorRole,
  existingEntry,
  latestVitals,
  activeMedications,
  trackedInvestigations,
  onSaved,
}: NurseHandoverFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Pre-fill from existing draft or auto-detect/auto-pull
  const pendingInvs = trackedInvestigations
    .filter((i) => i.status === "ordered" || i.status === "sample_collected")
    .map((i) => i.name);

  const [shift, setShift] = useState<HandoverShift>(
    existingEntry?.shift ?? detectShift(),
  );
  const [date, setDate] = useState(existingEntry?.date ?? today);
  const [vitals, setVitals] = useState<HandoverVitals>(
    existingEntry?.vitals ?? {
      bp: latestVitals?.bloodPressure ?? "",
      pulse: latestVitals?.pulse ?? "",
      temp: latestVitals?.temperature ?? "",
      spo2: latestVitals?.oxygenSaturation ?? "",
      rr: latestVitals?.respiratoryRate ?? "",
    },
  );
  const [medications, setMedications] = useState<HandoverMedication[]>(
    existingEntry?.medications ?? activeMedications,
  );
  const [pendingInvestigations, setPendingInvestigations] = useState<string[]>(
    existingEntry?.pendingTasks.pendingInvestigations ?? pendingInvs,
  );
  const [pendingProcedures, setPendingProcedures] = useState<string[]>(
    existingEntry?.pendingTasks.pendingProcedures ?? [""],
  );
  const [otherPending, setOtherPending] = useState(
    existingEntry?.pendingTasks.otherPending ?? "",
  );
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");
  const [handoverTo, setHandoverTo] = useState(existingEntry?.handoverTo ?? "");

  function save(submit: boolean) {
    const entry: HandoverEntry = {
      id: existingEntry?.id ?? `hov_${Date.now().toString(36)}`,
      patientId,
      type: "nurse",
      shift,
      date,
      status: submit ? "submitted" : "draft",
      createdBy: authorName,
      createdByRole: authorRole,
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      submittedAt: submit ? new Date().toISOString() : undefined,
      vitals,
      medications,
      pendingTasks: {
        pendingInvestigations: pendingInvestigations.filter(Boolean),
        pendingProcedures: pendingProcedures.filter(Boolean),
        otherPending,
      },
      notes,
      handoverTo,
      comments: existingEntry?.comments ?? [],
    };

    const all = loadHandovers(patientId);
    const idx = all.findIndex((h) => h.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.unshift(entry);
    saveHandovers(patientId, all);

    if (submit) {
      toast.success("Handover submitted and locked ✓");
    } else {
      toast.success("Handover draft saved");
    }
    onSaved();
  }

  const vitalFields: Array<{
    key: keyof HandoverVitals;
    label: string;
    unit: string;
  }> = [
    { key: "bp", label: "BP", unit: "mmHg" },
    { key: "pulse", label: "Pulse", unit: "beats/min" },
    { key: "temp", label: "Temp", unit: "°C" },
    { key: "spo2", label: "SpO₂", unit: "%" },
    { key: "rr", label: "RR", unit: "breaths/min" },
  ];

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Nurse Handover Form
        </h3>
        <ShiftBadge shift={shift} />
      </div>

      {/* Patient + Shift + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold text-purple-700">
            Patient
          </Label>
          <Input value={patientName} disabled className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-purple-700">
            Bed / Ward
          </Label>
          <Input
            value={`${bed}${ward ? ` / ${ward}` : ""}`}
            disabled
            className="mt-1 bg-white"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-purple-700">Date</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      {/* Shift selector */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1.5 block">
          Shift
        </Label>
        <div className="flex gap-2">
          {(["Morning", "Evening", "Night"] as HandoverShift[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setShift(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                shift === s
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
              }`}
              data-ocid={`handover.nurse.shift.${s.toLowerCase()}`}
            >
              {s === "Morning" ? "🌅" : s === "Evening" ? "🌆" : "🌙"} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Vitals */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1.5 block">
          Current Vitals
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {vitalFields.map(({ key, label, unit }) => (
            <div key={key}>
              <Label className="text-xs text-gray-500">
                {label} ({unit})
              </Label>
              <Input
                value={vitals[key]}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, [key]: e.target.value }))
                }
                placeholder={label}
                className="mt-1 bg-white"
                data-ocid={`handover.nurse.vitals.${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Active Medications */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1.5 block">
          Active Medications
        </Label>
        <div className="space-y-2">
          {medications.map((med, i) => (
            <div
              key={`${med.drugName}-${i}`}
              className="flex gap-2 items-center bg-white rounded-lg border border-purple-100 px-3 py-2"
            >
              <span className="flex-1 text-sm font-medium text-gray-800">
                {med.drugName}
              </span>
              <span className="text-xs text-gray-500">{med.dose}</span>
              <span className="text-xs text-gray-400">{med.frequency}</span>
              <button
                type="button"
                onClick={() =>
                  setMedications((m) => m.filter((_, j) => j !== i))
                }
                className="text-red-400 hover:text-red-600 ml-1"
                data-ocid="handover.nurse.medication.delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {medications.length === 0 && (
            <p className="text-xs text-gray-400 italic">
              No medications auto-pulled. Add manually if needed.
            </p>
          )}
        </div>
      </div>

      {/* Pending Investigations */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1.5 block">
          Pending Investigations
        </Label>
        <div className="space-y-1.5">
          {pendingInvestigations.map((inv, i) => (
            <div key={`inv-${i}-${inv}`} className="flex gap-2 items-center">
              <Input
                value={inv}
                onChange={(e) => {
                  const updated = [...pendingInvestigations];
                  updated[i] = e.target.value;
                  setPendingInvestigations(updated);
                }}
                placeholder="Investigation name"
                className="bg-white text-sm"
                data-ocid="handover.nurse.pending_inv.input"
              />
              <button
                type="button"
                onClick={() =>
                  setPendingInvestigations((p) => p.filter((_, j) => j !== i))
                }
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-purple-300 text-purple-700 bg-white"
            onClick={() => setPendingInvestigations((p) => [...p, ""])}
            data-ocid="handover.nurse.add_investigation"
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      </div>

      {/* Pending Procedures */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1.5 block">
          Pending Procedures
        </Label>
        <div className="space-y-1.5">
          {pendingProcedures.map((proc, i) => (
            <div key={`np-${i}-${proc}`} className="flex gap-2 items-center">
              <Input
                value={proc}
                onChange={(e) => {
                  const updated = [...pendingProcedures];
                  updated[i] = e.target.value;
                  setPendingProcedures(updated);
                }}
                placeholder="Procedure description"
                className="bg-white text-sm"
                data-ocid="handover.nurse.pending_proc.input"
              />
              <button
                type="button"
                onClick={() =>
                  setPendingProcedures((p) => p.filter((_, j) => j !== i))
                }
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-purple-300 text-purple-700 bg-white"
            onClick={() => setPendingProcedures((p) => [...p, ""])}
            data-ocid="handover.nurse.add_procedure"
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      </div>

      {/* Other Pending + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-purple-700 mb-1">
            Other Pending Items
          </Label>
          <Textarea
            value={otherPending}
            onChange={(e) => setOtherPending(e.target.value)}
            placeholder="Other tasks left pending..."
            rows={2}
            className="bg-white border-purple-200"
            data-ocid="handover.nurse.other_pending"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-purple-700 mb-1">
            Nursing Notes / Observations
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Patient condition, nursing observations, special care instructions..."
            rows={2}
            className="bg-white border-purple-200"
            data-ocid="handover.nurse.notes"
          />
        </div>
      </div>

      {/* Handover To */}
      <div>
        <Label className="text-xs font-semibold text-purple-700 mb-1">
          Handover To (Next Nurse)
        </Label>
        <Input
          value={handoverTo}
          onChange={(e) => setHandoverTo(e.target.value)}
          placeholder="Name of nurse receiving handover"
          className="bg-white"
          data-ocid="handover.nurse.handover_to"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="border-purple-300 text-purple-700"
          onClick={() => save(false)}
          data-ocid="handover.nurse.save_draft_button"
        >
          Save Draft
        </Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
          onClick={() => save(true)}
          data-ocid="handover.nurse.submit_button"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Submit Handover
        </Button>
      </div>
    </div>
  );
}

// ── MO Handover Form ───────────────────────────────────────────────────────────

interface MOHandoverFormProps {
  patientId: string;
  patientName: string;
  authorName: string;
  authorRole: StaffRole;
  existingEntry?: HandoverEntry | null;
  latestVitals: Record<string, string> | null;
  activeMedications: HandoverMedication[];
  trackedInvestigations: TrackedInvestigation[];
  activeDiagnoses: string[];
  latestPlan: string;
  onSaved: () => void;
}

function MOHandoverForm({
  patientId,
  patientName,
  authorName,
  authorRole,
  existingEntry,
  latestVitals,
  activeMedications,
  trackedInvestigations,
  activeDiagnoses,
  latestPlan,
  onSaved,
}: MOHandoverFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const pendingInvNames = trackedInvestigations
    .filter((i) => i.status === "ordered" || i.status === "sample_collected")
    .map((i) => i.name);

  // Auto-generate pre-fill
  const autoVitals: HandoverVitals = {
    bp: latestVitals?.bloodPressure ?? "",
    pulse: latestVitals?.pulse ?? "",
    temp: latestVitals?.temperature ?? "",
    spo2: latestVitals?.oxygenSaturation ?? "",
    rr: latestVitals?.respiratoryRate ?? "",
  };

  const [vitals, setVitals] = useState<HandoverVitals>(
    existingEntry?.vitals ?? autoVitals,
  );
  const [medications] = useState<HandoverMedication[]>(
    existingEntry?.medications ?? activeMedications,
  );
  const [pendingInvestigations] = useState<string[]>(
    existingEntry?.pendingTasks.pendingInvestigations ?? pendingInvNames,
  );
  const [pendingProcedures, setPendingProcedures] = useState<string[]>(
    existingEntry?.pendingTasks.pendingProcedures ?? [""],
  );
  const [otherPending, setOtherPending] = useState(
    existingEntry?.pendingTasks.otherPending ?? "",
  );
  const [notes, setNotes] = useState(
    existingEntry?.notes ??
      [
        activeDiagnoses.length > 0
          ? `Diagnoses: ${activeDiagnoses.join(", ")}.`
          : "",
        latestPlan ? `Current plan: ${latestPlan}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
  );

  function save(submit: boolean) {
    const entry: HandoverEntry = {
      id: existingEntry?.id ?? `hov_mo_${Date.now().toString(36)}`,
      patientId,
      type: "mo",
      shift: detectShift(),
      date: today,
      status: submit ? "submitted" : "draft",
      createdBy: authorName,
      createdByRole: authorRole,
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      submittedAt: submit ? new Date().toISOString() : undefined,
      vitals,
      medications,
      pendingTasks: {
        pendingInvestigations,
        pendingProcedures: pendingProcedures.filter(Boolean),
        otherPending,
      },
      notes,
      handoverTo: "",
      comments: existingEntry?.comments ?? [],
    };

    const all = loadHandovers(patientId);
    const idx = all.findIndex((h) => h.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.unshift(entry);
    saveHandovers(patientId, all);

    toast.success(
      submit ? "MO Handover submitted ✓" : "MO Handover draft saved",
    );
    onSaved();
  }

  const vitalFields: Array<{
    key: keyof HandoverVitals;
    label: string;
    unit: string;
  }> = [
    { key: "bp", label: "BP", unit: "mmHg" },
    { key: "pulse", label: "Pulse", unit: "beats/min" },
    { key: "temp", label: "Temp", unit: "°C" },
    { key: "spo2", label: "SpO₂", unit: "%" },
    { key: "rr", label: "RR", unit: "breaths/min" },
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-5">
      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
        <Stethoscope className="w-4 h-4" /> Medical Officer Handover —{" "}
        {patientName}
      </h3>

      {/* Vitals */}
      <div>
        <Label className="text-xs font-semibold text-blue-700 mb-1.5 block">
          Current Vitals (auto-pulled)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {vitalFields.map(({ key, label, unit }) => (
            <div key={key}>
              <Label className="text-xs text-gray-500">
                {label} ({unit})
              </Label>
              <Input
                value={vitals[key]}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, [key]: e.target.value }))
                }
                placeholder={label}
                className="mt-1 bg-white"
                data-ocid={`handover.mo.vitals.${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Active medications (read-only summary) */}
      {medications.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-blue-700 mb-1.5 block">
            Active Plan / Medications
          </Label>
          <div className="space-y-1">
            {medications.map((med, i) => (
              <div
                key={`mo-med-${i}-${med.drugName}`}
                className="text-xs bg-white rounded-lg border border-blue-100 px-3 py-1.5 flex gap-3"
              >
                <span className="font-medium text-gray-800 flex-1">
                  {med.drugName}
                </span>
                <span className="text-gray-500">{med.dose}</span>
                <span className="text-gray-400">{med.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending investigations (read-only) */}
      {pendingInvestigations.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-blue-700 mb-1.5 block">
            Pending Investigations
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {pendingInvestigations.map((inv) => (
              <span
                key={inv}
                className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full"
              >
                {inv}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending Procedures */}
      <div>
        <Label className="text-xs font-semibold text-blue-700 mb-1.5 block">
          Pending Procedures
        </Label>
        <div className="space-y-1.5">
          {pendingProcedures.map((proc, i) => (
            <div key={`mo-proc-${i}-${proc}`} className="flex gap-2">
              <Input
                value={proc}
                onChange={(e) => {
                  const updated = [...pendingProcedures];
                  updated[i] = e.target.value;
                  setPendingProcedures(updated);
                }}
                placeholder="Procedure"
                className="bg-white text-sm"
                data-ocid="handover.mo.pending_proc.input"
              />
              <button
                type="button"
                onClick={() =>
                  setPendingProcedures((p) => p.filter((_, j) => j !== i))
                }
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-blue-300 text-blue-700 bg-white"
            onClick={() => setPendingProcedures((p) => [...p, ""])}
            data-ocid="handover.mo.add_procedure"
          >
            <Plus className="w-3 h-3" /> Add Procedure
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-xs font-semibold text-blue-700 mb-1">
          Handover Summary / Notes (auto-generated, editable)
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="bg-white border-blue-200 font-mono text-sm"
          data-ocid="handover.mo.notes"
        />
      </div>

      {/* Other Pending */}
      <div>
        <Label className="text-xs font-semibold text-blue-700 mb-1">
          Other Pending Items
        </Label>
        <Textarea
          value={otherPending}
          onChange={(e) => setOtherPending(e.target.value)}
          placeholder="Any other pending tasks..."
          rows={2}
          className="bg-white border-blue-200"
          data-ocid="handover.mo.other_pending"
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700"
          onClick={() => save(false)}
          data-ocid="handover.mo.save_draft_button"
        >
          Save Draft
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          onClick={() => save(true)}
          data-ocid="handover.mo.submit_button"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Submit Handover
        </Button>
      </div>
    </div>
  );
}

// ── Handover Record (read-only view with comments) ─────────────────────────────

interface HandoverRecordProps {
  entry: HandoverEntry;
  canComment: boolean;
  commentAuthorRole: StaffRole;
  onAddComment: (entryId: string, comment: string) => void;
  onAddConsultantNotes?: (entryId: string, notes: string) => void;
  onAddToDailyProgress?: (entryId: string) => void;
}

function HandoverRecord({
  entry,
  canComment,
  commentAuthorRole,
  onAddComment,
  onAddConsultantNotes,
  onAddToDailyProgress,
}: HandoverRecordProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [consultantNotesText, setConsultantNotesText] = useState(
    entry.consultantNotes ?? "",
  );
  const [showConsultantPanel, setShowConsultantPanel] = useState(false);

  const isConsultant =
    commentAuthorRole === "consultant_doctor" || commentAuthorRole === "doctor";

  function submitComment() {
    if (!commentText.trim()) return;
    onAddComment(entry.id, commentText.trim());
    setCommentText("");
  }

  function submitConsultantNotes() {
    if (!consultantNotesText.trim()) return;
    onAddConsultantNotes?.(entry.id, consultantNotesText.trim());
    setShowConsultantPanel(false);
  }

  return (
    <div
      className={`rounded-xl border shadow-sm overflow-hidden ${
        entry.type === "nurse"
          ? "border-purple-200 bg-white"
          : "border-blue-200 bg-white"
      }`}
      data-ocid="handover.record_item"
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          entry.type === "nurse"
            ? "bg-purple-50 hover:bg-purple-100"
            : "bg-blue-50 hover:bg-blue-100"
        }`}
        data-ocid="handover.record_toggle"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              entry.type === "nurse"
                ? "bg-purple-100 text-purple-800 border-purple-300"
                : "bg-blue-100 text-blue-800 border-blue-300"
            }`}
          >
            {entry.type === "nurse" ? "🩺 Nurse" : "👨‍⚕️ MO"}
          </span>
          {entry.type === "nurse" && <ShiftBadge shift={entry.shift} />}
          <span className="text-sm font-medium text-gray-700">
            {format(new Date(entry.createdAt), "MMM d, yyyy — HH:mm")}
          </span>
          <span className="text-xs text-gray-500">by {entry.createdBy}</span>
          <span className="text-xs text-gray-400">
            ({STAFF_ROLE_LABELS[entry.createdByRole] ?? entry.createdByRole})
          </span>
          {entry.type === "nurse" && entry.handoverTo && (
            <span className="text-xs text-gray-500">→ {entry.handoverTo}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={entry.status} />
          {entry.comments.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
              {entry.comments.length} comment
              {entry.comments.length > 1 ? "s" : ""}
            </span>
          )}
          {entry.consultantNotes && (
            <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full font-semibold">
              Consultant note
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Vitals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "BP", value: entry.vitals.bp, unit: "mmHg" },
              { label: "Pulse", value: entry.vitals.pulse, unit: "beats/min" },
              { label: "Temp", value: entry.vitals.temp, unit: "°C" },
              { label: "SpO₂", value: entry.vitals.spo2, unit: "%" },
              { label: "RR", value: entry.vitals.rr, unit: "breaths/min" },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center"
              >
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-bold text-sm text-gray-800">
                  {value || "—"}
                </p>
                <p className="text-xs font-bold text-gray-500">{unit}</p>
              </div>
            ))}
          </div>

          {/* Medications */}
          {entry.medications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Active Medications
              </p>
              <div className="space-y-1">
                {entry.medications.map((med, i) => (
                  <div
                    key={`r-med-${i}-${med.drugName}`}
                    className="text-xs bg-indigo-50 rounded-lg px-3 py-1.5 flex gap-3 border border-indigo-100"
                  >
                    <span className="font-medium text-indigo-800 flex-1">
                      {med.drugName}
                    </span>
                    <span className="text-indigo-600">{med.dose}</span>
                    <span className="text-indigo-400">{med.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entry.pendingTasks.pendingInvestigations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Pending Investigations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.pendingTasks.pendingInvestigations.map((inv) => (
                    <span
                      key={inv}
                      className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full"
                    >
                      {inv}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {entry.pendingTasks.pendingProcedures.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Pending Procedures
                </p>
                <ul className="space-y-0.5">
                  {entry.pendingTasks.pendingProcedures.map((proc) => (
                    <li
                      key={proc}
                      className="text-xs text-gray-700 flex items-start gap-1.5"
                    >
                      <span className="text-gray-400 mt-0.5">•</span> {proc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {entry.pendingTasks.otherPending && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Other Pending
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
                {entry.pendingTasks.otherPending}
              </p>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                {entry.type === "nurse"
                  ? "Nursing Notes"
                  : "MO Handover Summary"}
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 whitespace-pre-line">
                {entry.notes}
              </p>
            </div>
          )}

          {/* Submission info */}
          {entry.status === "submitted" && entry.submittedAt && (
            <p className="text-xs text-gray-400">
              ✅ Submitted at{" "}
              {format(new Date(entry.submittedAt), "MMM d, yyyy HH:mm")}
            </p>
          )}

          {/* Consultant notes (MO handover) */}
          {entry.type === "mo" && entry.consultantNotes && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-xs font-bold text-purple-700 mb-1">
                👨‍⚕️ Consultant Directive
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-line">
                {entry.consultantNotes}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                — {entry.consultantNotesBy} ·{" "}
                {entry.consultantNotesAt
                  ? format(new Date(entry.consultantNotesAt), "MMM d HH:mm")
                  : ""}
              </p>
              {entry.addedToDailyProgress && (
                <Badge className="mt-2 text-xs border-0 bg-green-100 text-green-700">
                  ✓ Added to Daily Progress
                </Badge>
              )}
            </div>
          )}

          {/* Consultant: Finalize & Add Notes panel (MO handover only) */}
          {entry.type === "mo" &&
            entry.status === "submitted" &&
            isConsultant && (
              <div className="border-t border-gray-100 pt-3">
                {!showConsultantPanel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-purple-300 text-purple-700"
                    onClick={() => setShowConsultantPanel(true)}
                    data-ocid="handover.consultant.finalize_button"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Finalize & Add Notes
                  </Button>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-purple-800">
                      Consultant Clinical Directives
                    </p>
                    <Textarea
                      value={consultantNotesText}
                      onChange={(e) => setConsultantNotesText(e.target.value)}
                      placeholder='e.g., "Increase IV rate to 80 mL/hr. Check K⁺ in the morning. Continue antibiotics."'
                      rows={3}
                      className="bg-white border-purple-200"
                      data-ocid="handover.consultant.notes_input"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={submitConsultantNotes}
                        data-ocid="handover.consultant.save_notes_button"
                      >
                        Save Notes
                      </Button>
                      {onAddToDailyProgress && !entry.addedToDailyProgress && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-700"
                          onClick={() => onAddToDailyProgress(entry.id)}
                          data-ocid="handover.consultant.add_to_progress_button"
                        >
                          + Add to Daily Progress
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConsultantPanel(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Comments section */}
          <div className="border-t border-gray-100 pt-3 space-y-3">
            {entry.comments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Comments
                </p>
                {entry.comments.map((c, i) => (
                  <div
                    key={`cmt-${i}-${c.commentAt}`}
                    className="bg-amber-50 border border-amber-100 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-800">
                        {c.commentBy}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({STAFF_ROLE_LABELS[c.commentByRole] ?? c.commentByRole}
                        )
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {format(new Date(c.commentAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment (consultant doctor only) */}
            {canComment && entry.status === "submitted" && (
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  data-ocid="handover.add_comment_input"
                />
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  onClick={submitComment}
                  data-ocid="handover.add_comment_button"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main HandoverSystem component ──────────────────────────────────────────────

export interface HandoverSystemProps {
  patientId: string;
  patientName: string;
  bed: string;
  ward: string;
  viewerRole: StaffRole;
  authorName: string;
  latestVitals: Record<string, string> | null;
  /** Active medications from latest prescriptions */
  activeMedications: Array<{
    drugName: string;
    dose: string;
    frequency: string;
  }>;
  /** Active diagnoses from daily progress */
  activeDiagnoses: string[];
  /** Latest plan text from daily progress */
  latestPlan: string;
}

export default function HandoverSystem({
  patientId,
  patientName,
  bed,
  ward,
  viewerRole,
  authorName,
  latestVitals,
  activeMedications,
  activeDiagnoses,
  latestPlan,
}: HandoverSystemProps) {
  const [entries, setEntries] = useState<HandoverEntry[]>(() =>
    loadHandovers(patientId),
  );
  const [showNurseForm, setShowNurseForm] = useState(false);
  const [showMOForm, setShowMOForm] = useState(false);

  const trackedInvestigations = useMemo(
    () => loadTrackedInvestigations(patientId),
    [patientId],
  );

  const isNurse = viewerRole === "nurse";
  const isMO = viewerRole === "medical_officer";
  const isConsultant =
    viewerRole === "consultant_doctor" || viewerRole === "doctor";
  const canSeeHandovers = isNurse || isMO || isConsultant;

  // Find existing nurse draft for current user (only one draft per shift per nurse allowed)
  const existingNurseDraft = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return (
      entries.find(
        (e) =>
          e.type === "nurse" &&
          e.status === "draft" &&
          e.createdBy === authorName &&
          e.date === today,
      ) ?? null
    );
  }, [entries, authorName]);

  const existingMODraft = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return (
      entries.find(
        (e) =>
          e.type === "mo" &&
          e.status === "draft" &&
          e.createdBy === authorName &&
          e.date === today,
      ) ?? null
    );
  }, [entries, authorName]);

  function refresh() {
    setEntries(loadHandovers(patientId));
    setShowNurseForm(false);
    setShowMOForm(false);
  }

  function handleAddComment(entryId: string, comment: string) {
    const all = loadHandovers(patientId);
    const idx = all.findIndex((h) => h.id === entryId);
    if (idx < 0) return;
    all[idx].comments.push({
      comment,
      commentBy: authorName,
      commentByRole: viewerRole,
      commentAt: new Date().toISOString(),
    });
    saveHandovers(patientId, all);
    setEntries([...all]);
    toast.success("Comment added");
  }

  function handleAddConsultantNotes(entryId: string, notes: string) {
    const all = loadHandovers(patientId);
    const idx = all.findIndex((h) => h.id === entryId);
    if (idx < 0) return;
    all[idx].consultantNotes = notes;
    all[idx].consultantNotesBy = authorName;
    all[idx].consultantNotesAt = new Date().toISOString();
    saveHandovers(patientId, all);
    setEntries([...all]);
    toast.success("Consultant notes saved");
  }

  function handleAddToDailyProgress(entryId: string) {
    const all = loadHandovers(patientId);
    const idx = all.findIndex((h) => h.id === entryId);
    if (idx < 0) return;
    const entry = all[idx];
    // Append consultant notes to today's daily note plan section
    const today = format(new Date(), "yyyy-MM-dd");
    const dailyNoteKey = `daily_note_default_${patientId}_${today}`;
    try {
      const raw = localStorage.getItem(dailyNoteKey);
      const note = raw ? JSON.parse(raw) : { planItems: [], assessment: "" };
      const noteContent = entry.consultantNotes ?? "";
      note.planItems = [
        ...(note.planItems ?? []),
        {
          id: `consultant_${Date.now().toString(36)}`,
          category: "procedure",
          description: `Consultant directive: ${noteContent}`,
        },
      ];
      localStorage.setItem(dailyNoteKey, JSON.stringify(note));
    } catch {}
    all[idx].addedToDailyProgress = true;
    saveHandovers(patientId, all);
    setEntries([...all]);
    toast.success("Consultant notes added to Daily Progress note ✓");
  }

  if (!canSeeHandovers) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-violet-100">
        <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">
          Handover records are visible to clinical staff only (Nurse, Medical
          Officer, Consultant Doctor).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-violet-600" />
            Handover System
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Shift-based clinical handovers — submitted records are locked and
            immutable
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isNurse && (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              onClick={() => {
                setShowMOForm(false);
                setShowNurseForm(!showNurseForm);
              }}
              data-ocid="handover.new_nurse_button"
            >
              <Plus className="w-3.5 h-3.5" />
              {existingNurseDraft ? "Edit Draft" : "New Handover"}
            </Button>
          )}
          {isMO && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={() => {
                setShowNurseForm(false);
                setShowMOForm(!showMOForm);
              }}
              data-ocid="handover.make_handover_button"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              {existingMODraft ? "Edit Draft" : "Make Handover"}
            </Button>
          )}
        </div>
      </div>

      {/* Nurse handover form */}
      {isNurse && showNurseForm && (
        <NurseHandoverForm
          patientId={patientId}
          patientName={patientName}
          bed={bed}
          ward={ward}
          authorName={authorName}
          authorRole={viewerRole}
          existingEntry={existingNurseDraft}
          latestVitals={latestVitals}
          activeMedications={activeMedications}
          trackedInvestigations={trackedInvestigations}
          onSaved={refresh}
        />
      )}

      {/* MO handover form */}
      {isMO && showMOForm && (
        <MOHandoverForm
          patientId={patientId}
          patientName={patientName}
          authorName={authorName}
          authorRole={viewerRole}
          existingEntry={existingMODraft}
          latestVitals={latestVitals}
          activeMedications={activeMedications}
          trackedInvestigations={trackedInvestigations}
          activeDiagnoses={activeDiagnoses}
          latestPlan={latestPlan}
          onSaved={refresh}
        />
      )}

      {/* Timeline of handovers */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div
            className="text-center py-10 bg-white rounded-xl border border-violet-100"
            data-ocid="handover.empty_state"
          >
            <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 mb-1">
              No handovers yet
            </p>
            <p className="text-xs text-gray-400">
              {isNurse
                ? 'Click "New Handover" to create the first handover for this shift.'
                : isMO
                  ? 'Click "Make Handover" to auto-generate an MO handover.'
                  : "Handovers will appear here once submitted by nursing or medical staff."}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <HandoverRecord
              key={entry.id}
              entry={entry}
              canComment={isConsultant}
              commentAuthorRole={viewerRole}
              onAddComment={handleAddComment}
              onAddConsultantNotes={
                isConsultant ? handleAddConsultantNotes : undefined
              }
              onAddToDailyProgress={
                isConsultant ? handleAddToDailyProgress : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
