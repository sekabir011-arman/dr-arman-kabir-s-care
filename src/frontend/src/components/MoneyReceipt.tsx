/**
 * MoneyReceipt — Reusable printable/downloadable money receipt component.
 * Used for Appointment receipts and Procedure receipts.
 * Print: window.print() with CSS @media print
 * PDF: html2canvas → canvas.toDataURL() → download as image
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Download, Printer, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { MoneyReceiptData } from "../types";

// ── Storage helpers ───────────────────────────────────────────────────────────

const RECEIPTS_KEY = "clinic_receipts";

export function loadReceipts(): MoneyReceiptData[] {
  try {
    return JSON.parse(localStorage.getItem(RECEIPTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveReceiptToStore(receipt: MoneyReceiptData) {
  const all = loadReceipts();
  const exists = all.findIndex((r) => r.id === receipt.id);
  if (exists >= 0) {
    all[exists] = receipt;
  } else {
    all.unshift(receipt);
  }
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
}

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const all = loadReceipts();
  const yearReceipts = all.filter((r) => r.receiptNumber.includes(`${year}`));
  const next = yearReceipts.length + 1;
  return `REC-${year}-${String(next).padStart(4, "0")}`;
}

// ── Receipt Dialog ────────────────────────────────────────────────────────────

interface MoneyReceiptProps {
  initialData: Omit<MoneyReceiptData, "id" | "receiptNumber"> & {
    id?: string;
    receiptNumber?: string;
  };
  onClose: () => void;
}

export default function MoneyReceipt({
  initialData,
  onClose,
}: MoneyReceiptProps) {
  const [data, setData] = useState<MoneyReceiptData>(() => {
    const id =
      initialData.id ||
      Date.now().toString(36) + Math.random().toString(36).slice(2);
    const receiptNumber = initialData.receiptNumber || generateReceiptNumber();
    return { ...initialData, id, receiptNumber };
  });
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    saveReceiptToStore(data);
    toast.success(`Receipt ${data.receiptNumber} saved`);
  }

  function handlePrint() {
    handleSave();
    window.print();
  }

  async function handleDownloadPDF() {
    if (!printRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `receipt-${data.receiptNumber}.png`;
      link.click();
      handleSave();
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not generate download. Please use Print instead.");
    } finally {
      setSaving(false);
    }
  }

  const isAppointment = data.type === "appointment";
  const titleEn = isAppointment ? "Appointment Receipt" : "Procedure Receipt";
  const titleBn = isAppointment ? "অ্যাপয়েন্টমেন্ট রসিদ" : "পদ্ধতি রসিদ";
  const serviceLabel = isAppointment ? "Service / সেবা" : "Procedure / পদ্ধতি";

  const formattedDate = new Date(data.date).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* ── Print-only styles injected globally ── */}
      <style>{`
        @media print {
          body > *:not(#receipt-print-root) { display: none !important; }
          #receipt-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
          .receipt-no-print { display: none !important; }
        }
      `}</style>

      {/* ── Modal Overlay ── */}
      <dialog
        open
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 receipt-no-print border-0 max-w-none w-full h-full m-0 p-4"
        aria-label="Money Receipt"
      >
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border receipt-no-print">
            <h2 className="font-bold text-foreground text-base">{titleEn}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              aria-label="Close receipt"
              data-ocid="receipt.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* ── Amount + Status editable fields ── */}
            <div className="grid grid-cols-2 gap-4 receipt-no-print">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Amount (টাকা / BDT)
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={data.amount || ""}
                  onChange={(e) =>
                    setData((d) => ({ ...d, amount: Number(e.target.value) }))
                  }
                  className="text-lg font-bold"
                  data-ocid="receipt.amount_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Payment Status / পেমেন্ট
                </Label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setData((d) => ({ ...d, paid: true }))}
                    className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                      data.paid
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-card text-muted-foreground border-border hover:border-emerald-400"
                    }`}
                    data-ocid="receipt.paid_toggle"
                  >
                    ✓ Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setData((d) => ({ ...d, paid: false }))}
                    className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                      !data.paid
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-card text-muted-foreground border-border hover:border-amber-400"
                    }`}
                    data-ocid="receipt.unpaid_toggle"
                  >
                    ⏳ Unpaid
                  </button>
                </div>
              </div>
            </div>
            {data.notes !== undefined && (
              <div className="space-y-1.5 receipt-no-print">
                <Label className="text-xs font-semibold">
                  Notes (optional)
                </Label>
                <Input
                  placeholder="Additional notes…"
                  value={data.notes || ""}
                  onChange={(e) =>
                    setData((d) => ({ ...d, notes: e.target.value }))
                  }
                  data-ocid="receipt.notes_input"
                />
              </div>
            )}

            {/* ── Printable receipt document ── */}
            <div id="receipt-print-root">
              <div
                ref={printRef}
                className="bg-white border-2 border-gray-200 rounded-xl p-8 relative overflow-hidden"
                style={{ fontFamily: "serif", minWidth: 420 }}
              >
                {/* Watermark */}
                {data.paid && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    aria-hidden="true"
                  >
                    <span
                      className="text-emerald-200 font-black select-none"
                      style={{
                        fontSize: 100,
                        transform: "rotate(-35deg)",
                        opacity: 0.18,
                        letterSpacing: 4,
                      }}
                    >
                      PAID
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-black text-lg">
                      A
                    </div>
                    <div>
                      <h1 className="font-black text-xl text-gray-900 tracking-tight">
                        Dr. Arman Kabir&apos;s Care
                      </h1>
                      <p className="text-xs text-gray-600">
                        Patient Management & Clinical Portal
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    University Dental College & Hospital, Moghbazar, Dhaka
                  </p>
                </div>

                {/* Receipt title */}
                <div className="text-center mb-5">
                  <h2 className="text-lg font-bold text-gray-800 uppercase tracking-widest">
                    {titleEn}
                  </h2>
                  <p className="text-sm text-gray-500">{titleBn}</p>
                </div>

                {/* Receipt meta row */}
                <div className="flex justify-between items-start mb-5 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold">Receipt No: </span>
                    <span className="font-mono text-gray-800">
                      {data.receiptNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">Date: </span>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Field grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
                  <ReceiptField
                    label="Patient Name / রোগীর নাম"
                    value={data.patientName}
                  />
                  <ReceiptField
                    label="Register No. / রেজিস্টার নং"
                    value={data.registerNumber || "—"}
                    mono
                  />
                  {data.phone && (
                    <ReceiptField label="Phone / ফোন" value={data.phone} />
                  )}
                  <ReceiptField
                    label="Doctor / ডাক্তার"
                    value={data.doctorName || "—"}
                  />
                  {isAppointment && data.serialNumber !== undefined && (
                    <ReceiptField
                      label="Serial No. / সিরিয়াল নং"
                      value={`#${data.serialNumber}`}
                    />
                  )}
                  <ReceiptField label={serviceLabel} value={data.service} />
                </div>

                {/* Amount box */}
                <div className="border-2 border-gray-800 rounded-lg p-4 mb-5 text-center">
                  <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
                    Total Amount / মোট পরিমাণ
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    ৳{" "}
                    {data.amount !== undefined && data.amount > 0
                      ? data.amount.toLocaleString("en-BD")
                      : "0"}
                  </p>
                  <div className="mt-2">
                    {data.paid ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-bold text-sm px-4 py-1 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PAID / পরিশোধিত
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 font-bold text-sm px-4 py-1 rounded-full border border-amber-300">
                        ⏳ UNPAID / অপরিশোধিত
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {data.notes && (
                  <p className="text-xs text-gray-600 italic mb-4 text-center">
                    Note: {data.notes}
                  </p>
                )}

                {/* Signature line */}
                <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-300">
                  <div className="text-center">
                    <div className="border-b border-gray-500 w-32 mb-1" />
                    <p className="text-xs text-gray-500">
                      Patient Signature / রোগীর স্বাক্ষর
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-500 w-32 mb-1" />
                    <p className="text-xs text-gray-500">
                      Authorized Signature / অনুমোদিত স্বাক্ষর
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-4">
                  This is a computer-generated receipt. — Dr. Arman Kabir&apos;s
                  Care
                </p>
              </div>
            </div>
          </div>

          {/* Modal footer actions */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border receipt-no-print">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="receipt.cancel_button"
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleDownloadPDF}
                disabled={saving}
                data-ocid="receipt.download_button"
              >
                <Download className="w-4 h-4" />
                {saving ? "Generating…" : "Download"}
              </Button>
              <Button
                className="gap-1.5 bg-primary hover:bg-primary/90"
                onClick={handlePrint}
                data-ocid="receipt.print_button"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────
function ReceiptField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`font-semibold text-gray-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ── Receipts History List ─────────────────────────────────────────────────────

export function ReceiptsHistoryList() {
  const [receipts, setReceipts] = useState<MoneyReceiptData[]>(() =>
    loadReceipts(),
  );
  const [viewing, setViewing] = useState<MoneyReceiptData | null>(null);

  function handleDelete(id: string) {
    const updated = receipts.filter((r) => r.id !== id);
    setReceipts(updated);
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(updated));
    toast.success("Receipt deleted");
  }

  if (receipts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
        data-ocid="receipts.empty_state"
      >
        <Download className="w-10 h-10 opacity-30" />
        <p className="font-medium">No receipts yet</p>
        <p className="text-sm">
          Generate a receipt from an appointment or procedure
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ocid="receipts.list">
      <p className="text-sm text-muted-foreground">
        {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} stored
        locally
      </p>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">
                Receipt #
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">
                Patient
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">
                Type
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">
                Service
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">
                Amount
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">
                Date
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r, idx) => (
              <tr
                key={r.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                data-ocid={`receipts.item.${idx + 1}`}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-primary font-semibold">
                    {r.receiptNumber}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {r.patientName}
                  {r.registerNumber && (
                    <p className="text-xs font-mono text-muted-foreground">
                      {r.registerNumber}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.type === "appointment"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {r.type === "appointment" ? "Appointment" : "Procedure"}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                  {r.service}
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  ৳{(r.amount || 0).toLocaleString("en-BD")}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {r.paid ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Paid
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {new Date(r.date).toLocaleDateString("en-BD", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => setViewing(r)}
                      data-ocid={`receipts.view_button.${idx + 1}`}
                    >
                      <Printer className="w-3 h-3" />
                      Reprint
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}
                      data-ocid={`receipts.delete_button.${idx + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <MoneyReceipt initialData={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
