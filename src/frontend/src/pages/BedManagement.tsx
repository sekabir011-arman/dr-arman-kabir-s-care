import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeftRight,
  Bed,
  CheckCircle2,
  LogOut,
  Plus,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  loadFromAllDoctorKeys,
  useAssignBed,
  useCreateBedRecord,
  useGetAllBeds,
} from "../hooks/useQueries";
import { getClinicalStore, saveClinicalStore } from "../lib/clinicalStore";
import type { BedRecord, Patient } from "../types";

// ── Seed demo beds if none exist ──────────────────────────────────────────────

function seedBedsIfEmpty() {
  const store = getClinicalStore();
  if ((store.beds as BedRecord[] | undefined)?.length) return;
  const seeds: BedRecord[] = [
    {
      id: 1n,
      bedNumber: "A-01",
      ward: "General",
      status: "Empty",
      transferHistory: [],
    },
    {
      id: 2n,
      bedNumber: "A-02",
      ward: "General",
      status: "Empty",
      transferHistory: [],
    },
    {
      id: 3n,
      bedNumber: "A-03",
      ward: "General",
      status: "Maintenance",
      transferHistory: [],
    },
    {
      id: 4n,
      bedNumber: "B-01",
      ward: "Medical",
      status: "Empty",
      transferHistory: [],
    },
    {
      id: 5n,
      bedNumber: "B-02",
      ward: "Medical",
      status: "Empty",
      transferHistory: [],
    },
    {
      id: 6n,
      bedNumber: "ICU-01",
      ward: "ICU",
      status: "Empty",
      transferHistory: [],
    },
    {
      id: 7n,
      bedNumber: "ICU-02",
      ward: "ICU",
      status: "Maintenance",
      transferHistory: [],
    },
    {
      id: 8n,
      bedNumber: "C-01",
      ward: "Surgical",
      status: "Empty",
      transferHistory: [],
    },
  ];
  store.beds = seeds as unknown[];
  saveClinicalStore(store);
}

function getStatusColor(status: BedRecord["status"]) {
  if (status === "Empty")
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (status === "Occupied") return "bg-red-50 border-red-200 text-red-800";
  return "bg-amber-50 border-amber-200 text-amber-800";
}

function getStatusDot(status: BedRecord["status"]) {
  if (status === "Empty") return "bg-emerald-500";
  if (status === "Occupied") return "bg-red-500";
  return "bg-amber-500";
}

function formatTs(ts?: bigint) {
  if (!ts) return "—";
  return format(new Date(Number(ts / 1_000_000n)), "d MMM yyyy");
}

