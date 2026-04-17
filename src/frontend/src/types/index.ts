// ─── Domain types for Dr. Arman Kabir's Care ─────────────────────────────────
// These types were previously imported from backend.d which is a protected stub.
// All domain types live here.

import type { Principal } from "@icp-sdk/core/principal";

// ── Staff Role System ─────────────────────────────────────────────────────────
export type StaffRole =
  | "admin"
  | "consultant_doctor"
  | "medical_officer"
  | "intern_doctor"
  | "nurse"
  | "staff"
  | "doctor"
  | "patient";

export const STAFF_ROLE_LABELS: Record<
  Exclude<StaffRole, "admin" | "patient">,
  string
> = {
  consultant_doctor: "Consultant Doctor",
  medical_officer: "Medical Officer",
  intern_doctor: "Intern Doctor",
  nurse: "Nurse",
  staff: "Staff / Reception",
  doctor: "Consultant Doctor",
};

export const STAFF_ROLE_COLORS: Record<
  Exclude<StaffRole, "admin" | "patient">,
  string
> = {
  consultant_doctor: "bg-purple-100 text-purple-800 border-purple-200",
  medical_officer: "bg-blue-100 text-blue-800 border-blue-200",
  intern_doctor: "bg-sky-100 text-sky-800 border-sky-200",
  nurse: "bg-pink-100 text-pink-800 border-pink-200",
  staff: "bg-amber-100 text-amber-800 border-amber-200",
  doctor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export type Gender = "male" | "female" | "other";

export interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  oxygenSaturation?: string;
  respiratoryRate?: string;
  weight?: string;
  height?: string;
  [key: string]: string | undefined;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  drugForm?: string;
  drugName?: string;
  route?: string;
  routeBn?: string;
  frequencyBn?: string;
  durationBn?: string;
  instructionsBn?: string;
  specialInstruction?: string;
  specialInstructionBn?: string;
  [key: string]: string | undefined;
}

export interface ConsultantAssignment {
  email: string;
  name: string;
  assignedAt: string; // ISO date
  assignedBy: string; // email of who assigned
}

export interface Patient {
  id: bigint;
  fullName: string;
  nameBn?: string;
  dateOfBirth?: bigint;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  weight?: number;
  height?: number;
  allergies: string[];
  chronicConditions: string[];
  pastSurgicalHistory?: string;
  patientType: "outdoor" | "indoor" | "emergency" | "admitted";
  createdAt: bigint;
  registerNumber?: string;
  photo?: string;
  // Extended fields
  department?: string;
  bedNumber?: string;
  ward?: string;
  hospitalName?: string;
  admittedOn?: string; // ISO string of admission date
  admissionDate?: string;
  dischargeDate?: string;
  isAdmitted?: boolean;
  status?: "Admitted" | "Discharged" | "Active";
  signUpEnabled?: boolean;
  edd?: string; // Expected delivery date
  lmpDate?: string; // Last menstrual period
  consultantAssignment?: ConsultantAssignment;
  [key: string]: unknown;
}

export interface Visit {
  id: bigint;
  patientId: bigint;
  visitDate: bigint;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  vitalSigns: VitalSigns;
  physicalExamination?: string;
  diagnosis?: string;
  notes?: string;
  visitType:
    | "outpatient"
    | "inpatient"
    | "emergency"
    | "follow-up"
    | "admitted";
  createdAt: bigint;
  [key: string]: unknown;
}

export interface Prescription {
  id: bigint;
  patientId: bigint;
  visitId?: bigint;
  prescriptionDate: bigint;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  createdAt: bigint;
  [key: string]: unknown;
}

export interface UserProfile {
  name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  address?: string;
  photo?: string;
  [key: string]: unknown;
}

