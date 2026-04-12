/**
 * MissedDoseReport — medication administration report for Consultant Doctor and MO.
 * Shows all medications for a patient with Given / Not Given / Delayed status.
 * Accessible from patient profile Prescriptions tab.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Pill,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { MedAdminRecord } from "./NurseDueMeds";
import { loadMedAdminRecords } from "./NurseDueMeds";

interface MissedDoseReportProps {
  patientId: string;
  patientName: string;
  admissionDate?: string; // ISO string
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function MissedDoseReport({
  patientId,
  patientName,
  admissionDate,
}: MissedDoseReportProps) {
  const today = new Date().toISOString().split("T")[0];
  const defaultStart = admissionDate?.split("T")[0] ?? today;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [filterTab, setFilterTab] = useState<
    "all" | "given" | "not_given" | "delayed"
  >("all");

  const allRecords = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    const records: MedAdminRecord[] = [];
    for (const d of dates) {
      records.push(...loadMedAdminRecords(patientId, d));
    }
    return records.sort((a, b) => {
      // Sort by date then scheduled time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [patientId, startDate, endDate]);

  const filtered = useMemo(() => {
    if (filterTab === "all") return allRecords;
    return allRecords.filter((r) => r.status === filterTab);
  }, [allRecords, filterTab]);

  const missedCount = allRecords.filter((r) => r.status === "not_given").length;
  const delayedCount = allRecords.filter((r) => r.status === "delayed").length;
  const givenCount = allRecords.filter((r) => r.status === "given").length;

  // Check for ≥2 consecutive missed doses for same drug
  const consecutiveMissed = useMemo(() => {
    const byDrug: Record<string, MedAdminRecord[]> = {};
    for (const r of allRecords) {
      if (!byDrug[r.drugName]) byDrug[r.drugName] = [];
      byDrug[r.drugName].push(r);
    }
    const alerts: string[] = [];
    for (const [drug, records] of Object.entries(byDrug)) {
      const notGiven = records.filter((r) => r.status === "not_given");
      if (notGiven.length >= 2) {
        alerts.push(`${drug} (${notGiven.length}x not given)`);
      }
    }
    return alerts;
  }, [allRecords]);

  function exportReport() {
    const header = [
      "Medication Administration Report",
      `Patient: ${patientName}`,
      `Period: ${startDate} to ${endDate}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Drug Name | Dose | Date | Scheduled Time | Status | Recorded By",
      "─".repeat(80),
    ];
    const rows = allRecords.map(
      (r) =>
        `${r.drugName} | ${r.dose || "—"} | ${r.date} | ${r.scheduledTime} | ${r.status.toUpperCase()} | ${r.recordedBy} (${r.recordedByRole})`,
    );
    const summary = [
      "",
      `Summary: Given: ${givenCount} | Not Given: ${missedCount} | Delayed: ${delayedCount}`,
    ];
    const lines = [...header, ...rows, ...summary];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MedAdmin_${patientName.replace(/\s/g, "_")}_${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4" data-ocid="missed_dose_report.container">
      {/* Alert for consecutive missed doses */}
      {consecutiveMissed.length > 0 && (
        <div
          className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
          data-ocid="missed_dose_report.alert"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Consecutive Missed Dose Alert
            </p>
            <p className="text-xs text-red-700 mt-1">
              The following drugs have been missed 2+ consecutive times:{" "}
              {consecutiveMissed.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-700">{givenCount}</p>
          <p className="text-xs text-green-600">Given</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-700">{missedCount}</p>
          <p className="text-xs text-red-600">Not Given</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-orange-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-700">{delayedCount}</p>
          <p className="text-xs text-orange-600">Delayed</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label
            htmlFor="mdr-start"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="mdr-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-xs w-36"
            data-ocid="missed_dose_report.start_date"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="mdr-end"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="mdr-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-xs w-36"
            data-ocid="missed_dose_report.end_date"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={exportReport}
          className="h-8 gap-1.5 text-xs"
          data-ocid="missed_dose_report.export_button"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={filterTab}
        onValueChange={(v) => setFilterTab(v as typeof filterTab)}
      >
        <TabsList className="h-8">
          <TabsTrigger
            value="all"
            className="text-xs h-7"
            data-ocid="missed_dose_report.tab.all"
          >
            All ({allRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="given"
            className="text-xs h-7"
            data-ocid="missed_dose_report.tab.given"
          >
            Given ({givenCount})
          </TabsTrigger>
          <TabsTrigger
            value="not_given"
            className="text-xs h-7"
            data-ocid="missed_dose_report.tab.not_given"
          >
            Not Given ({missedCount})
          </TabsTrigger>
          <TabsTrigger
            value="delayed"
            className="text-xs h-7"
            data-ocid="missed_dose_report.tab.delayed"
          >
            Delayed ({delayedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="mt-3">
          {filtered.length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground text-sm"
              data-ocid="missed_dose_report.empty_state"
            >
              <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No records found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Drug
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Dose
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Scheduled
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                      Recorded By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={`${r.drugName}-${r.date}-${r.scheduledTime}-${i}`}
                      className={cn(
                        "border-b border-border/50",
                        r.status === "given" && "bg-green-50/50",
                        r.status === "not_given" && "bg-red-50/50",
                        r.status === "delayed" && "bg-orange-50/50",
                      )}
                      data-ocid={`missed_dose_report.row.${i}`}
                    >
                      <td className="py-2 px-3 font-medium">{r.drugName}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.dose || "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.date}
                      </td>
                      <td className="py-2 px-3 font-mono">{r.scheduledTime}</td>
                      <td className="py-2 px-3">
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold",
                            r.status === "given" &&
                              "bg-green-100 text-green-700 border border-green-200",
                            r.status === "not_given" &&
                              "bg-red-100 text-red-700 border border-red-200",
                            r.status === "delayed" &&
                              "bg-orange-100 text-orange-700 border border-orange-200",
                            r.status === "pending" &&
                              "bg-muted text-muted-foreground border border-border",
                          )}
                        >
                          {r.status === "given"
                            ? "✅ Given"
                            : r.status === "not_given"
                              ? "❌ Not Given"
                              : r.status === "delayed"
                                ? "⏱ Delayed"
                                : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.recordedBy}{" "}
                        <span className="text-muted-foreground/60">
                          ({r.recordedByRole})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