export default function BedManagement() {
  seedBedsIfEmpty();

  const { data: beds = [], refetch } = useGetAllBeds();
  const assignBed = useAssignBed();
  const createBed = useCreateBedRecord();

  const [searchQ, setSearchQ] = useState("");
  const [selectedBed, setSelectedBed] = useState<BedRecord | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAddBedDialog, setShowAddBedDialog] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [transferBedId, setTransferBedId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");
  const [newBedNumber, setNewBedNumber] = useState("");
  const [newWard, setNewWard] = useState("General");

  const allPatients = useMemo(
    () => loadFromAllDoctorKeys<Patient>("patients"),
    [],
  );

  const filteredBeds = useMemo(() => {
    if (!searchQ) return beds;
    const q = searchQ.toLowerCase();
    return beds.filter(
      (b) =>
        b.bedNumber.toLowerCase().includes(q) ||
        b.ward.toLowerCase().includes(q) ||
        b.patientName?.toLowerCase().includes(q),
    );
  }, [beds, searchQ]);

  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === "Occupied").length;
    const empty = beds.filter((b) => b.status === "Empty").length;
    const maintenance = beds.filter((b) => b.status === "Maintenance").length;
    return { total, occupied, empty, maintenance };
  }, [beds]);

  const matchedPatients = useMemo(() => {
    if (!assignSearch.trim()) return allPatients.slice(0, 8);
    const q = assignSearch.toLowerCase();
    return allPatients
      .filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          ((p.registerNumber as string) ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [assignSearch, allPatients]);

  function dischargeFromBed(bed: BedRecord) {
    const store = getClinicalStore();
    const all = (store.beds as BedRecord[] | undefined) ?? [];
    const updated = all.map((b) =>
      b.id === bed.id
        ? {
            ...b,
            status: "Empty" as BedRecord["status"],
            patientId: undefined,
            patientName: undefined,
            dischargeDate: BigInt(Date.now()) * 1_000_000n,
          }
        : b,
    );
    store.beds = updated as unknown[];
    saveClinicalStore(store);
    refetch();
    setSelectedBed(null);
    toast.success(`Bed ${bed.bedNumber} is now empty`);
  }

  function transferPatient(
    fromBed: BedRecord,
    toBedId: bigint,
    reason: string,
  ) {
    const store = getClinicalStore();
    const all = (store.beds as BedRecord[] | undefined) ?? [];
    const toBed = all.find((b) => b.id === toBedId);
    if (!toBed || toBed.status !== "Empty") {
      toast.error("Target bed is not available");
      return;
    }
    const now = BigInt(Date.now()) * 1_000_000n;
    const updated = all.map((b) => {
      if (b.id === fromBed.id) {
        return {
          ...b,
          status: "Empty" as BedRecord["status"],
          patientId: undefined,
          patientName: undefined,
          dischargeDate: now,
        };
      }
      if (b.id === toBedId) {
        return {
          ...b,
          status: "Occupied" as BedRecord["status"],
          patientId: fromBed.patientId,
          patientName: fromBed.patientName,
          admissionDate: fromBed.admissionDate,
          transferHistory: [
            ...(b.transferHistory ?? []),
            {
              fromBed: fromBed.bedNumber,
              toBed: b.bedNumber,
              date: now,
              reason: reason || "Transfer",
            },
          ],
        };
      }
      return b;
    });
    store.beds = updated as unknown[];
    saveClinicalStore(store);
    refetch();
    setShowTransferDialog(false);
    setTransferBedId("");
    setTransferReason("");
    setSelectedBed(null);
    toast.success(`Patient transferred to bed ${toBed.bedNumber}`);
  }

  const wards = useMemo(
    () => [
      "General",
      "Medical",
      "Surgical",
      "ICU",
      "Pediatric",
      "Gynae",
      "Ortho",
      "Other",
    ],
    [],
  );

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5"
      data-ocid="bed_management.page"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bed className="w-6 h-6 text-teal-600" />
            Bed Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time bed occupancy and patient assignment
          </p>
        </div>
        <Button
          onClick={() => setShowAddBedDialog(true)}
          className="gap-2 bg-teal-600 hover:bg-teal-700"
          data-ocid="bed_management.open_modal_button"
        >
          <Plus className="w-4 h-4" /> Add Bed
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Beds",
            value: stats.total,
            color: "bg-blue-50 text-blue-800 border-blue-200",
          },
          {
            label: "Occupied",
            value: stats.occupied,
            color: "bg-red-50 text-red-800 border-red-200",
          },
          {
            label: "Available",
            value: stats.empty,
            color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          },
          {
            label: "Maintenance",
            value: stats.maintenance,
            color: "bg-amber-50 text-amber-800 border-amber-200",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border px-4 py-3 ${s.color}`}
            data-ocid="bed_management.card"
          >
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by bed, ward, patient..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="pl-9"
          data-ocid="bed_management.search_input"
        />
      </div>

      {/* Bed Grid */}
      {filteredBeds.length === 0 ? (
        <div
          className="text-center py-20"
          data-ocid="bed_management.empty_state"
        >
          <Bed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No beds found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredBeds.map((bed) => (
            <button
              key={bed.id.toString()}
              type="button"
              onClick={() => setSelectedBed(bed)}
              className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${getStatusColor(bed.status)}`}
              data-ocid={`bed_management.item.${bed.bedNumber}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${getStatusDot(bed.status)}`}
                  />
                  <span className="font-bold text-sm">{bed.bedNumber}</span>
                </div>
                {bed.status === "Occupied" && (
                  <Users className="w-3.5 h-3.5 opacity-60" />
                )}
              </div>
              <p className="text-xs font-medium opacity-70 mb-1">{bed.ward}</p>
              {bed.status === "Occupied" && bed.patientName && (
                <p className="text-xs font-semibold truncate">
                  {bed.patientName}
                </p>
              )}
              <Badge
                className={`text-[10px] mt-1 border-0 ${
                  bed.status === "Empty"
                    ? "bg-emerald-100 text-emerald-700"
                    : bed.status === "Occupied"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {bed.status}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Bed Detail Panel */}
      <Dialog
        open={!!selectedBed}
        onOpenChange={(open) => !open && setSelectedBed(null)}
      >
        <DialogContent className="max-w-md" data-ocid="bed_management.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-teal-600" />
              Bed {selectedBed?.bedNumber} — {selectedBed?.ward}
            </DialogTitle>
          </DialogHeader>
          {selectedBed && (
            <div className="space-y-4">
              <div
                className={`rounded-lg border px-4 py-3 ${getStatusColor(selectedBed.status)}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${getStatusDot(selectedBed.status)}`}
                  />
                  <span className="font-semibold">{selectedBed.status}</span>
                </div>
                {selectedBed.patientName && (
                  <p className="mt-1 font-bold text-sm">
                    {selectedBed.patientName}
                  </p>
                )}
                {selectedBed.admissionDate && (
                  <p className="text-xs opacity-70">
                    Admitted: {formatTs(selectedBed.admissionDate)}
                  </p>
                )}
              </div>

              {/* Transfer history */}
              {selectedBed.transferHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Transfer History
                  </p>
                  <ScrollArea className="h-28">
                    <div className="space-y-1.5">
                      {selectedBed.transferHistory.map((t, i) => (
                        <div
                          key={`${t.fromBed}-${t.toBed}-${i}`}
                          className="bg-muted/40 rounded px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-medium">
                            {t.fromBed} → {t.toBed}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            on {formatTs(t.date)}
                          </span>
                          {t.reason && (
                            <p className="text-muted-foreground italic">
                              {t.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedBed.status === "Empty" && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-teal-600 hover:bg-teal-700"
                    onClick={() => {
                      setShowAssignDialog(true);
                    }}
                    data-ocid="bed_management.assign_button"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign Patient
                  </Button>
                )}
                {selectedBed.status === "Occupied" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => setShowTransferDialog(true)}
                      data-ocid="bed_management.transfer_button"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => dischargeFromBed(selectedBed)}
                      data-ocid="bed_management.discharge_button"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Discharge
                    </Button>
                  </>
                )}
                {selectedBed.status === "Maintenance" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => {
                      const store = getClinicalStore();
                      const all = (store.beds as BedRecord[] | undefined) ?? [];
                      store.beds = all.map((b) =>
                        b.id === selectedBed.id ? { ...b, status: "Empty" } : b,
                      ) as unknown[];
                      saveClinicalStore(store);
                      refetch();
                      setSelectedBed(null);
                      toast.success("Bed marked as available");
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Available
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Patient Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent
          className="max-w-sm"
          data-ocid="bed_management.assign.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Assign Patient to Bed {selectedBed?.bedNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search patient by name or reg no..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              data-ocid="bed_management.assign.search_input"
            />
            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-2 space-y-1">
                {matchedPatients.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    No patients found
                  </p>
                )}
                {matchedPatients.map((p) => (
                  <button
                    key={p.id.toString()}
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (!selectedBed) return;
                      assignBed.mutate(
                        {
                          bedId: selectedBed.id,
                          patientId: p.id,
                          patientName: p.fullName,
                        },
                        {
                          onSuccess: () => {
                            toast.success(
                              `Assigned ${p.fullName} to ${selectedBed.bedNumber}`,
                            );
                            setShowAssignDialog(false);
                            setAssignSearch("");
                            setSelectedBed(null);
                          },
                        },
                      );
                    }}
                    data-ocid={`bed_management.assign.item.${p.registerNumber}`}
                  >
                    <p className="font-medium text-sm">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(p.registerNumber as string) || String(p.id)}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent
          className="max-w-sm"
          data-ocid="bed_management.transfer.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Transfer Patient from {selectedBed?.bedNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Transfer to Bed</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={transferBedId}
                onChange={(e) => setTransferBedId(e.target.value)}
                data-ocid="bed_management.transfer.select"
              >
                <option value="">Select empty bed...</option>
                {beds
                  .filter(
                    (b) => b.status === "Empty" && b.id !== selectedBed?.id,
                  )
                  .map((b) => (
                    <option key={b.id.toString()} value={b.id.toString()}>
                      {b.bedNumber} ({b.ward})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Transfer</Label>
              <Input
                placeholder="e.g. Bed maintenance, Closer to nursing station"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                data-ocid="bed_management.transfer.input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!transferBedId}
                onClick={() => {
                  if (!selectedBed || !transferBedId) return;
                  transferPatient(
                    selectedBed,
                    BigInt(transferBedId),
                    transferReason,
                  );
                }}
                data-ocid="bed_management.transfer.submit_button"
              >
                Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={showAddBedDialog} onOpenChange={setShowAddBedDialog}>
        <DialogContent
          className="max-w-sm"
          data-ocid="bed_management.add.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Bed Number *</Label>
              <Input
                placeholder="e.g. A-01, ICU-03"
                value={newBedNumber}
                onChange={(e) => setNewBedNumber(e.target.value)}
                data-ocid="bed_management.add.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ward *</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                data-ocid="bed_management.add.select"
              >
                {wards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddBedDialog(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!newBedNumber.trim()}
                onClick={() => {
                  createBed.mutate(
                    { bedNumber: newBedNumber.trim(), ward: newWard },
                    {
                      onSuccess: () => {
                        toast.success("Bed added");
                        setShowAddBedDialog(false);
                        setNewBedNumber("");
                        setNewWard("General");
                      },
                    },
                  );
                }}
                data-ocid="bed_management.add.submit_button"
              >
                Add Bed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