// Appointment type
export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  phone: string;
  registerNumber?: string;
  age?: string;
  gender?: string;
  preferredDoctor: string;
  preferredChamber?: string;
  preferredDate: string;
  preferredTime: string;
  reason?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  createdBy?: string;
  notes?: string;
  /** 'chamber' = outpatient | 'admitted' = inpatient */
  appointmentType: "chamber" | "admitted";
  /** Admitted-only fields */
  hospitalName?: string;
  bedWardNumber?: string;
  admissionReason?: string;
  referringDoctor?: string;
  /** Serial number assigned for the day */
  serialNumber?: number;
  /** Date the serial was assigned (YYYY-MM-DD) */
  serialDate?: string;
  /** Time set by doctor (admitted patients only) */
  visitTime?: string;
}

// Serial Queue
export interface SerialEntry {
  id: string;
  serialNumber: number;
  patientName: string;
  phone?: string;
  status: "waiting" | "current" | "done" | "skipped";
  addedAt: string;
  calledAt?: string;
}

// ── Clinical Data Engine Types ─────────────────────────────────────────────────

export interface VersionedRecord {
  version: number;
  createdAt: bigint;
  createdBy: Principal;
  createdByName: string;
  createdByRole: StaffRole;
  changeReason?: string;
}

export interface Encounter {
  id: bigint;
  patientId: bigint;
  encounterId: string;
  encounterType: "OPD" | "IPD" | "Emergency" | "FollowUp";
  status: "Planned" | "InProgress" | "Completed" | "Cancelled";
  startDate: bigint;
  endDate?: bigint;
  providerId: Principal;
  providerName: string;
  locationNotes?: string;
  versionInfo: VersionedRecord;
  previousVersions: VersionedRecord[];
}

export interface Observation {
  id: bigint;
  patientId: bigint;
  encounterId?: bigint;
  observationType:
    | "Vital"
    | "Lab"
    | "ExamFinding"
    | "IntakeOutput"
    | "DrainMonitoring";
  code: string;
  value: string;
  numericValue?: number;
  unit: string;
  interpretation?: string;
  normalRange?: string;
  status: "Preliminary" | "Final" | "Corrected";
  observationDate: bigint;
  recordedBy: Principal;
  recordedByName: string;
  recordedByRole: StaffRole;
  versionInfo: VersionedRecord;
  isDeleted: boolean;
}

export interface ClinicalOrder {
  id: bigint;
  patientId: bigint;
  encounterId?: bigint;
  orderType: "Medication" | "LabTest" | "Procedure" | "Investigation";
  code: string;
  description: string;
  status: "Requested" | "Pending" | "InProgress" | "Completed" | "Cancelled";
  orderedAt: bigint;
  orderedBy: Principal;
  orderedByName: string;
  orderedByRole: StaffRole;
  completedAt?: bigint;
  result?: string;
  notes?: string;
  versionInfo: VersionedRecord;
}

export interface ClinicalNote {
  id: bigint;
  patientId: bigint;
  encounterId?: bigint;
  noteType:
    | "SOAP"
    | "DailyProgress"
    | "Discharge"
    | "Nursing"
    | "Handover"
    | "General";
  noteSubtype?: string;
  authorId: Principal;
  authorName: string;
  authorRole: StaffRole;
  content: string; // JSON string for structured SOAP content
  isDraft: boolean;
  createdAt: bigint;
  versionInfo: VersionedRecord;
  previousVersionIds: bigint[];
  isDeleted: boolean;
}

export interface AuditEntry {
  id: bigint;
  entityType: string;
  entityId: bigint;
  fieldName: string;
  beforeValue?: string;
  afterValue: string;
  changedBy: Principal;
  changedByName: string;
  changedByRole: StaffRole;
  changedAt: bigint;
  reason?: string;
  ipAddress?: string;
}

