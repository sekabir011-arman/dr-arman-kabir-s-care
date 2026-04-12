/**
 * DischargeSummaryTab — auto-generated discharge summary for admitted patients.
 * Pulls data from encounters, clinical notes, prescriptions, and investigations.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  CheckSquare,
  ClipboardCheck,
  Download,
  Printer,
  Square,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  ClinicalNote,
  Encounter,
  Patient,
  Prescription,
  Visit,
} from "../types";

interface Props {
  patient: Patient;
  visits: Visit[];
  prescriptions: Prescription[];
  encounters: Encounter[];
  clinicalNotes: ClinicalNote[];
  canApproveDischarge: boolean;
  onApproveDischarge?: () => void;
}

interface ChecklistItem {
  label: string;
  key: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { label: "Medications written", key: "meds" },
  { label: "Advice given", key: "advice" },
  { label: "Follow-up appointment booked", key: "followup" },
  { label: "Patient educated", key: "educated" },
];

function formatDate(ts: bigint) {
  return format(new Date(Number(ts / 1_000_000n)), "d MMM yyyy");
}

export default function DischargeSummaryTab({
  patient,
  visits,
  prescriptions,
  encounters,
  clinicalNotes,
  canApproveDischarge,
  onApproveDischarge,
}: Props) {
  const sortedVisits = [...visits].sort((a, b) =>
    Number(b.visitDate - a.visitDate),
  );
  const latestVisit = sortedVisits[0] ?? null;
  const latestRx = prescriptions.length
    ? [...prescriptions].sort((a, b) =>
        Number(b.prescriptionDate - a.prescriptionDate),
      )[0]
    : null;

  const activeEncounter =
    encounters.find((e) => e.status === "InProgress") ?? encounters[0];

  const age = patient.dateOfBirth
    ? Math.floor(
        (Date.now() - Number(patient.dateOfBirth / 1_000_000n)) /
          (365.25 * 24 * 3600 * 1000),
      )
    : null;

  // Build hospital course from SOAP notes
  const soapNotes = clinicalNotes
    .filter((n) => n.noteType === "SOAP" || n.noteType === "DailyProgress")
    .slice(0, 5);

  // Get investigation rows
  function getInvRows(): Array<{
    date: string;
    name: string;
    result: string;
    unit?: string;
  }> {
    const rows: Array<{
      date: string;
      name: string;
      result: string;
      unit?: string;
    }> = [];
    for (const v of sortedVisits) {
      try {
        const doctorEmail = (() => {
          try {
            const raw = localStorage.getItem("staff_auth");
            if (raw)
              return (JSON.parse(raw) as { email?: string }).email ?? "default";
          } catch {}
          return "default";
        })();
        const raw = localStorage.getItem(
          `visit_form_data_${v.id}_${doctorEmail}`,
        );
        if (!raw) continue;
        const data = JSON.parse(raw) as {
          previous_investigation_rows?: typeof rows;
        };
        if (Array.isArray(data.previous_investigation_rows)) {
          rows.push(...data.previous_investigation_rows.slice(0, 3));
        }
      } catch {}
    }
    return rows.slice(0, 6);
  }

  const invRows = getInvRows();

  // Generate auto-text sections
  const [diagnosisSummary, setDiagnosisSummary] = useState(
    latestVisit?.diagnosis ??
      activeEncounter?.locationNotes ??
      "Diagnosis not recorded",
  );
  const [proceduresText, setProceduresText] = useState(
    "No major procedures documented.",
  );
  const [hospitalCourse, setHospitalCourse] = useState(
    soapNotes.length > 0
      ? soapNotes
          .map((n) => {
            try {
              const parsed = JSON.parse(n.content) as {
                subjective?: string;
                assessment?: string;
              };
              return `${format(new Date(Number(n.createdAt / 1_000_000n)), "d MMM")}: ${parsed.subjective || parsed.assessment || n.content.slice(0, 80)}`;
            } catch {
              return `${format(new Date(Number(n.createdAt / 1_000_000n)), "d MMM")}: ${n.content.slice(0, 80)}`;
            }
          })
          .join(". ")
      : `Patient admitted ${activeEncounter ? `on ${formatDate(activeEncounter.startDate)}` : ""}. ${latestVisit?.chiefComplaint ? `Presenting complaint: ${latestVisit.chiefComplaint}.` : ""} Clinical course under review.`,
  );
  const [followUpDate, setFollowUpDate] = useState("");
  const [adviceText, setAdviceText] = useState(
    latestRx?.notes ??
      "Continue prescribed medications. Maintain follow-up schedule.",
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    meds: !!latestRx?.medications.length,
    advice: true,
    followup: false,
    educated: true,
  });

  const toggleCheck = (key: string) =>
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

  function printSummary() {
    const meds = latestRx?.medications.length
      ? latestRx.medications
          .map((m, i) => {
            const form =
              ((m as Record<string, unknown>).drugForm as string) ?? "";
            const name =
              ((m as Record<string, unknown>).drugName as string) || m.name;
            const line1 = `${i + 1}. ${form} ${name} ${m.dose}`.trim();
            const line2 = `&nbsp;&nbsp;${m.frequency} – ${m.duration}${m.instructions ? ` – ${m.instructions}` : ""}`;
            return `<p style="margin:2px 0 6px 12px">${line1}<br/><small style="color:#555">${line2}</small></p>`;
          })
          .join("")
      : "<p>No medications</p>";

    const invTable = invRows.length
      ? `<table border="1" cellpadding="5" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:10pt">
          <thead><tr style="background:#f0f9ff"><th>Date</th><th>Investigation</th><th>Result</th><th>Unit</th></tr></thead>
          <tbody>${invRows.map((r) => `<tr><td>${r.date}</td><td>${r.name}</td><td>${r.result}</td><td>${r.unit ?? "—"}</td></tr>`).join("")}</tbody>
        </table>`
      : "<p>No investigations recorded</p>";

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Discharge Summary - ${patient.fullName}</title>
      <style>body{font-family:Georgia,serif;font-size:11pt;padding:24px;max-width:800px;margin:0 auto}h1{font-size:16pt;color:#0f766e;margin-bottom:4px}h2{font-size:12pt;color:#374151;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{margin:4px 0;line-height:1.5}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f9f9f9}</style></head>
      <body>
        <h1>Discharge Summary</h1>
        <p><strong>Patient:</strong> ${patient.fullName} | <strong>Reg No:</strong> ${((patient as Record<string, unknown>).registerNumber as string) ?? "—"} | <strong>Age/Sex:</strong> ${age ?? "—"} yrs / ${patient.gender}</p>
        <p><strong>Admission Date:</strong> ${activeEncounter ? formatDate(activeEncounter.startDate) : "—"} | <strong>Discharge Date:</strong> ${new Date().toLocaleDateString()}</p>
        <h2>1. Diagnosis</h2><p>${diagnosisSummary}</p>
        <h2>2. Procedures</h2><p>${proceduresText}</p>
        <h2>3. Hospital Course</h2><p>${hospitalCourse}</p>
        <h2>4. Discharge Medications</h2>${meds}
        <h2>5. Key Investigations</h2>${invTable}
        <h2>6. Follow-up</h2><p>${followUpDate ? `Follow-up date: ${followUpDate}` : "Follow-up date to be arranged."}</p>
        <h2>7. Advice</h2><p>${adviceText}</p>
        <div style="margin-top:40px;display:flex;justify-content:space-between">
          <div><p>_____________________</p><p>Doctor's Signature &amp; Stamp</p></div>
          <div><p>_____________________</p><p>Date</p></div>
        </div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    toast.success("Discharge summary printed");
  }

  return (
    <div className="space-y-4 p-4" data-ocid="discharge_summary.panel">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            Discharge Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-generated — edit before printing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={printSummary}
            data-ocid="discharge_summary.print_button"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          {canApproveDischarge && (
            <Button
              size="sm"
              className="gap-1.5 bg-teal-600 hover:bg-teal-700"
              onClick={onApproveDischarge}
              data-ocid="discharge_summary.approve_button"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Approve Discharge
            </Button>
          )}
        </div>
      </div>

      {/* Patient info row */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-y-1 text-xs">
        <div>
          <span className="text-gray-500">Patient:</span>{" "}
          <span className="font-semibold">{patient.fullName}</span>
        </div>
        <div>
          <span className="text-gray-500">Age/Sex:</span>{" "}
          <span className="font-semibold">
            {age ?? "—"} yrs / {patient.gender}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Reg No:</span>{" "}
          <span className="font-mono font-semibold">
            {((patient as Record<string, unknown>).registerNumber as string) ??
              "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Admission:</span>{" "}
          <span className="font-semibold">
            {activeEncounter ? formatDate(activeEncounter.startDate) : "—"}
          </span>
        </div>
      </div>

      {/* Sections */}
      {[
        {
          label: "1. Diagnosis Summary",
          value: diagnosisSummary,
          setter: setDiagnosisSummary,
          color: "border-l-blue-400",
          key: "diagnosis",
        },
        {
          label: "2. Procedures Performed",
          value: proceduresText,
          setter: setProceduresText,
          color: "border-l-purple-400",
          key: "procedures",
        },
        {
          label: "3. Hospital Course",
          value: hospitalCourse,
          setter: setHospitalCourse,
          color: "border-l-amber-400",
          key: "course",
          multiline: true,
        },
      ].map((section) => (
        <div key={section.key} className={`border-l-4 pl-3 ${section.color}`}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            {section.label}
          </p>
          {section.multiline ? (
            <textarea
              className="w-full text-sm text-gray-800 border border-input rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-background"
              rows={3}
              value={section.value}
              onChange={(e) => section.setter(e.target.value)}
              data-ocid={`discharge_summary.${section.key}.input`}
            />
          ) : (
            <input
              className="w-full text-sm text-gray-800 border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-background"
              value={section.value}
              onChange={(e) => section.setter(e.target.value)}
              data-ocid={`discharge_summary.${section.key}.input`}
            />
          )}
        </div>
      ))}

      {/* Discharge Medications */}
      <div className="border-l-4 border-l-teal-400 pl-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          4. Discharge Medications
        </p>
        {latestRx?.medications.length ? (
          <div className="space-y-1.5">
            {latestRx.medications.map((m, i) => (
              <div
                key={`${m.name}-${i}`}
                className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-semibold">
                  {i + 1}.{" "}
                  {((m as Record<string, unknown>).drugForm as string) ?? ""}{" "}
                  {((m as Record<string, unknown>).drugName as string) ||
                    m.name}{" "}
                  {m.dose}
                </span>
                <span className="text-gray-500 ml-2">
                  — {m.frequency} × {m.duration}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No active medications.
          </p>
        )}
      </div>

      {/* Key Investigations */}
      {invRows.length > 0 && (
        <div className="border-l-4 border-l-amber-400 pl-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            5. Key Investigations
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50">
                  {["Date", "Investigation", "Result", "Unit"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-1.5 px-2 text-amber-700 font-semibold border border-amber-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invRows.map((r, i) => (
                  <tr
                    key={`${r.name}-${i}`}
                    className={i % 2 === 0 ? "bg-white" : "bg-amber-50/30"}
                  >
                    <td className="py-1 px-2 border border-amber-100">
                      {r.date || "—"}
                    </td>
                    <td className="py-1 px-2 border border-amber-100 font-medium">
                      {r.name}
                    </td>
                    <td className="py-1 px-2 border border-amber-100">
                      {r.result}
                    </td>
                    <td className="py-1 px-2 border border-amber-100">
                      {r.unit ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Follow-up Plan */}
      <div className="border-l-4 border-l-indigo-400 pl-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
          6. Follow-up Plan
        </p>
        <input
          type="date"
          className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-background"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          data-ocid="discharge_summary.followup.input"
        />
        {followUpDate && (
          <p className="text-xs text-teal-700 mt-1 font-medium">
            Follow-up on {format(new Date(followUpDate), "d MMMM yyyy")}
          </p>
        )}
      </div>

      {/* Advice */}
      <div className="border-l-4 border-l-emerald-400 pl-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
          7. Advice
        </p>
        <textarea
          className="w-full text-sm text-gray-800 border border-input rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-background"
          rows={2}
          value={adviceText}
          onChange={(e) => setAdviceText(e.target.value)}
          data-ocid="discharge_summary.advice.input"
        />
      </div>

      {/* Checklist */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
          Discharge Checklist
        </p>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="flex items-center gap-2.5 w-full text-left"
              onClick={() => toggleCheck(item.key)}
              data-ocid={`discharge_summary.checklist.${item.key}`}
            >
              {checklist[item.key] ? (
                <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${checklist[item.key] ? "text-teal-700 line-through opacity-70" : "text-gray-700"}`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <Badge
            className={`${
              Object.values(checklist).every(Boolean)
                ? "bg-teal-100 text-teal-700"
                : "bg-amber-100 text-amber-700"
            } border-0`}
          >
            {Object.values(checklist).filter(Boolean).length}/
            {CHECKLIST_ITEMS.length} complete
          </Badge>
        </div>
      </div>
    </div>
  );
}
