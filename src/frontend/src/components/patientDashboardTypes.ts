/**
 * Shared types and localStorage helpers for the patient dashboard.
 * Extracted to keep PatientDashboard.tsx and pages/PatientDashboard.tsx DRY.
 */

const PATIENT_SUBMISSIONS_KEY = "medicare_patient_submissions";

export interface PatientSubmission {
  id: string;
  patientId: string;
  type: "complaint" | "vitals" | "investigation";
  data: Record<string, string>;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

export interface ComplaintEntry {
  id: string;
  patientId: string;
  text: string;
  timestamp: string;
  status: "pending" | "seen";
  doctorNote?: string;
}

export interface AdviceEntry {
  id: string;
  patientId: string;
  text: string;
  date: string;
  addedBy: string;
  source: string;
}

export interface DrugReminder {
  id: string;
  patientId: string;
  drugName: string;
  times: string[];
  enabled: boolean;
  createdAt: string;
}

// ── Daily Progress (SOAP) ─────────────────────────────────────────────────────
export interface SoapEntry {
  id: string;
  patientId: string;
  entryType: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  editedAt?: string;
}

export interface ProblemItem {
  id: string;
  name: string;
  status: "active" | "resolved";
  source: "prescription" | "manual";
}

const COMPLAINTS_KEY_PREFIX = "medicare_complaints_";
const ADVICE_KEY_PREFIX = "medicare_advice_entries_";
const DAILY_PROGRESS_KEY_PREFIX = "daily_progress_";
const PROBLEM_LIST_KEY_PREFIX = "problem_list_";

export function loadComplaints(patientId: string): ComplaintEntry[] {
  try {
    const raw = localStorage.getItem(COMPLAINTS_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw) as ComplaintEntry[];
  } catch {}
  return [];
}

export function saveComplaints(
  patientId: string,
  complaints: ComplaintEntry[],
): void {
  localStorage.setItem(
    COMPLAINTS_KEY_PREFIX + patientId,
    JSON.stringify(complaints),
  );
}

export function loadAdviceEntries(patientId: string): AdviceEntry[] {
  try {
    const raw = localStorage.getItem(ADVICE_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw) as AdviceEntry[];
  } catch {}
  return [];
}

export function saveAdviceEntries(
  patientId: string,
  entries: AdviceEntry[],
): void {
  localStorage.setItem(ADVICE_KEY_PREFIX + patientId, JSON.stringify(entries));
}

export function loadSubmissions(): PatientSubmission[] {
  try {
    const raw = localStorage.getItem(PATIENT_SUBMISSIONS_KEY);
    if (raw) return JSON.parse(raw) as PatientSubmission[];
  } catch {}
  return [];
}

export function saveSubmissions(subs: PatientSubmission[]): void {
  localStorage.setItem(PATIENT_SUBMISSIONS_KEY, JSON.stringify(subs));
}

export function loadDailyProgress(
  doctorEmail: string,
  patientId: string,
): SoapEntry[] {
  try {
    const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as SoapEntry[];
  } catch {}
  return [];
}

export function saveDailyProgress(
  doctorEmail: string,
  patientId: string,
  entries: SoapEntry[],
): void {
  const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(entries));
}

export function loadProblemList(
  doctorEmail: string,
  patientId: string,
): ProblemItem[] {
  try {
    const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ProblemItem[];
  } catch {}
  return [];
}

export function saveProblemList(
  doctorEmail: string,
  patientId: string,
  items: ProblemItem[],
): void {
  const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(items));
}