export interface ClinicalAlert {
  id: bigint;
  patientId: bigint;
  alertType:
    | "Sepsis"
    | "AKI"
    | "Hypotension"
    | "Hypoxia"
    | "DrugInteraction"
    | "AllergyContraindication"
    | "CriticalLab"
    // Extended alert types
    | "SepticShock"
    | "ShockIndex"
    | "RespiratoryFailure"
    | "CardiacArrestRisk"
    | "Hyperkalemia"
    | "Hypokalemia"
    | "Hyponatremia"
    | "Hypernatremia"
    | "MetabolicAcidosis"
    | "HighAnionGap"
    | "QTProlongation"
    | "DrugContraindication"
    | "HypertensiveCrisis"
    | "Bradycardia"
    | "Tachycardia"
    | "HeartFailure"
    | "AsthmaExacerbation"
    | "COPDExacerbation"
    | "PERisk"
    | "Hypoglycemia"
    | "SevereHypoglycemia"
    | "Hyperglycemia"
    | "DKARisk"
    | "ThyroidStorm"
    | "MyxedemaComa"
    | "LowGCS"
    | "SeizureRisk"
    | "NeutropenicSepsis"
    | "AntibioticMismatch"
    | "MissedDose"
    | "OverdueInvestigation"
    | "DischargeRisk";
  severity: "Critical" | "Warning" | "Info";
  message: string;
  details?: string;
  triggeredAt: bigint;
  triggeredBy: string;
  isAcknowledged: boolean;
  acknowledgedBy?: Principal;
  acknowledgedAt?: bigint;
  isResolved: boolean;
  resolvedAt?: bigint;
}

// ── Extended Clinical Intelligence Types ──────────────────────────────────────

export interface ExtendedAlert {
  id: string;
  category:
    | "critical_emergency"
    | "renal_electrolyte"
    | "medication_safety"
    | "cardiovascular"
    | "respiratory"
    | "endocrine"
    | "neurology"
    | "infection_control"
    | "hospital_workflow";
  alertType: ClinicalAlert["alertType"];
  severity: "critical" | "warning" | "info";
  message: string;
  details: string;
  aiSuggestion?: string;
  triggeredAt: string;
}

export interface TrendAlert {
  id: string;
  metric: string;
  severity: "warning" | "info";
  message: string;
  details: string;
  trend: "rising" | "falling" | "stable";
}

export interface VitalReading {
  timestamp: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  spo2?: number;
  urineOutputMlKgHr?: number;
  gcs?: number;
}

export interface LabResult {
  timestamp: string;
  creatinine?: number;
  potassium?: number;
  sodium?: number;
  chloride?: number;
  bicarbonate?: number;
  ph?: number;
  glucose?: number;
  hemoglobin?: number;
  wbc?: number;
  neutrophils?: number;
  bnp?: number;
  lactate?: number;
  paco2?: number;
  anc?: number; // Absolute neutrophil count
}

export interface WorkflowData {
  medicationAdministrations?: Array<{
    drugName: string;
    scheduledTimes: string[];
    administeredTimes: string[];
    status: "given" | "not_given" | "delayed";
  }>;
  investigations?: Array<{
    name: string;
    orderedAt: string;
    status: "ordered" | "sample_collected" | "report_collected" | "completed";
  }>;
  isScheduledForDischarge?: boolean;
  hasActiveCriticalAlert?: boolean;
}

export interface ExtendedAlertInput {
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    spo2?: number;
    urineOutputMlKgHr?: number;
    gcs?: number;
    lactate?: number;
    paco2?: number;
    hasEdema?: boolean;
  };
  labs?: {
    creatinine?: number;
    creatininePrev?: number; // 48h ago
    potassium?: number;
    sodium?: number;
    chloride?: number;
    bicarbonate?: number;
    ph?: number;
    glucose?: number;
    wbc?: number;
    bnp?: number;
    neutrophils?: number;
    anc?: number;
  };
  medications?: Medication[];
  diagnoses?: string[]; // active diagnosis names (lowercase)
  allergies?: string[];
  peRiskFactors?: boolean; // immobility, recent surgery, DVT history
  workflowData?: WorkflowData;
}

// ── Admission History ─────────────────────────────────────────────────────────

