import EmergencyConsultationModal from "@/components/EmergencyConsultationModal";
import PrescriptionPDFManager from "@/components/PrescriptionPDFManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { DoctorKey } from "@/data/doctorsData";
import { useDoctorContent } from "@/hooks/useDoctorContent";
import {
  AlertTriangle,
  Award,
  BookOpen,
  BriefcaseMedical,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Heart,
  Mail,
  MapPin,
  Menu,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
  Youtube,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface LandingPageProps {
  onLoginClick: () => void;
  onAdminLoginClick: () => void;
  isAdmin: boolean;
  adminLogout: () => void;
}

interface PublicBooking {
  id: string;
  patientName: string;
  phone: string;
  doctor: string;
  date?: string;
  preferredDate?: string;
  time?: string;
  preferredTime?: string;
  reason?: string;
  chamber?: string;
  preferredChamber?: string;
  submittedAt: string;
  status: "pending" | "confirmed" | "cancelled";
  registerNumber?: string;
  appointmentType?: string;
  hospitalName?: string;
  bedWardNumber?: string;
  admissionReason?: string;
  referringDoctor?: string;
  serialNumber?: number;
  serialDate?: string;
}

function loadPublicBookings(): PublicBooking[] {
  try {
    return JSON.parse(
      localStorage.getItem("public_appointment_requests") || "[]",
    );
  } catch {
    return [];
  }
}

function savePublicBookings(data: PublicBooking[]) {
  localStorage.setItem("public_appointment_requests", JSON.stringify(data));
}

// ─── Classroom Tab Content ────────────────────────────────────────────────────

function ClassroomContent({
  doctorKey,
  isAdmin,
  updateField,
}: {
  doctorKey: DoctorKey;
  isAdmin: boolean;
  updateField: (key: DoctorKey, path: string, value: any) => void;
}) {
  const { getContent } = useDoctorContent();
  const doc = getContent(doctorKey);
  const cls = doc.classroom;
  const color = doctorKey === "arman" ? "text-primary" : "text-rose-600";
  const bg = doctorKey === "arman" ? "bg-primary/10" : "bg-rose-100";
  const border =
    doctorKey === "arman" ? "border-primary/20" : "border-rose-200";

  // Announcement state
  const [addAnn, setAddAnn] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", date: "", body: "" });
  const [editAnnIdx, setEditAnnIdx] = useState<number | null>(null);
  const [editAnnForm, setEditAnnForm] = useState({
    title: "",
    date: "",
    body: "",
  });

  // Note state
  const [addNote, setAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: "",
    description: "",
    link: "",
  });
  const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
  const [editNoteForm, setEditNoteForm] = useState({
    title: "",
    description: "",
    link: "",
  });

  // Video state
  const [addVideo, setAddVideo] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: "",
    url: "",
    description: "",
  });
  const [editVideoIdx, setEditVideoIdx] = useState<number | null>(null);
  const [editVideoForm, setEditVideoForm] = useState({
    title: "",
    url: "",
    description: "",
  });

  // Schedule state
  const [addSchedule, setAddSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({
    day: "",
    time: "",
    subject: "",
    venue: "",
  });
  const [editSchedIdx, setEditSchedIdx] = useState<number | null>(null);
  const [editSchedForm, setEditSchedForm] = useState({
    day: "",
    time: "",
    subject: "",
    venue: "",
  });
  // Search
  const [noteSearch, setNoteSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  const saveAnn = () => {
    if (!annForm.title || !annForm.date || !annForm.body) return;
    const updated = [...(cls.announcements || []), annForm];
    updateField(doctorKey, "classroom.announcements", updated);
    setAnnForm({ title: "", date: "", body: "" });
    setAddAnn(false);
    toast.success("Announcement added");
  };

  const deleteAnn = (idx: number) => {
    const updated = cls.announcements.filter((_: any, i: number) => i !== idx);
    updateField(doctorKey, "classroom.announcements", updated);
    toast.success("Announcement deleted");
  };

  const saveEditAnn = () => {
    if (editAnnIdx === null) return;
    const updated = cls.announcements.map((a: any, i: number) =>
      i === editAnnIdx ? editAnnForm : a,
    );
    updateField(doctorKey, "classroom.announcements", updated);
    setEditAnnIdx(null);
    toast.success("Announcement updated");
  };

  const saveNote = () => {
    if (!noteForm.title) return;
    const updated = [...(cls.notes || []), noteForm];
    updateField(doctorKey, "classroom.notes", updated);
    setNoteForm({ title: "", description: "", link: "" });
    setAddNote(false);
    toast.success("Note added");
  };

  const deleteNote = (idx: number) => {
    const updated = cls.notes.filter((_: any, i: number) => i !== idx);
    updateField(doctorKey, "classroom.notes", updated);
    toast.success("Note deleted");
  };

  const saveEditNote = () => {
    if (editNoteIdx === null) return;
    const updated = cls.notes.map((n: any, i: number) =>
      i === editNoteIdx ? editNoteForm : n,
    );
    updateField(doctorKey, "classroom.notes", updated);
    setEditNoteIdx(null);
    toast.success("Note updated");
  };

  const saveVideo = () => {
    if (!videoForm.title || !videoForm.url) return;
    const updated = [...(cls.videos || []), videoForm];
    updateField(doctorKey, "classroom.videos", updated);
    setVideoForm({ title: "", url: "", description: "" });
    setAddVideo(false);
    toast.success("Video added");
  };

  const deleteVideo = (idx: number) => {
    const updated = cls.videos.filter((_: any, i: number) => i !== idx);
    updateField(doctorKey, "classroom.videos", updated);
    toast.success("Video deleted");
  };

  const saveEditVideo = () => {
    if (editVideoIdx === null) return;
    const updated = cls.videos.map((v: any, i: number) =>
      i === editVideoIdx ? editVideoForm : v,
    );
    updateField(doctorKey, "classroom.videos", updated);
    setEditVideoIdx(null);
    toast.success("Video updated");
  };

  const saveSched = () => {
    if (!schedForm.day || !schedForm.subject) return;
    const updated = [...(cls.schedule || []), schedForm];
    updateField(doctorKey, "classroom.schedule", updated);
    setSchedForm({ day: "", time: "", subject: "", venue: "" });
    setAddSchedule(false);
    toast.success("Schedule entry added");
  };

  const deleteSched = (idx: number) => {
    const updated = cls.schedule.filter((_: any, i: number) => i !== idx);
    updateField(doctorKey, "classroom.schedule", updated);
    toast.success("Schedule entry deleted");
  };

  const saveEditSched = () => {
    if (editSchedIdx === null) return;
    const updated = cls.schedule.map((s: any, i: number) =>
      i === editSchedIdx ? editSchedForm : s,
    );
    updateField(doctorKey, "classroom.schedule", updated);
    setEditSchedIdx(null);
    toast.success("Schedule updated");
  };

  return (
    <div className="space-y-6">
      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`font-semibold text-lg flex items-center gap-2 ${color}`}
          >
            <span
              className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}
            >
              <BriefcaseMedical className="w-4 h-4" />
            </span>
            Announcements
          </h3>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setAddAnn(true)}
              data-ocid="classroom.ann.open_modal_button"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {cls.announcements.map((ann: any, idx: number) => (
            <Card key={ann.title + String(idx)} className={`border ${border}`}>
              <CardContent className="p-4">
                {editAnnIdx === idx ? (
                  <div className="space-y-2">
                    <Input
                      value={editAnnForm.title}
                      onChange={(e) =>
                        setEditAnnForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Title"
                    />
                    <Input
                      type="date"
                      value={editAnnForm.date}
                      onChange={(e) =>
                        setEditAnnForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                    <Textarea
                      value={editAnnForm.body}
                      onChange={(e) =>
                        setEditAnnForm((f) => ({ ...f, body: e.target.value }))
                      }
                      placeholder="Body"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEditAnn}
                        data-ocid="classroom.ann.save_button"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditAnnIdx(null)}
                        data-ocid="classroom.ann.cancel_button"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {ann.title}
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        {ann.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {new Date(ann.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Badge>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            className="p-1 hover:text-primary"
                            onClick={() => {
                              setEditAnnIdx(idx);
                              setEditAnnForm(ann);
                            }}
                            data-ocid={`classroom.ann.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 hover:text-destructive"
                            onClick={() => deleteAnn(idx)}
                            data-ocid={`classroom.ann.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Add announcement dialog */}
        <Dialog open={addAnn} onOpenChange={setAddAnn}>
          <DialogContent className="max-w-sm" data-ocid="classroom.ann.dialog">
            <DialogHeader>
              <DialogTitle>Add Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={annForm.title}
                  onChange={(e) =>
                    setAnnForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Announcement title"
                  data-ocid="classroom.ann.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={annForm.date}
                  onChange={(e) =>
                    setAnnForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="classroom.ann.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  value={annForm.body}
                  onChange={(e) =>
                    setAnnForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="Announcement text..."
                  rows={3}
                  data-ocid="classroom.ann.textarea"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveAnn}
                  className="flex-1"
                  data-ocid="classroom.ann.submit_button"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddAnn(false)}
                  className="flex-1"
                  data-ocid="classroom.ann.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`font-semibold text-lg flex items-center gap-2 ${color}`}
          >
            <span
              className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}
            >
              <CalendarDays className="w-4 h-4" />
            </span>
            Class Schedule
          </h3>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setAddSchedule(true)}
              data-ocid="classroom.schedule.open_modal_button"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Day</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Venue</TableHead>
                {isAdmin && (
                  <TableHead className="font-semibold w-16">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cls.schedule.map((s: any, idx: number) => (
                <TableRow key={s.day + String(idx)}>
                  {editSchedIdx === idx ? (
                    <TableCell colSpan={isAdmin ? 5 : 4}>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={editSchedForm.day}
                          onChange={(e) =>
                            setEditSchedForm((f) => ({
                              ...f,
                              day: e.target.value,
                            }))
                          }
                          placeholder="Day"
                          className="w-24"
                        />
                        <Input
                          value={editSchedForm.time}
                          onChange={(e) =>
                            setEditSchedForm((f) => ({
                              ...f,
                              time: e.target.value,
                            }))
                          }
                          placeholder="Time"
                          className="w-36"
                        />
                        <Input
                          value={editSchedForm.subject}
                          onChange={(e) =>
                            setEditSchedForm((f) => ({
                              ...f,
                              subject: e.target.value,
                            }))
                          }
                          placeholder="Subject"
                          className="w-36"
                        />
                        <Input
                          value={editSchedForm.venue}
                          onChange={(e) =>
                            setEditSchedForm((f) => ({
                              ...f,
                              venue: e.target.value,
                            }))
                          }
                          placeholder="Venue"
                          className="w-36"
                        />
                        <Button
                          size="sm"
                          onClick={saveEditSched}
                          data-ocid="classroom.schedule.save_button"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditSchedIdx(null)}
                          data-ocid="classroom.schedule.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="font-medium">{s.day}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.time}
                      </TableCell>
                      <TableCell>{s.subject}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.venue}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="p-1 hover:text-primary"
                              onClick={() => {
                                setEditSchedIdx(idx);
                                setEditSchedForm(s);
                              }}
                              data-ocid={`classroom.schedule.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="p-1 hover:text-destructive"
                              onClick={() => deleteSched(idx)}
                              data-ocid={`classroom.schedule.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Add schedule dialog */}
        <Dialog open={addSchedule} onOpenChange={setAddSchedule}>
          <DialogContent
            className="max-w-sm"
            data-ocid="classroom.schedule.dialog"
          >
            <DialogHeader>
              <DialogTitle>Add Schedule Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Input
                  value={schedForm.day}
                  onChange={(e) =>
                    setSchedForm((f) => ({ ...f, day: e.target.value }))
                  }
                  placeholder="e.g., Monday"
                  data-ocid="classroom.schedule.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  value={schedForm.time}
                  onChange={(e) =>
                    setSchedForm((f) => ({ ...f, time: e.target.value }))
                  }
                  placeholder="e.g., 8:00 AM – 10:00 AM"
                  data-ocid="classroom.schedule.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={schedForm.subject}
                  onChange={(e) =>
                    setSchedForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="Subject name"
                  data-ocid="classroom.schedule.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Input
                  value={schedForm.venue}
                  onChange={(e) =>
                    setSchedForm((f) => ({ ...f, venue: e.target.value }))
                  }
                  placeholder="Lecture Hall / Ward"
                  data-ocid="classroom.schedule.input"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSched}
                  className="flex-1"
                  data-ocid="classroom.schedule.submit_button"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddSchedule(false)}
                  className="flex-1"
                  data-ocid="classroom.schedule.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lecture Notes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`font-semibold text-lg flex items-center gap-2 ${color}`}
          >
            <span
              className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}
            >
              <BookOpen className="w-4 h-4" />
            </span>
            Lecture Notes
          </h3>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setAddNote(true)}
              data-ocid="classroom.notes.open_modal_button"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search lecture notes..."
              className="pl-8 h-9 text-sm"
              data-ocid="classroom.notes.search_input"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cls.notes
            .filter(
              (note: any) =>
                !noteSearch ||
                note.title?.toLowerCase().includes(noteSearch.toLowerCase()) ||
                note.description
                  ?.toLowerCase()
                  .includes(noteSearch.toLowerCase()),
            )
            .map((note: any, idx: number) => (
              <Card
                key={note.title + String(idx)}
                className={`border ${border} hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <BookOpen className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editNoteIdx === idx ? (
                      <div className="space-y-1.5">
                        <Input
                          value={editNoteForm.title}
                          onChange={(e) =>
                            setEditNoteForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Title"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={editNoteForm.description}
                          onChange={(e) =>
                            setEditNoteForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Description"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={editNoteForm.link}
                          onChange={(e) =>
                            setEditNoteForm((f) => ({
                              ...f,
                              link: e.target.value,
                            }))
                          }
                          placeholder="Link (URL)"
                          className="h-7 text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-xs"
                            onClick={saveEditNote}
                            data-ocid="classroom.notes.save_button"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => setEditNoteIdx(null)}
                            data-ocid="classroom.notes.cancel_button"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-foreground">
                          {note.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {note.description}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <a href={note.link} className={`${color} hover:opacity-70`}>
                      <Download className="w-4 h-4" />
                    </a>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className="p-0.5 hover:text-primary"
                          onClick={() => {
                            setEditNoteIdx(idx);
                            setEditNoteForm(note);
                          }}
                          data-ocid={`classroom.notes.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 hover:text-destructive"
                          onClick={() => deleteNote(idx)}
                          data-ocid={`classroom.notes.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
        <Dialog open={addNote} onOpenChange={setAddNote}>
          <DialogContent
            className="max-w-sm"
            data-ocid="classroom.notes.dialog"
          >
            <DialogHeader>
              <DialogTitle>Add Lecture Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={noteForm.title}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Note title"
                  data-ocid="classroom.notes.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={noteForm.description}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description"
                  data-ocid="classroom.notes.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link (URL)</Label>
                <Input
                  value={noteForm.link}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, link: e.target.value }))
                  }
                  placeholder="https://..."
                  data-ocid="classroom.notes.input"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveNote}
                  className="flex-1"
                  data-ocid="classroom.notes.submit_button"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddNote(false)}
                  className="flex-1"
                  data-ocid="classroom.notes.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Video Links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`font-semibold text-lg flex items-center gap-2 ${color}`}
          >
            <span
              className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}
            >
              <Youtube className="w-4 h-4" />
            </span>
            Video Lectures
          </h3>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setAddVideo(true)}
              data-ocid="classroom.videos.open_modal_button"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={videoSearch}
              onChange={(e) => setVideoSearch(e.target.value)}
              placeholder="Search video lectures..."
              className="pl-8 h-9 text-sm"
              data-ocid="classroom.videos.search_input"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cls.videos
            .filter(
              (vid: any) =>
                !videoSearch ||
                vid.title?.toLowerCase().includes(videoSearch.toLowerCase()) ||
                vid.description
                  ?.toLowerCase()
                  .includes(videoSearch.toLowerCase()),
            )
            .map((vid: any, idx: number) => (
              <Card
                key={vid.title + String(idx)}
                className={`border ${border} hover:shadow-md transition-all`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Youtube className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editVideoIdx === idx ? (
                      <div className="space-y-1.5">
                        <Input
                          value={editVideoForm.title}
                          onChange={(e) =>
                            setEditVideoForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Title"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={editVideoForm.url}
                          onChange={(e) =>
                            setEditVideoForm((f) => ({
                              ...f,
                              url: e.target.value,
                            }))
                          }
                          placeholder="YouTube URL"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={editVideoForm.description}
                          onChange={(e) =>
                            setEditVideoForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Description"
                          className="h-7 text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-xs"
                            onClick={saveEditVideo}
                            data-ocid="classroom.videos.save_button"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => setEditVideoIdx(null)}
                            data-ocid="classroom.videos.cancel_button"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-foreground">
                          {vid.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {vid.description}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-0.5 hover:text-red-600"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className="p-0.5 hover:text-primary"
                          onClick={() => {
                            setEditVideoIdx(idx);
                            setEditVideoForm(vid);
                          }}
                          data-ocid={`classroom.videos.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 hover:text-destructive"
                          onClick={() => deleteVideo(idx)}
                          data-ocid={`classroom.videos.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
        <Dialog open={addVideo} onOpenChange={setAddVideo}>
          <DialogContent
            className="max-w-sm"
            data-ocid="classroom.videos.dialog"
          >
            <DialogHeader>
              <DialogTitle>Add Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={videoForm.title}
                  onChange={(e) =>
                    setVideoForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Video title"
                  data-ocid="classroom.videos.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>YouTube URL</Label>
                <Input
                  value={videoForm.url}
                  onChange={(e) =>
                    setVideoForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://youtube.com/..."
                  data-ocid="classroom.videos.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={videoForm.description}
                  onChange={(e) =>
                    setVideoForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description"
                  data-ocid="classroom.videos.input"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveVideo}
                  className="flex-1"
                  data-ocid="classroom.videos.submit_button"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddVideo(false)}
                  className="flex-1"
                  data-ocid="classroom.videos.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── CV Content ────────────────────────────────────────────────────────────────

function CVContent({
  doctorKey,
  isAdmin,
  updateField,
}: {
  doctorKey: DoctorKey;
  isAdmin: boolean;
  updateField: (key: DoctorKey, path: string, value: any) => void;
}) {
  const { getContent } = useDoctorContent();
  const doc = getContent(doctorKey);
  const cv = doc.cv;
  const color = doctorKey === "arman" ? "text-primary" : "text-rose-600";
  const bg = doctorKey === "arman" ? "bg-primary" : "bg-rose-600";

  const [showPdfEdit, setShowPdfEdit] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(doc.cvPdfUrl || "");
  const [showCvEdit, setShowCvEdit] = useState(false);
  const [cvEditForm, setCvEditForm] = useState<{
    qualifications: any[];
    experience: any[];
    publications: string[];
    awards: string[];
    memberships: string[];
  }>({
    qualifications: cv.qualifications || [],
    experience: cv.experience || [],
    publications: cv.publications || [],
    awards: cv.awards || [],
    memberships: cv.memberships || [],
  });

  const savePdfUrl = () => {
    updateField(doctorKey, "cvPdfUrl", pdfUrl || null);
    setShowPdfEdit(false);
    toast.success("CV PDF URL updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden gap-2">
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowPdfEdit(true)}
            data-ocid="cv.pdf.open_modal_button"
          >
            <Edit className="w-3.5 h-3.5" />
            Update CV PDF
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => {
              setCvEditForm({
                qualifications: cv.qualifications || [],
                experience: cv.experience || [],
                publications: cv.publications || [],
                awards: cv.awards || [],
                memberships: cv.memberships || [],
              });
              setShowCvEdit(true);
            }}
            data-ocid="cv.edit.open_modal_button"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit CV Content
          </Button>
        )}
        {doc.cvPdfUrl ? (
          <a href={doc.cvPdfUrl} download>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download CV as PDF
            </Button>
          </a>
        ) : (
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download CV as PDF
          </Button>
        )}
      </div>

      {/* PDF URL Edit Dialog */}
      <Dialog open={showPdfEdit} onOpenChange={setShowPdfEdit}>
        <DialogContent className="max-w-sm" data-ocid="cv.pdf.dialog">
          <DialogHeader>
            <DialogTitle>Update CV PDF URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>PDF URL or Path</Label>
              <Input
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="/assets/uploads/cv.pdf or https://..."
                data-ocid="cv.pdf.input"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use browser print as fallback.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={savePdfUrl}
                className="flex-1"
                data-ocid="cv.pdf.save_button"
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPdfEdit(false)}
                className="flex-1"
                data-ocid="cv.pdf.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CV Content Edit Dialog */}
      <Dialog open={showCvEdit} onOpenChange={setShowCvEdit}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          data-ocid="cv.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit CV Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Qualifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">
                  Academic Qualifications
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCvEditForm((f) => ({
                      ...f,
                      qualifications: [
                        ...f.qualifications,
                        { degree: "", institution: "", year: "" },
                      ],
                    }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {cvEditForm.qualifications.map((q, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: edit form uses index as key
                <div key={`item-${i}`} className="flex gap-2 mb-2 items-center">
                  <Input
                    placeholder="Degree"
                    value={q.degree}
                    onChange={(e) => {
                      const arr = [...cvEditForm.qualifications];
                      arr[i] = { ...arr[i], degree: e.target.value };
                      setCvEditForm((f) => ({ ...f, qualifications: arr }));
                    }}
                  />
                  <Input
                    placeholder="Institution"
                    value={q.institution}
                    onChange={(e) => {
                      const arr = [...cvEditForm.qualifications];
                      arr[i] = { ...arr[i], institution: e.target.value };
                      setCvEditForm((f) => ({ ...f, qualifications: arr }));
                    }}
                  />
                  <Input
                    placeholder="Year"
                    value={q.year}
                    className="w-24"
                    onChange={(e) => {
                      const arr = [...cvEditForm.qualifications];
                      arr[i] = { ...arr[i], year: e.target.value };
                      setCvEditForm((f) => ({ ...f, qualifications: arr }));
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCvEditForm((f) => ({
                        ...f,
                        qualifications: f.qualifications.filter(
                          (_, j) => j !== i,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {/* Experience */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">
                  Professional Experience
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCvEditForm((f) => ({
                      ...f,
                      experience: [
                        ...f.experience,
                        { title: "", institution: "", period: "" },
                      ],
                    }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {cvEditForm.experience.map((exp, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: edit form uses index as key
                <div key={`item-${i}`} className="flex gap-2 mb-2 items-center">
                  <Input
                    placeholder="Role/Title"
                    value={exp.title}
                    onChange={(e) => {
                      const arr = [...cvEditForm.experience];
                      arr[i] = { ...arr[i], title: e.target.value };
                      setCvEditForm((f) => ({ ...f, experience: arr }));
                    }}
                  />
                  <Input
                    placeholder="Hospital/Institution"
                    value={exp.institution}
                    onChange={(e) => {
                      const arr = [...cvEditForm.experience];
                      arr[i] = { ...arr[i], institution: e.target.value };
                      setCvEditForm((f) => ({ ...f, experience: arr }));
                    }}
                  />
                  <Input
                    placeholder="Period"
                    value={exp.period}
                    className="w-28"
                    onChange={(e) => {
                      const arr = [...cvEditForm.experience];
                      arr[i] = { ...arr[i], period: e.target.value };
                      setCvEditForm((f) => ({ ...f, experience: arr }));
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCvEditForm((f) => ({
                        ...f,
                        experience: f.experience.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {/* Publications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Publications</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCvEditForm((f) => ({
                      ...f,
                      publications: [...f.publications, ""],
                    }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {cvEditForm.publications.map((pub, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: edit form uses index as key
                <div key={`item-${i}`} className="flex gap-2 mb-2 items-center">
                  <Input
                    value={pub}
                    onChange={(e) => {
                      const arr = [...cvEditForm.publications];
                      arr[i] = e.target.value;
                      setCvEditForm((f) => ({ ...f, publications: arr }));
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCvEditForm((f) => ({
                        ...f,
                        publications: f.publications.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {/* Awards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">
                  Awards &amp; Distinctions
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCvEditForm((f) => ({ ...f, awards: [...f.awards, ""] }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {cvEditForm.awards.map((award, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: edit form uses index as key
                <div key={`item-${i}`} className="flex gap-2 mb-2 items-center">
                  <Input
                    value={award}
                    onChange={(e) => {
                      const arr = [...cvEditForm.awards];
                      arr[i] = e.target.value;
                      setCvEditForm((f) => ({ ...f, awards: arr }));
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCvEditForm((f) => ({
                        ...f,
                        awards: f.awards.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {/* Memberships */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Memberships</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCvEditForm((f) => ({
                      ...f,
                      memberships: [...f.memberships, ""],
                    }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {cvEditForm.memberships.map((m, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: edit form uses index as key
                <div key={`item-${i}`} className="flex gap-2 mb-2 items-center">
                  <Input
                    value={m}
                    onChange={(e) => {
                      const arr = [...cvEditForm.memberships];
                      arr[i] = e.target.value;
                      setCvEditForm((f) => ({ ...f, memberships: arr }));
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCvEditForm((f) => ({
                        ...f,
                        memberships: f.memberships.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  updateField(
                    doctorKey,
                    "cv.qualifications",
                    cvEditForm.qualifications,
                  );
                  updateField(
                    doctorKey,
                    "cv.experience",
                    cvEditForm.experience,
                  );
                  updateField(
                    doctorKey,
                    "cv.publications",
                    cvEditForm.publications,
                  );
                  updateField(doctorKey, "cv.awards", cvEditForm.awards);
                  updateField(
                    doctorKey,
                    "cv.memberships",
                    cvEditForm.memberships,
                  );
                  setShowCvEdit(false);
                  toast.success("CV updated");
                }}
                data-ocid="cv.edit.confirm_button"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCvEdit(false)}
                data-ocid="cv.edit.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CV Header */}
      <div className="text-center py-6 border-b print:border-b print:pb-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-primary">
            {doc.name
              .split(" ")
              .slice(1, 3)
              .map((w: string) => w[0])
              .join("")}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{doc.name}</h2>
        <p className={`font-medium mt-1 ${color}`}>{doc.degree}</p>
        {((doc.posts as string[]) || []).map((post) => (
          <p key={post} className="text-sm text-muted-foreground mt-0.5">
            {post}
          </p>
        ))}
        <p className="text-muted-foreground text-sm mt-0.5">
          {doc.specialization}
        </p>
        <p className="text-muted-foreground text-sm">{doc.hospital}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {doc.phone}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {doc.email}
          </span>
        </div>
      </div>

      {/* Qualifications */}
      <div>
        <h3
          className={`font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2 ${color}`}
        >
          <BookOpen className="w-4 h-4" /> Academic Qualifications
        </h3>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Degree</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cv.qualifications.map((q: any) => (
                <TableRow key={q.degree}>
                  <TableCell className="font-semibold">{q.degree}</TableCell>
                  <TableCell>{q.institution}</TableCell>
                  <TableCell>{q.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Experience */}
      <div>
        <h3
          className={`font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2 ${color}`}
        >
          <BriefcaseMedical className="w-4 h-4" /> Professional Experience
        </h3>
        <div className="space-y-3">
          {cv.experience.map((exp: any) => (
            <div key={exp.title} className="flex gap-4">
              <div className={`w-2 h-2 rounded-full ${bg} mt-2 shrink-0`} />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {exp.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {exp.institution}
                </p>
                <p className="text-xs text-muted-foreground">{exp.period}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publications */}
      <div>
        <h3
          className={`font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2 ${color}`}
        >
          <BookOpen className="w-4 h-4" /> Publications
        </h3>
        <ul className="space-y-2">
          {cv.publications.map((pub: string) => (
            <li key={pub} className="flex gap-3 text-sm">
              <span className={`mt-1 shrink-0 ${color}`}>•</span>
              <span className="text-foreground">{pub}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Awards */}
      <div>
        <h3
          className={`font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2 ${color}`}
        >
          <Trophy className="w-4 h-4" /> Awards &amp; Distinctions
        </h3>
        <ul className="space-y-2">
          {cv.awards.map((award: string) => (
            <li key={award} className="flex items-center gap-3 text-sm">
              <Award className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="text-foreground">{award}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Memberships */}
      <div>
        <h3
          className={`font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2 ${color}`}
        >
          <Users className="w-4 h-4" /> Memberships
        </h3>
        <ul className="space-y-2">
          {cv.memberships.map((m: string) => (
            <li key={m} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="text-foreground">{m}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Profile Edit Dialog ──────────────────────────────────────────────────────

function ProfileEditDialog({
  doctorKey,
  open,
  onClose,
  updateField,
}: {
  doctorKey: DoctorKey;
  open: boolean;
  onClose: () => void;
  updateField: (key: DoctorKey, path: string, value: any) => void;
}) {
  const { getContent } = useDoctorContent();
  const doc = getContent(doctorKey);

  const [form, setForm] = useState({
    name: doc.name,
    degree: doc.degree,
    posts: (doc.posts as string[]) || [],
    specialization: doc.specialization,
    hospital: doc.hospital,
    phone: doc.phone,
    email: doc.email,
  });

  const handleSave = () => {
    for (const [key, value] of Object.entries(form)) {
      if (key === "posts") {
        updateField(
          doctorKey,
          key,
          (value as string[]).filter((p) => p.trim()),
        );
      } else {
        updateField(doctorKey, key, value);
      }
    }
    toast.success("Profile updated successfully");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="profile.edit.dialog">
        <DialogHeader>
          <DialogTitle>Edit Profile — {doc.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Degree(s)</Label>
            <Input
              value={form.degree}
              onChange={(e) =>
                setForm((f) => ({ ...f, degree: e.target.value }))
              }
              placeholder="MBBS, FCPS..."
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Posts</Label>
            <div className="space-y-2">
              {form.posts.map((post, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: posts are ordered
                <div key={`post-edit-${i}`} className="flex gap-2 items-center">
                  <Input
                    value={post}
                    onChange={(e) =>
                      setForm((f) => {
                        const updated = [...f.posts];
                        updated[i] = e.target.value;
                        return { ...f, posts: updated };
                      })
                    }
                    placeholder="e.g. Registrar, Dept. of Surgery"
                    data-ocid="profile.edit.input"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        posts: f.posts.filter((_, j) => j !== i),
                      }))
                    }
                    data-ocid="profile.edit.delete_button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, posts: [...f.posts, ""] }))
                }
                data-ocid="profile.edit.button"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Post
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <Input
              value={form.specialization}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialization: e.target.value }))
              }
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hospital / Department</Label>
            <Input
              value={form.hospital}
              onChange={(e) =>
                setForm((f) => ({ ...f, hospital: e.target.value }))
              }
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              data-ocid="profile.edit.input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              className="flex-1"
              data-ocid="profile.edit.save_button"
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-ocid="profile.edit.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin: Treatment Reference PDF (for DIMS auto-fill) ────────────────────

function TreatmentReferencePDFAdmin() {
  const LS_KEY = "treatmentReferencePDF";
  const [stored, setStored] = useState<string | null>(() =>
    localStorage.getItem(LS_KEY),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    localStorage.setItem(LS_KEY, file.name);
    setStored(file.name);
    toast.success(`Treatment reference PDF "${file.name}" uploaded`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = () => {
    localStorage.removeItem(LS_KEY);
    setStored(null);
    toast.success("Treatment reference PDF removed");
  };

  return (
    <Card className="border-teal-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-teal-800 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Treatment Reference PDF (for DIMS Auto-fill)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-teal-700">
          Upload a clinical treatment reference PDF. When DIMS auto-generates a
          prescription from a diagnosis, it will reference this PDF in
          collaboration with DIMS guidelines.
        </p>
        {stored ? (
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
            <FileText className="w-5 h-5 text-teal-600 shrink-0" />
            <span className="text-sm text-teal-800 flex-1 truncate">
              {stored}
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              data-ocid="admin.treatment_pdf.delete_button"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">
            No treatment reference PDF uploaded yet.
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            data-ocid="admin.treatment_pdf.upload_button"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {stored ? "Replace PDF" : "Upload PDF"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        {stored && (
          <div className="text-xs bg-teal-50 border border-teal-200 rounded p-2 text-teal-700">
            <span className="font-medium">Active reference:</span> {stored} —
            DIMS auto-generation will use this PDF as a treatment guideline
            reference.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin: Differential Diagnosis Reference PDF ─────────────────────────────

function DifferentialDiagnosisPDFAdmin() {
  const LS_KEY = "ddReferencePDF";
  const [stored, setStored] = useState<string | null>(() =>
    localStorage.getItem(LS_KEY),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    localStorage.setItem(LS_KEY, file.name);
    setStored(file.name);
    toast.success(`DD reference PDF "${file.name}" uploaded`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = () => {
    localStorage.removeItem(LS_KEY);
    setStored(null);
    toast.success("DD reference PDF removed");
  };

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-purple-800 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Differential Diagnosis Reference PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-purple-700">
          Upload a clinical reference PDF for generating differential diagnoses.
          The AI will use this as a reference when suggesting differentials in
          the visit form.
        </p>
        {stored ? (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <FileText className="w-5 h-5 text-purple-600 shrink-0" />
            <span className="text-sm text-purple-800 flex-1 truncate">
              {stored}
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              data-ocid="admin.dd_pdf.delete_button"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">
            No DD reference PDF uploaded yet.
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            data-ocid="admin.dd_pdf.upload_button"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {stored ? "Replace PDF" : "Upload PDF"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Admin: Interpretation Reference PDF ─────────────────────────────────────

function StaffApprovalsAdmin() {
  const [accounts, setAccounts] = useState<any[]>([]);

  const refresh = useCallback(() => {
    try {
      const registry = JSON.parse(
        localStorage.getItem("medicare_doctors_registry") || "[]",
      );
      setAccounts(registry.filter((d: any) => d.status === "pending"));
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = (id: string) => {
    try {
      const registry = JSON.parse(
        localStorage.getItem("medicare_doctors_registry") || "[]",
      );
      const idx = registry.findIndex((d: any) => d.id === id);
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], status: "approved" };
        localStorage.setItem(
          "medicare_doctors_registry",
          JSON.stringify(registry),
        );
        toast.success("Account approved");
        refresh();
      }
    } catch {}
  };

  const reject = (id: string) => {
    try {
      const registry = JSON.parse(
        localStorage.getItem("medicare_doctors_registry") || "[]",
      );
      const idx = registry.findIndex((d: any) => d.id === id);
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], status: "rejected" };
        localStorage.setItem(
          "medicare_doctors_registry",
          JSON.stringify(registry),
        );
        toast.success("Account rejected");
        refresh();
      }
    } catch {}
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5">
      <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Pending Staff Approvals ({accounts.length})
      </h3>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc: any) => (
            <div
              key={acc.id}
              className="flex items-center justify-between gap-3 border border-border rounded-lg p-3"
            >
              <div>
                <p className="font-medium text-sm">{acc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {acc.email} · {acc.role}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 h-7 text-xs"
                  onClick={() => approve(acc.id)}
                  data-ocid="admin.approve.button"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-50 gap-1 h-7 text-xs"
                  onClick={() => reject(acc.id)}
                  data-ocid="admin.reject.button"
                >
                  <X className="w-3 h-3" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InterpretationRefPDFAdmin() {
  const LS_KEY = "interpretationReferencePDF";
  const [stored, setStored] = useState<string | null>(() =>
    localStorage.getItem(LS_KEY),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Store file name as reference (real apps would upload to blob storage)
    const ref = file.name;
    localStorage.setItem(LS_KEY, ref);
    setStored(ref);
    toast.success("Investigation interpretation reference PDF saved.");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = () => {
    localStorage.removeItem(LS_KEY);
    setStored(null);
    toast.success("Reference PDF removed.");
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Investigation Interpretation Reference PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-700">
          Upload a PDF containing interpretation guidelines for investigation
          results. Only admins can add or delete this reference.
        </p>
        {stored ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <FileText className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 flex-1 truncate">
              {stored}
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              data-ocid="admin.interpretation_pdf.delete_button"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">
            No reference PDF uploaded yet.
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            data-ocid="admin.interpretation_pdf.upload_button"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {stored ? "Replace PDF" : "Upload PDF"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage({
  onLoginClick,
  onAdminLoginClick,
  isAdmin,
  adminLogout,
}: LandingPageProps) {
  const { getContent, updateField, updateChambers } = useDoctorContent();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [editProfileKey, setEditProfileKey] = useState<DoctorKey | null>(null);
  type ChamberForm = {
    id: string;
    nameBn: string;
    addressBn: string;
    address: string;
    visitingHours: string;
    phone: string;
    emergencyPhone: string;
  };
  const [editChamberKey, setEditChamberKey] = useState<DoctorKey | null>(null);
  const [editChamberIdx, setEditChamberIdx] = useState<number>(-1);
  const [chamberEditForm, setChamberEditForm] = useState<ChamberForm>({
    id: "",
    nameBn: "",
    addressBn: "",
    address: "",
    visitingHours: "",
    phone: "",
    emergencyPhone: "",
  });

  // ── Booking state ─────────────────────────────────────────────────────
  type BookingType = "chamber" | "admitted";
  const [activeBookingTab, setActiveBookingTab] =
    useState<BookingType>("chamber");

  interface FoundPatientInfo {
    patientName: string;
    phone: string;
    age?: string;
    gender?: string;
    registerNumber?: string;
  }

  // Chamber booking form
  const emptyChamberForm = {
    patientName: "",
    phone: "",
    doctor: "",
    date: "",
    time: "",
    reason: "",
    chamber: "",
    registerNumber: "",
  };
  const [chamberForm, setChamberForm] = useState(emptyChamberForm);
  const [chamberLookup, setChamberLookup] = useState("");
  const [chamberFoundPatient, setChamberFoundPatient] =
    useState<FoundPatientInfo | null>(null);
  const [chamberLookupMsg, setChamberLookupMsg] = useState("");
  const [chamberSubmitted, setChamberSubmitted] = useState(false);

  // Admitted booking form
  const emptyAdmitForm = {
    patientName: "",
    phone: "",
    doctor: "",
    admissionDate: "",
    hospitalName: "",
    bedWardNumber: "",
    admissionReason: "",
    referringDoctor: "",
    registerNumber: "",
  };
  const [admitForm, setAdmitForm] = useState(emptyAdmitForm);
  const [admitLookup, setAdmitLookup] = useState("");
  const [admitFoundPatient, setAdmitFoundPatient] =
    useState<FoundPatientInfo | null>(null);
  const [admitLookupMsg, setAdmitLookupMsg] = useState("");
  const [admitSubmitted, setAdmitSubmitted] = useState(false);

  const [bookingCount, setBookingCount] = useState(0);

  // Generic patient lookup from localStorage
  function lookupPatientRecord(query: string): FoundPatientInfo | null {
    if (!query.trim()) return null;
    const norm = (rn: string) => {
      const parts = rn.trim().split("/");
      if (parts.length === 2) {
        const n = Number.parseInt(parts[0].trim(), 10);
        return `${Number.isNaN(n) ? parts[0].trim() : n}/${parts[1].trim()}`;
      }
      return rn.trim().toLowerCase();
    };
    const isPhone =
      /^[0-9+\-() ]{7,}$/.test(query.trim()) && !query.includes("/");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("patients_")) continue;
      try {
        const arr = JSON.parse(localStorage.getItem(key) || "[]") as any[];
        let found: any;
        if (isPhone) {
          found = arr.find((p) =>
            p.phone?.replace(/\D/g, "").includes(query.replace(/\D/g, "")),
          );
        } else {
          found = arr.find(
            (p) =>
              p.registerNumber &&
              norm(String(p.registerNumber)) === norm(query),
          );
        }
        if (found) {
          const dob = found.dateOfBirth;
          let ageStr = "";
          if (dob) {
            try {
              const birthYear = new Date(
                Number(dob) > 1e12 ? Number(dob) / 1e6 : Number(dob),
              ).getFullYear();
              ageStr = `${new Date().getFullYear() - birthYear} yrs`;
            } catch {}
          }
          return {
            patientName: found.fullName || "",
            phone: found.phone || "",
            age: found.age ? String(found.age) : ageStr,
            gender: found.gender || "",
            registerNumber: found.registerNumber || "",
          };
        }
      } catch {}
    }
    return null;
  }

  const handleChamberLookup = (query: string) => {
    setChamberLookup(query);
    setChamberForm((f) => ({ ...f, registerNumber: query }));
    if (!query.trim()) {
      setChamberFoundPatient(null);
      setChamberLookupMsg("");
      return;
    }
    const found = lookupPatientRecord(query);
    if (found) {
      setChamberFoundPatient(found);
      setChamberForm((f) => ({
        ...f,
        patientName: found.patientName,
        phone: found.phone,
        registerNumber: query,
      }));
      setChamberLookupMsg(`✓ Found: ${found.patientName}`);
    } else {
      setChamberFoundPatient(null);
      setChamberLookupMsg(
        "Patient not found. Please contact the clinic to get registered first.",
      );
    }
  };

  const handleAdmitLookup = (query: string) => {
    setAdmitLookup(query);
    setAdmitForm((f) => ({ ...f, registerNumber: query }));
    if (!query.trim()) {
      setAdmitFoundPatient(null);
      setAdmitLookupMsg("");
      return;
    }
    const found = lookupPatientRecord(query);
    if (found) {
      setAdmitFoundPatient(found);
      setAdmitForm((f) => ({
        ...f,
        patientName: found.patientName,
        phone: found.phone,
        registerNumber: query,
      }));
      setAdmitLookupMsg(`✓ Found: ${found.patientName}`);
    } else {
      setAdmitFoundPatient(null);
      setAdmitLookupMsg(
        "Patient not found. Please contact the clinic to get registered first.",
      );
    }
  };

  function getOrAssignSerial(name: string, date: string): number {
    try {
      const existing = JSON.parse(
        localStorage.getItem("clinic_appointments") || "[]",
      ) as any[];
      const match = existing.find(
        (a: any) =>
          a.serialDate === date &&
          a.patientName?.trim().toLowerCase() === name.trim().toLowerCase() &&
          a.serialNumber,
      );
      if (match) return match.serialNumber;
      const daySerials = existing
        .filter((a: any) => a.serialDate === date && a.serialNumber)
        .map((a: any) => a.serialNumber as number);
      // Also check public bookings
      const pub = JSON.parse(
        localStorage.getItem("public_appointment_requests") || "[]",
      ) as any[];
      const pubDay = pub
        .filter(
          (a: any) => (a.preferredDate || a.date) === date && a.serialNumber,
        )
        .map((a: any) => a.serialNumber as number);
      const allSerials = [...daySerials, ...pubDay];
      return allSerials.length > 0 ? Math.max(...allSerials) + 1 : 1;
    } catch {
      return 1;
    }
  }

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bookingDate = chamberForm.date;
    const serial = chamberFoundPatient
      ? getOrAssignSerial(chamberForm.patientName, bookingDate)
      : undefined;
    if (
      !chamberForm.patientName ||
      !chamberForm.phone ||
      !chamberForm.doctor ||
      !chamberForm.date
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const newBooking = {
      id: Math.random().toString(36).slice(2, 10),
      patientName: chamberForm.patientName,
      phone: chamberForm.phone,
      doctor: chamberForm.doctor,
      preferredDate: chamberForm.date,
      preferredTime: chamberForm.time,
      reason: chamberForm.reason,
      preferredChamber: chamberForm.chamber,
      registerNumber: chamberForm.registerNumber,
      submittedAt: new Date().toISOString(),
      status: "pending" as const,
      appointmentType: "chamber",
      serialNumber: serial,
      serialDate: bookingDate,
    };
    const existing = loadPublicBookings();
    savePublicBookings([...existing, newBooking]);
    setBookingCount(existing.length + 1);
    setChamberSubmitted(true);
    toast.success("Chamber appointment request submitted!");
  };

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !admitForm.patientName ||
      !admitForm.phone ||
      !admitForm.admissionDate
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const serial = admitFoundPatient
      ? getOrAssignSerial(admitForm.patientName, admitForm.admissionDate)
      : undefined;
    const newBooking = {
      id: Math.random().toString(36).slice(2, 10),
      patientName: admitForm.patientName,
      phone: admitForm.phone,
      doctor: admitForm.doctor,
      preferredDate: admitForm.admissionDate,
      hospitalName: admitForm.hospitalName,
      bedWardNumber: admitForm.bedWardNumber,
      admissionReason: admitForm.admissionReason,
      referringDoctor: admitForm.referringDoctor,
      registerNumber: admitForm.registerNumber,
      submittedAt: new Date().toISOString(),
      status: "pending" as const,
      appointmentType: "admitted",
      serialNumber: serial,
      serialDate: admitForm.admissionDate,
    };
    const existing = loadPublicBookings();
    savePublicBookings([...existing, newBooking]);
    setBookingCount(existing.length + 1);
    setAdmitSubmitted(true);
    toast.success("Hospital admission request submitted!");
  };

  useEffect(() => {
    setBookingCount(loadPublicBookings().length);
  }, []);

  const navLinks = [
    { label: "Home", id: "home" },
    { label: "Classroom", id: "classroom" },
    { label: "Chamber", id: "chamber" },
    { label: "Appointments", id: "appointments" },
    { label: "CV", id: "cv" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const armanDoc = getContent("arman");
  const samiaDoc = getContent("samia");
  const allDocs = { arman: armanDoc, samia: samiaDoc };

  return (
    <div className="min-h-screen bg-background">
      {/* Emergency Consultation Modal */}
      <EmergencyConsultationModal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
      />

      {/* Profile Edit Dialog */}
      {editProfileKey && (
        <ProfileEditDialog
          doctorKey={editProfileKey}
          open={!!editProfileKey}
          onClose={() => setEditProfileKey(null)}
          updateField={updateField}
        />
      )}

      {/* ── Sticky Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-sm sm:text-base leading-tight">
              Dr. Arman Kabir&apos;s Care
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                type="button"
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                data-ocid={`nav.${link.label.toLowerCase()}.link`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Emergency Button (desktop) */}
            <Button
              size="sm"
              variant="destructive"
              className="hidden md:flex gap-1.5 font-semibold"
              onClick={() => setEmergencyOpen(true)}
              data-ocid="landing.emergency.button"
            >
              <AlertTriangle className="w-4 h-4" />
              Emergency
            </Button>

            {/* Admin mode indicator or login */}
            {isAdmin ? (
              <div className="hidden sm:flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400 text-amber-700 bg-amber-50"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Admin Mode
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    adminLogout();
                    toast.success("Admin logged out");
                  }}
                  className="text-xs"
                  data-ocid="landing.admin_logout.button"
                >
                  Admin Logout
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="hidden sm:flex gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={onAdminLoginClick}
                data-ocid="landing.admin_login.button"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Login
              </Button>
            )}

            <Button
              onClick={onLoginClick}
              size="sm"
              className="hidden sm:flex gap-2"
              data-ocid="landing.staff_login.button"
            >
              <Stethoscope className="w-4 h-4" />
              Staff Login
            </Button>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-ocid="landing.menu.toggle"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background px-4 pb-3"
            >
              {navLinks.map((link) => (
                <button
                  type="button"
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors block"
                >
                  {link.label}
                </button>
              ))}
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-2 gap-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setEmergencyOpen(true);
                }}
                data-ocid="landing.emergency_mobile.button"
              >
                <AlertTriangle className="w-4 h-4" />
                Emergency Consultation
              </Button>
              {isAdmin ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-2 border-amber-300 text-amber-700"
                  onClick={() => {
                    adminLogout();
                    setMobileMenuOpen(false);
                    toast.success("Admin logged out");
                  }}
                  data-ocid="landing.admin_logout_mobile.button"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Logout
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-2 border-amber-300 text-amber-700"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAdminLoginClick();
                  }}
                  data-ocid="landing.admin_login_mobile.button"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Login
                </Button>
              )}
              <Button
                onClick={onLoginClick}
                size="sm"
                className="w-full mt-2 gap-2"
              >
                <Stethoscope className="w-4 h-4" />
                Staff Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Home / Hero ─────────────────────────────────────────────── */}
      <section id="home" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-5">
              <Heart className="w-4 h-4" />
              Excellence in Patient Care &amp; Medical Education
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
              Dr. Arman Kabir&apos;s
              <span className="text-primary"> Care</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A comprehensive patient management and medical education platform
              serving patients and students across Bangladesh.
            </p>
            <div className="mt-6">
              <Button
                variant="destructive"
                size="lg"
                className="gap-2 font-semibold shadow-lg"
                onClick={() => setEmergencyOpen(true)}
                data-ocid="landing.emergency_hero.button"
              >
                <AlertTriangle className="w-5 h-5" />
                Emergency Consultation
              </Button>
            </div>
          </motion.div>

          {/* Doctor Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["arman", "samia"] as const).map((key, idx) => {
              const doc = allDocs[key];
              const initials = doc.name
                .split(" ")
                .slice(1, 3)
                .map((w: string) => w[0])
                .join("");
              const accentColor =
                key === "arman"
                  ? "bg-primary text-primary-foreground"
                  : "bg-rose-600 text-white";
              const borderColor =
                key === "arman" ? "border-primary/20" : "border-rose-200";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                >
                  <Card
                    className={`border-2 ${borderColor} hover:shadow-lg transition-all`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {(() => {
                          const photoKey =
                            key === "arman"
                              ? "medicare_doctor_photo_arman"
                              : "medicare_doctor_photo_samia";
                          const savedPhoto = localStorage.getItem(photoKey);
                          return savedPhoto ? (
                            <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden border-2 border-border">
                              <img
                                src={savedPhoto}
                                alt={doc.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-16 h-16 rounded-2xl ${accentColor} flex items-center justify-center text-xl font-bold shrink-0`}
                            >
                              {initials}
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h2 className="font-display text-xl font-bold text-foreground">
                            {doc.name}
                          </h2>
                          <p className="text-primary font-medium text-sm">
                            {doc.degree}
                          </p>
                          {((doc.posts as string[]) || []).map((post) => (
                            <p
                              key={post}
                              className="text-xs text-muted-foreground mt-0.5"
                            >
                              {post}
                            </p>
                          ))}
                          <p className="text-muted-foreground text-sm">
                            {doc.specialization}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>{doc.hospital}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{doc.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 shrink-0" />
                          <span className="truncate">{doc.email}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => scrollTo("appointments")}
                          className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold ${accentColor} transition-opacity hover:opacity-90`}
                        >
                          Book Appointment
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollTo("cv")}
                          className="flex-1 text-center py-2 rounded-lg text-sm font-semibold border border-border hover:bg-accent transition-colors"
                        >
                          View CV
                        </button>
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => setEditProfileKey(key)}
                              data-ocid={`profile.${key}.edit_button`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit Profile
                            </Button>
                            <label className="cursor-pointer">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors">
                                <Upload className="w-3 h-3" />
                                Photo
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const photoKey =
                                      key === "arman"
                                        ? "medicare_doctor_photo_arman"
                                        : "medicare_doctor_photo_samia";
                                    localStorage.setItem(
                                      photoKey,
                                      ev.target?.result as string,
                                    );
                                    import("sonner").then(({ toast }) =>
                                      toast.success(
                                        "Photo updated — refresh to see",
                                      ),
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Classroom ──────────────────────────────────────────────── */}
      <section id="classroom" className="py-16 bg-muted/30 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Classroom
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Lecture notes, schedules, videos, and announcements for students.
            </p>
          </motion.div>

          <Tabs defaultValue="arman" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger
                value="arman"
                className="gap-2"
                data-ocid="classroom.arman.tab"
              >
                Dr. Arman&apos;s Classroom
              </TabsTrigger>
              <TabsTrigger
                value="samia"
                className="gap-2"
                data-ocid="classroom.samia.tab"
              >
                Dr. Samia&apos;s Classroom
              </TabsTrigger>
            </TabsList>
            <TabsContent value="arman">
              <ClassroomContent
                doctorKey="arman"
                isAdmin={isAdmin}
                updateField={updateField}
              />
            </TabsContent>
            <TabsContent value="samia">
              <ClassroomContent
                doctorKey="samia"
                isAdmin={isAdmin}
                updateField={updateField}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ── Chamber Address ─────────────────────────────────────────── */}
      <section id="chamber" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Chamber Address
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Visit us at our clinic chambers for consultations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["arman", "samia"] as const).map((key, docIdx) => {
              const doc = allDocs[key];
              const chambers = (doc.chambers as any[]) || [];
              const accentColor =
                key === "arman" ? "text-primary" : "text-rose-600";
              const bg = key === "arman" ? "bg-primary/10" : "bg-rose-100";
              const border =
                key === "arman" ? "border-primary/30" : "border-rose-300";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: docIdx === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: docIdx * 0.1 }}
                  className="space-y-4"
                >
                  {/* Doctor header + Add chamber button */}
                  <div className="flex items-center justify-between">
                    <h3
                      className={`flex items-center gap-2 font-semibold text-lg ${accentColor}`}
                    >
                      <MapPin className="w-5 h-5" />
                      {doc.name}
                    </h3>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setChamberEditForm({
                            id: "",
                            nameBn: "",
                            addressBn: "",
                            address: "",
                            visitingHours: "",
                            phone: "",
                            emergencyPhone: "",
                          });
                          setEditChamberIdx(-1);
                          setEditChamberKey(key);
                        }}
                        data-ocid="chamber.open_modal_button"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Chamber
                      </Button>
                    )}
                  </div>

                  {chambers.map((chamber: any, cIdx: number) => (
                    <Card
                      key={chamber.id || cIdx}
                      className={`border-2 ${border}`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle
                          className={`flex items-center justify-between gap-2 ${accentColor} text-base`}
                        >
                          <span>{chamber.nameBn || chamber.address}</span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                                onClick={() => {
                                  setChamberEditForm({
                                    id: chamber.id || String(cIdx),
                                    nameBn: chamber.nameBn || "",
                                    addressBn: chamber.addressBn || "",
                                    address: chamber.address || "",
                                    visitingHours: chamber.visitingHours || "",
                                    phone: chamber.phone || "",
                                    emergencyPhone:
                                      chamber.emergencyPhone || "",
                                  });
                                  setEditChamberIdx(cIdx);
                                  setEditChamberKey(key);
                                }}
                                data-ocid="chamber.edit_button"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
                                disabled={chambers.length <= 1}
                                onClick={() => {
                                  if (!confirm("Delete this chamber?")) return;
                                  const updated = chambers.filter(
                                    (_: any, i: number) => i !== cIdx,
                                  );
                                  updateChambers(key, updated);
                                }}
                                data-ocid="chamber.delete_button"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className={`p-4 rounded-xl ${bg}`}>
                          <div className="flex items-start gap-3">
                            <MapPin
                              className={`w-5 h-5 ${accentColor} shrink-0 mt-0.5`}
                            />
                            <div>
                              {chamber.addressBn && (
                                <p
                                  className="text-sm font-medium text-foreground"
                                  style={{
                                    fontFamily:
                                      "'Noto Sans Bengali', Arial, sans-serif",
                                  }}
                                >
                                  {chamber.addressBn
                                    .split("\n")
                                    .map(
                                      (
                                        line: string,
                                        lineIdx: number,
                                        arr: string[],
                                      ) => (
                                        <span key={line}>
                                          {line}
                                          {lineIdx < arr.length - 1 && <br />}
                                        </span>
                                      ),
                                    )}
                                </p>
                              )}
                              {chamber.address && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {chamber.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {chamber.visitingHours && (
                            <div className="flex items-center gap-3">
                              <Clock
                                className={`w-4 h-4 ${accentColor} shrink-0`}
                              />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Visiting Hours
                                </p>
                                <p className="text-sm font-medium">
                                  {chamber.visitingHours}
                                </p>
                              </div>
                            </div>
                          )}
                          {chamber.phone && (
                            <div className="flex items-center gap-3">
                              <Phone
                                className={`w-4 h-4 ${accentColor} shrink-0`}
                              />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Phone
                                </p>
                                <p className="text-sm font-medium">
                                  {chamber.phone}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Mail
                              className={`w-4 h-4 ${accentColor} shrink-0`}
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Email
                              </p>
                              <p className="text-sm font-medium">{doc.email}</p>
                            </div>
                          </div>
                          {chamber.emergencyPhone && (
                            <div className="flex items-center gap-3">
                              <PhoneCall
                                className={`w-4 h-4 ${accentColor} shrink-0`}
                              />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Emergency
                                </p>
                                <p className="text-sm font-medium">
                                  {chamber.emergencyPhone}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chamber Add/Edit Dialog */}
      {editChamberKey && (
        <Dialog
          open={!!editChamberKey}
          onOpenChange={(o) => !o && setEditChamberKey(null)}
        >
          <DialogContent className="max-w-md" data-ocid="chamber.dialog">
            <DialogHeader>
              <DialogTitle>
                {editChamberIdx === -1 ? "Add Chamber" : "Edit Chamber"} —{" "}
                {editChamberKey === "arman"
                  ? "Dr. Arman Kabir"
                  : "Dr. Samia Shikder"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name (Bangla)</Label>
                <Input
                  value={chamberEditForm.nameBn}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({
                      ...f,
                      nameBn: e.target.value,
                    }))
                  }
                  placeholder="চেম্বারের নাম"
                  data-ocid="chamber.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address (Bangla)</Label>
                <Textarea
                  value={chamberEditForm.addressBn}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({
                      ...f,
                      addressBn: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="বাংলা ঠিকানা"
                  data-ocid="chamber.textarea"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address (English)</Label>
                <Textarea
                  value={chamberEditForm.address}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({
                      ...f,
                      address: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="English address"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Visiting Hours</Label>
                <Input
                  value={chamberEditForm.visitingHours}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({
                      ...f,
                      visitingHours: e.target.value,
                    }))
                  }
                  placeholder="e.g. Sat–Thu: 5 PM – 9 PM"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={chamberEditForm.phone}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Phone</Label>
                <Input
                  value={chamberEditForm.emergencyPhone}
                  onChange={(e) =>
                    setChamberEditForm((f) => ({
                      ...f,
                      emergencyPhone: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!editChamberKey) return;
                    const doc = allDocs[editChamberKey];
                    const chambers = (doc.chambers as any[]) || [];
                    if (editChamberIdx === -1) {
                      // Add new
                      const newChamber = {
                        ...chamberEditForm,
                        id: Date.now().toString(),
                      };
                      updateChambers(editChamberKey, [...chambers, newChamber]);
                    } else {
                      // Update existing
                      const updated = chambers.map((c: any, i: number) =>
                        i === editChamberIdx ? { ...c, ...chamberEditForm } : c,
                      );
                      updateChambers(editChamberKey, updated);
                    }
                    setEditChamberKey(null);
                    toast.success(
                      editChamberIdx === -1
                        ? "Chamber added"
                        : "Chamber updated",
                    );
                  }}
                  data-ocid="chamber.confirm_button"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditChamberKey(null)}
                  data-ocid="chamber.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Appointments ────────────────────────────────────────────── */}
      <section id="appointments" className="py-16 bg-muted/30 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Book an Appointment
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Fill in your details and we will confirm your appointment.
              {bookingCount > 0 && (
                <span className="ml-1 text-primary font-medium">
                  {bookingCount} appointment{bookingCount !== 1 ? "s" : ""}{" "}
                  booked so far.
                </span>
              )}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key="booking-tabs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
              data-ocid="appointments.booking.panel"
            >
              {/* Tab switcher */}
              <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setActiveBookingTab("chamber")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${activeBookingTab === "chamber" ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
                  data-ocid="appointments.booking.chamber_tab"
                >
                  <Stethoscope className="w-4 h-4" />
                  Chamber (Outpatient)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBookingTab("admitted")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${activeBookingTab === "admitted" ? "bg-card text-rose-700 shadow-sm border border-rose-200" : "text-muted-foreground hover:text-foreground"}`}
                  data-ocid="appointments.booking.admitted_tab"
                >
                  <Building2 className="w-4 h-4" />
                  Hospital (Admitted)
                </button>
              </div>

              {/* Chamber booking */}
              {activeBookingTab === "chamber" &&
                (chamberSubmitted ? (
                  <div
                    className="text-center py-10"
                    data-ocid="appointments.chamber.success_state"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      Chamber Appointment Submitted!
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Our staff will confirm your appointment shortly.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setChamberSubmitted(false);
                        setChamberForm(emptyChamberForm);
                        setChamberLookup("");
                        setChamberFoundPatient(null);
                        setChamberLookupMsg("");
                      }}
                      data-ocid="appointments.chamber.new_button"
                    >
                      Book Another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <Card className="border-2 border-primary/20">
                      <CardContent className="p-5 space-y-4">
                        {/* Patient search */}
                        <div className="space-y-1.5">
                          <Label>
                            Search Patient{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              (Register No. or Mobile)
                            </span>
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="0001/26 or 01XXXXXXXXX — auto-fills details"
                              value={chamberLookup}
                              onChange={(e) =>
                                handleChamberLookup(e.target.value)
                              }
                              data-ocid="appointments.chamber.lookup_input"
                            />
                          </div>
                          {chamberLookupMsg && (
                            <p
                              className={`text-xs font-medium ${chamberLookupMsg.startsWith("✓") ? "text-emerald-600" : "text-amber-600"}`}
                            >
                              {chamberLookupMsg}
                            </p>
                          )}
                        </div>

                        {/* Found patient card */}
                        {chamberFoundPatient && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-emerald-900 text-sm">
                                {chamberFoundPatient.patientName}
                              </p>
                              <div className="flex gap-3 text-xs text-emerald-700 mt-0.5 flex-wrap">
                                {chamberFoundPatient.age && (
                                  <span>Age: {chamberFoundPatient.age}</span>
                                )}
                                {chamberFoundPatient.gender && (
                                  <span>{chamberFoundPatient.gender}</span>
                                )}
                                {chamberFoundPatient.phone && (
                                  <span>{chamberFoundPatient.phone}</span>
                                )}
                                {chamberFoundPatient.registerNumber && (
                                  <span className="font-mono">
                                    Reg: {chamberFoundPatient.registerNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fallback name/phone if not found via lookup */}
                        {!chamberFoundPatient && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>
                                Patient Name{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                placeholder="Full name"
                                value={chamberForm.patientName}
                                onChange={(e) =>
                                  setChamberForm((f) => ({
                                    ...f,
                                    patientName: e.target.value,
                                  }))
                                }
                                data-ocid="appointments.chamber.name_input"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Phone{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="tel"
                                placeholder="+880 1XXXXXXXXX"
                                value={chamberForm.phone}
                                onChange={(e) =>
                                  setChamberForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                  }))
                                }
                                data-ocid="appointments.chamber.phone_input"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>
                              Doctor <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={chamberForm.doctor}
                              onValueChange={(v) =>
                                setChamberForm((f) => ({
                                  ...f,
                                  doctor: v,
                                  chamber: "",
                                }))
                              }
                            >
                              <SelectTrigger data-ocid="appointments.chamber.doctor_select">
                                <SelectValue placeholder="Select doctor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr. Arman Kabir">
                                  Dr. Arman Kabir
                                </SelectItem>
                                <SelectItem value="Dr. Samia Shikder">
                                  Dr. Samia Shikder
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(() => {
                            const dKey =
                              chamberForm.doctor === "Dr. Arman Kabir"
                                ? "arman"
                                : chamberForm.doctor === "Dr. Samia Shikder"
                                  ? "samia"
                                  : null;
                            const dChambers = dKey
                              ? (allDocs[dKey as "arman" | "samia"]
                                  ?.chambers as any[]) || []
                              : [];
                            if (dChambers.length === 0) return null;
                            return (
                              <div className="space-y-1.5">
                                <Label>Chamber</Label>
                                <Select
                                  value={chamberForm.chamber}
                                  onValueChange={(v) =>
                                    setChamberForm((f) => ({
                                      ...f,
                                      chamber: v,
                                    }))
                                  }
                                >
                                  <SelectTrigger data-ocid="appointments.chamber.chamber_select">
                                    <SelectValue placeholder="Select chamber" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dChambers.map((ch: any, i: number) => (
                                      <SelectItem
                                        key={ch.id || i}
                                        value={
                                          ch.address ||
                                          ch.nameBn ||
                                          `Chamber ${i + 1}`
                                        }
                                      >
                                        {ch.address ||
                                          ch.nameBn ||
                                          `Chamber ${i + 1}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>
                              Preferred Date{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="date"
                              value={chamberForm.date}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) =>
                                setChamberForm((f) => ({
                                  ...f,
                                  date: e.target.value,
                                }))
                              }
                              data-ocid="appointments.chamber.date_input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Preferred Time</Label>
                            <Input
                              type="time"
                              value={chamberForm.time}
                              onChange={(e) =>
                                setChamberForm((f) => ({
                                  ...f,
                                  time: e.target.value,
                                }))
                              }
                              data-ocid="appointments.chamber.time_input"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Reason for Visit</Label>
                          <Textarea
                            placeholder="Briefly describe your symptoms..."
                            rows={2}
                            value={chamberForm.reason}
                            onChange={(e) =>
                              setChamberForm((f) => ({
                                ...f,
                                reason: e.target.value,
                              }))
                            }
                            className="resize-none"
                            data-ocid="appointments.chamber.reason_input"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-11 font-semibold"
                          data-ocid="appointments.chamber.submit_button"
                        >
                          <CalendarDays className="w-4 h-4 mr-2" />
                          Submit Chamber Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  </form>
                ))}

              {/* Hospital/Admitted booking */}
              {activeBookingTab === "admitted" &&
                (admitSubmitted ? (
                  <div
                    className="text-center py-10"
                    data-ocid="appointments.admitted.success_state"
                  >
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      Admission Request Submitted!
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Our staff will confirm your hospital admission shortly.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdmitSubmitted(false);
                        setAdmitForm(emptyAdmitForm);
                        setAdmitLookup("");
                        setAdmitFoundPatient(null);
                        setAdmitLookupMsg("");
                      }}
                      data-ocid="appointments.admitted.new_button"
                    >
                      New Request
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAdmitSubmit} className="space-y-4">
                    <Card className="border-2 border-rose-200">
                      <CardContent className="p-5 space-y-4">
                        {/* Patient search */}
                        <div className="space-y-1.5">
                          <Label>
                            Search Patient{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              (Register No. or Mobile)
                            </span>
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="0001/26 or 01XXXXXXXXX — auto-fills details"
                              value={admitLookup}
                              onChange={(e) =>
                                handleAdmitLookup(e.target.value)
                              }
                              data-ocid="appointments.admitted.lookup_input"
                            />
                          </div>
                          {admitLookupMsg && (
                            <p
                              className={`text-xs font-medium ${admitLookupMsg.startsWith("✓") ? "text-emerald-600" : "text-amber-600"}`}
                            >
                              {admitLookupMsg}
                            </p>
                          )}
                        </div>

                        {/* Found patient card */}
                        {admitFoundPatient && (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-rose-900 text-sm">
                                {admitFoundPatient.patientName}
                              </p>
                              <div className="flex gap-3 text-xs text-rose-700 mt-0.5 flex-wrap">
                                {admitFoundPatient.age && (
                                  <span>Age: {admitFoundPatient.age}</span>
                                )}
                                {admitFoundPatient.gender && (
                                  <span>{admitFoundPatient.gender}</span>
                                )}
                                {admitFoundPatient.phone && (
                                  <span>{admitFoundPatient.phone}</span>
                                )}
                                {admitFoundPatient.registerNumber && (
                                  <span className="font-mono">
                                    Reg: {admitFoundPatient.registerNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fallback name/phone */}
                        {!admitFoundPatient && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>
                                Patient Name{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                placeholder="Full name"
                                value={admitForm.patientName}
                                onChange={(e) =>
                                  setAdmitForm((f) => ({
                                    ...f,
                                    patientName: e.target.value,
                                  }))
                                }
                                data-ocid="appointments.admitted.name_input"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Phone{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="tel"
                                placeholder="+880 1XXXXXXXXX"
                                value={admitForm.phone}
                                onChange={(e) =>
                                  setAdmitForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                  }))
                                }
                                data-ocid="appointments.admitted.phone_input"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>
                              Admission Date{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="date"
                              value={admitForm.admissionDate}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) =>
                                setAdmitForm((f) => ({
                                  ...f,
                                  admissionDate: e.target.value,
                                }))
                              }
                              data-ocid="appointments.admitted.date_input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Hospital Name</Label>
                            <Input
                              placeholder="e.g. DMCH, BSMMU"
                              value={admitForm.hospitalName}
                              onChange={(e) =>
                                setAdmitForm((f) => ({
                                  ...f,
                                  hospitalName: e.target.value,
                                }))
                              }
                              data-ocid="appointments.admitted.hospital_input"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Bed / Ward (optional)</Label>
                            <Input
                              placeholder="e.g. Ward 7, Bed 12"
                              value={admitForm.bedWardNumber}
                              onChange={(e) =>
                                setAdmitForm((f) => ({
                                  ...f,
                                  bedWardNumber: e.target.value,
                                }))
                              }
                              data-ocid="appointments.admitted.bed_input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Doctor</Label>
                            <Select
                              value={admitForm.doctor}
                              onValueChange={(v) =>
                                setAdmitForm((f) => ({ ...f, doctor: v }))
                              }
                            >
                              <SelectTrigger data-ocid="appointments.admitted.doctor_select">
                                <SelectValue placeholder="Select doctor (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr. Arman Kabir">
                                  Dr. Arman Kabir
                                </SelectItem>
                                <SelectItem value="Dr. Samia Shikder">
                                  Dr. Samia Shikder
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Referring Doctor (optional)</Label>
                          <Input
                            placeholder="Referring doctor name"
                            value={admitForm.referringDoctor}
                            onChange={(e) =>
                              setAdmitForm((f) => ({
                                ...f,
                                referringDoctor: e.target.value,
                              }))
                            }
                            data-ocid="appointments.admitted.referring_input"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Admission Reason</Label>
                          <Textarea
                            placeholder="Reason for admission / chief complaint..."
                            rows={2}
                            value={admitForm.admissionReason}
                            onChange={(e) =>
                              setAdmitForm((f) => ({
                                ...f,
                                admissionReason: e.target.value,
                              }))
                            }
                            className="resize-none"
                            data-ocid="appointments.admitted.reason_input"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-11 font-semibold bg-rose-600 hover:bg-rose-700"
                          data-ocid="appointments.admitted.submit_button"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Submit Admission Request
                        </Button>
                      </CardContent>
                    </Card>
                  </form>
                ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── CV ──────────────────────────────────────────────────────── */}
      <section id="cv" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Curriculum Vitae
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Academic qualifications, experience, and publications.
            </p>
          </motion.div>

          <Tabs defaultValue="arman" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="arman" data-ocid="cv.arman.tab">
                Dr. Arman Kabir
              </TabsTrigger>
              <TabsTrigger value="samia" data-ocid="cv.samia.tab">
                Dr. Samia Shikder
              </TabsTrigger>
            </TabsList>
            <TabsContent value="arman">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <CVContent
                    doctorKey="arman"
                    isAdmin={isAdmin}
                    updateField={updateField}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="samia">
              <Card className="border-2 border-rose-200">
                <CardContent className="p-6">
                  <CVContent
                    doctorKey="samia"
                    isAdmin={isAdmin}
                    updateField={updateField}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ── Admin Tools ──────────────────────────────────────────── */}
      {isAdmin && (
        <section className="py-12 px-4 bg-amber-50/30 border-t border-amber-100">
          <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              Admin Tools
            </h2>
            <StaffApprovalsAdmin />
            <PrescriptionPDFManager />
            <TreatmentReferencePDFAdmin />
            <DifferentialDiagnosisPDFAdmin />
            <InterpretationRefPDFAdmin />
          </div>
        </section>
      )}
      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-border bg-muted/20 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Dr. Arman Kabir&apos;s Care
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with{" "}
            <Heart className="w-3 h-3 inline text-rose-500" /> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              caffeine.ai
            </a>
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1.5"
              onClick={onLoginClick}
              data-ocid="footer.staff_login.button"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Staff Login
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1.5 text-amber-700"
              onClick={onAdminLoginClick}
              data-ocid="footer.admin_login.button"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </Button>
          </div>
        </div>
      </footer>

      {/* Floating Emergency Button (mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <button
          type="button"
          className="w-14 h-14 rounded-full bg-destructive text-white shadow-xl flex items-center justify-center hover:bg-destructive/90 active:scale-95 transition-all"
          onClick={() => setEmergencyOpen(true)}
          data-ocid="landing.emergency_fab.button"
        >
          <AlertTriangle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