export interface AdmissionHistory {
  id: string;
  patientId: string;
  admittedOn: string; // ISO string
  admittedBy: string; // doctor name
  admittedByRole: string;
  hospitalName: string;
  ward: string;
  bed: string;
  reasonForAdmission: string;
  carriedOverComplaints: string[];
  carriedOverDiagnosis: string[];
  carriedOverDrugHistory: string[];
  carriedOverPrescriptions: string[]; // prescription IDs
  admissionHistoryStatus: "complete" | "draft_awaiting_approval";
  dailyProgressNotes: unknown[];
  dischargedOn: string | null;
  status: "active" | "discharged";
  createdAt: string;
  consultantAssignment?: ConsultantAssignment;
}

export interface BedTransferEntry {
  fromBed: string;
  toBed: string;
  date: bigint;
  reason: string;
}

export interface BedRecord {
  id: bigint;
  bedNumber: string;
  ward: string;
  hospitalName: string;
  status: "Empty" | "Occupied" | "Maintenance";
  patientId?: bigint;
  patientName?: string;
  admissionDate?: bigint;
  dischargeDate?: bigint;
  transferHistory: BedTransferEntry[];
}

export interface DiagnosisTemplate {
  id: bigint;
  diagnosisName: string;
  diagnosisNameBn?: string;
  icdCode?: string;
  defaultDrugs: string[];
  defaultInvestigations: string[];
  defaultAdvice: string[];
  defaultAdviceBn: string[];
  createdBy: Principal;
  createdAt: bigint;
  isActive: boolean;
}

export interface TrendData {
  vital: string;
  direction: "improving" | "worsening" | "stable";
  summary: string;
  dataPoints: Array<{ date: Date; value: number }>;
}

export interface ClinicalIntelligence {
  alerts: ClinicalAlert[];
  trends: TrendData[];
  pendingTasks: number;
  stableIndicators: string[];
}

export interface SyncRecord {
  id: bigint;
  userId: Principal;
  deviceId: string;
  lastSyncAt: bigint;
  pendingChanges: bigint;
  lastEntityType?: string;
  lastEntityId?: bigint;
}

// ── Investigation tracking types ───────────────────────────────────────────────

export interface InvestigationLink {
  investigationId: string;
  prescriptionId: string;
  linkedAt: string;
}

export type InvestigationStatusType =
  | "ordered"
  | "sample_collected"
  | "report_collected";

// ── Prescription Record (versioned, admitted / chamber) ───────────────────────

export type PrescriptionLabel = "Order on Admission" | "Fresh Order" | null;

export type PrescriptionStatus =
  | "active"
  | "draft_awaiting_approval"
  | "approved"
  | "changes_requested";

export type PrescriptionHeaderType = "hospital" | "chamber";

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  createdByRole: StaffRole;
  label: PrescriptionLabel;
  labelTimestamp?: string;
  headerType: PrescriptionHeaderType;
  status: PrescriptionStatus;
  diagnosis?: string;
  drugs: unknown[];
  adviceText?: string;
  clinicalSummary?: Record<string, string>;
  approvalComment?: string;
  approvedBy?: string;
  approvedAt?: string;
  /** Legacy prescription id link (from original Prescription.id) */
  linkedPrescriptionId?: string;
}

// ── Drug Reminder ──────────────────────────────────────────────────────────────

// ── Money Receipt ─────────────────────────────────────────────────────────────

export interface MoneyReceiptData {
  id: string;
  receiptNumber: string;
  type: "appointment" | "procedure";
  patientName: string;
  registerNumber?: string;
  phone?: string;
  doctorName?: string;
  service: string;
  amount: number;
  paid: boolean;
  date: string; // ISO string
  notes?: string;
  serialNumber?: number;
}

export interface DrugReminder {
  id: string;
  patientId: string;
  drugName: string;
  dose?: string;
  frequency?: string;
  startDate: string;
  prescriptionId?: string;
  status: "active" | "paused" | "completed";
  reminderTimes: string[];
  lastModified: string;
}
