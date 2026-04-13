import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface AuditEntry {
    id: bigint;
    changedByName: string;
    changedByRole: StaffRole;
    changedAt: bigint;
    changedBy: Principal;
    entityId: bigint;
    afterValue: string;
    beforeValue?: string;
    entityType: string;
    fieldName: string;
    ipAddress?: string;
    reason?: string;
}
export interface ClinicalOrder {
    id: bigint;
    status: OrderStatus;
    completedAt?: bigint;
    result?: string;
    patientId: bigint;
    code: string;
    description: string;
    orderType: OrderType;
    orderedAt: bigint;
    orderedBy: Principal;
    notes?: string;
    orderedByName: string;
    orderedByRole: StaffRole;
    versionInfo: VersionedRecord;
    encounterId?: bigint;
}
export interface Encounter {
    id: bigint;
    status: EncounterStatus;
    encounterType: EncounterType;
    endDate?: bigint;
    patientId: bigint;
    previousVersions: Array<VersionedRecord>;
    providerName: string;
    providerId: Principal;
    versionInfo: VersionedRecord;
    encounterId: string;
    locationNotes?: string;
    startDate: bigint;
}
export interface Patient {
    id: bigint;
    weight?: number;
    height?: number;
    consultantEmail?: string;
    nameBn?: string;
    consultantName?: string;
    dateOfBirth?: Time;
    createdAt: Time;
    fullName: string;
    email?: string;
    pastSurgicalHistory?: string;
    bloodGroup?: string;
    address?: string;
    gender: Gender;
    patientType: PatientType;
    chronicConditions: Array<string>;
    phone?: string;
    allergies: Array<string>;
}
export interface CurrentUser {
    principal: Principal;
    role: UserRole;
}
export interface VersionedRecord {
    createdAt: bigint;
    createdBy: Principal;
    version: bigint;
    createdByName: string;
    createdByRole: StaffRole;
    changeReason?: string;
}
export interface SyncRecord {
    id: bigint;
    lastEntityType?: string;
    userId: Principal;
    pendingChanges: bigint;
    deviceId: string;
    lastSyncAt: bigint;
    lastEntityId?: bigint;
}
export interface VitalSigns {
    respiratoryRate?: string;
    temperature?: string;
    bloodPressure?: string;
    oxygenSaturation?: string;
    pulse?: string;
}
export interface Visit {
    id: bigint;
    vitalSigns: VitalSigns;
    patientId: bigint;
    createdAt: Time;
    visitDate: Time;
    visitType: VisitType;
    diagnosis?: string;
    historyOfPresentIllness?: string;
    notes?: string;
    physicalExamination?: string;
    chiefComplaint: string;
}
export interface DiagnosisTemplate {
    id: bigint;
    createdAt: bigint;
    createdBy: Principal;
    icdCode?: string;
    isActive: boolean;
    defaultDrugs: Array<string>;
    defaultAdvice: Array<string>;
    defaultInvestigations: Array<string>;
    diagnosisNameBn?: string;
    diagnosisName: string;
    defaultAdviceBn: Array<string>;
}
export interface ClinicalNote {
    id: bigint;
    isDeleted: boolean;
    content: string;
    patientId: bigint;
    authorId: Principal;
    createdAt: bigint;
    authorName: string;
    authorRole: StaffRole;
    noteType: NoteType;
    isDraft: boolean;
    previousVersionIds: Array<bigint>;
    versionInfo: VersionedRecord;
    encounterId?: bigint;
    noteSubtype?: string;
}
export interface Observation {
    id: bigint;
    status: ObservationStatus;
    isDeleted: boolean;
    numericValue?: number;
    value: string;
    observationDate: bigint;
    patientId: bigint;
    observationType: ObservationType;
    code: string;
    unit: string;
    recordedBy: Principal;
    normalRange?: string;
    recordedByName: string;
    recordedByRole: StaffRole;
    interpretation?: string;
    versionInfo: VersionedRecord;
    encounterId?: bigint;
}
export interface BedRecord {
    id: bigint;
    status: BedStatus;
    patientId?: bigint;
    admissionDate?: bigint;
    transferHistory: Array<BedTransferEntry>;
    ward: string;
    bedNumber: string;
    patientName?: string;
    dischargeDate?: bigint;
}
export interface BedTransferEntry {
    toBed: string;
    date: bigint;
    fromBed: string;
    reason: string;
}
export interface ClinicalAlert {
    id: bigint;
    alertType: AlertType;
    acknowledgedAt?: bigint;
    acknowledgedBy?: Principal;
    patientId: bigint;
    isAcknowledged: boolean;
    isResolved: boolean;
    triggeredAt: bigint;
    triggeredBy: string;
    message: string;
    details?: string;
    severity: AlertSeverity;
    resolvedAt?: bigint;
}
export interface Prescription {
    id: bigint;
    patientId: bigint;
    createdAt: Time;
    diagnosis?: string;
    prescriptionDate: Time;
    medications: Array<Medication>;
    notes?: string;
    visitId?: bigint;
}
export interface Medication {
    duration: string;
    dose: string;
    name: string;
    instructions: string;
    frequency: string;
}
export interface UserProfile {
    name: string;
}
export enum AlertSeverity {
    Info = "Info",
    Critical = "Critical",
    Warning = "Warning"
}
export enum AlertType {
    AKI = "AKI",
    Hypotension = "Hypotension",
    CriticalLab = "CriticalLab",
    Sepsis = "Sepsis",
    DrugInteraction = "DrugInteraction",
    Hypoxia = "Hypoxia",
    AllergyContraindication = "AllergyContraindication"
}
export enum BedStatus {
    Empty = "Empty",
    Maintenance = "Maintenance",
    Occupied = "Occupied"
}
export enum EncounterStatus {
    Planned = "Planned",
    Cancelled = "Cancelled",
    InProgress = "InProgress",
    Completed = "Completed"
}
export enum EncounterType {
    IPD = "IPD",
    OPD = "OPD",
    FollowUp = "FollowUp",
    Emergency = "Emergency"
}
export enum Gender {
    other = "other",
    female = "female",
    male = "male"
}
export enum NoteType {
    SOAP = "SOAP",
    Nursing = "Nursing",
    DailyProgress = "DailyProgress",
    General = "General",
    Handover = "Handover",
    Discharge = "Discharge"
}
export enum ObservationStatus {
    Corrected = "Corrected",
    Final = "Final",
    Preliminary = "Preliminary"
}
export enum ObservationType {
    Lab = "Lab",
    ExamFinding = "ExamFinding",
    DrainMonitoring = "DrainMonitoring",
    IntakeOutput = "IntakeOutput",
    Vital = "Vital"
}
export enum OrderStatus {
    Requested = "Requested",
    Cancelled = "Cancelled",
    InProgress = "InProgress",
    Completed = "Completed",
    Pending = "Pending"
}
export enum OrderType {
    Medication = "Medication",
    Procedure = "Procedure",
    Investigation = "Investigation",
    LabTest = "LabTest"
}
export enum PatientType {
    admitted = "admitted",
    outdoor = "outdoor"
}
export enum StaffRole {
    patient = "patient",
    admin = "admin",
    doctor = "doctor",
    medical_officer = "medical_officer",
    intern_doctor = "intern_doctor",
    consultant_doctor = "consultant_doctor",
    staff = "staff",
    nurse = "nurse"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acknowledgeAlert(id: bigint): Promise<{
        __kind__: "ok";
        ok: ClinicalAlert;
    } | {
        __kind__: "err";
        err: string;
    }>;
    acknowledgeObservationCorrection(id: bigint, newValue: string, reason: string): Promise<{
        __kind__: "ok";
        ok: Observation;
    } | {
        __kind__: "err";
        err: string;
    }>;
    assignBed(bedId: bigint, patientId: bigint, patientName: string): Promise<{
        __kind__: "ok";
        ok: BedRecord;
    } | {
        __kind__: "err";
        err: string;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignConsultant(patientId: bigint, consultantEmail: string, consultantName: string): Promise<Patient>;
    createBedRecord(bedNumber: string, ward: string): Promise<{
        __kind__: "ok";
        ok: BedRecord;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createClinicalAlert(patientId: bigint, alertType: AlertType, severity: AlertSeverity, message: string, details: string | null): Promise<{
        __kind__: "ok";
        ok: ClinicalAlert;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createClinicalNote(patientId: bigint, encounterId: bigint | null, noteType: NoteType, noteSubtype: string | null, content: string, isDraft: boolean): Promise<{
        __kind__: "ok";
        ok: ClinicalNote;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createDiagnosisTemplate(diagnosisName: string, diagnosisNameBn: string | null, icdCode: string | null, defaultDrugs: Array<string>, defaultInvestigations: Array<string>, defaultAdvice: Array<string>, defaultAdviceBn: Array<string>): Promise<{
        __kind__: "ok";
        ok: DiagnosisTemplate;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createEncounter(patientId: bigint, encounterType: EncounterType, locationNotes: string | null): Promise<{
        __kind__: "ok";
        ok: Encounter;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createObservation(patientId: bigint, encounterId: bigint | null, observationType: ObservationType, code: string, value: string, numericValue: number | null, unit: string, interpretation: string | null, normalRange: string | null, observationDate: bigint): Promise<{
        __kind__: "ok";
        ok: Observation;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createOrder(patientId: bigint, encounterId: bigint | null, orderType: OrderType, code: string, description: string, notes: string | null): Promise<{
        __kind__: "ok";
        ok: ClinicalOrder;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createPatient(fullName: string, nameBn: string | null, dateOfBirth: Time | null, gender: Gender, phone: string | null, email: string | null, address: string | null, bloodGroup: string | null, weight: number | null, height: number | null, allergies: Array<string>, chronicConditions: Array<string>, pastSurgicalHistory: string | null, patientType: PatientType, consultantEmail: string | null, consultantName: string | null): Promise<Patient>;
    createPrescription(patientId: bigint, visitId: bigint | null, prescriptionDate: Time, diagnosis: string | null, medications: Array<Medication>, notes: string | null): Promise<Prescription>;
    createVisit(patientId: bigint, visitDate: Time, chiefComplaint: string, historyOfPresentIllness: string | null, vitalSigns: VitalSigns, physicalExamination: string | null, diagnosis: string | null, notes: string | null, visitType: VisitType): Promise<Visit>;
    deletePatient(id: bigint): Promise<void>;
    deletePrescription(id: bigint): Promise<void>;
    deleteVisit(id: bigint): Promise<void>;
    dischargeBed(bedId: bigint): Promise<{
        __kind__: "ok";
        ok: BedRecord;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getActiveOrdersByPatient(patientId: bigint): Promise<Array<ClinicalOrder>>;
    getAlertsByPatient(patientId: bigint): Promise<Array<ClinicalAlert>>;
    getAllAuditEntries(limit: bigint, offset: bigint): Promise<Array<AuditEntry>>;
    getAllBeds(): Promise<Array<BedRecord>>;
    getAllDiagnosisTemplates(): Promise<Array<DiagnosisTemplate>>;
    getAllEncounters(): Promise<Array<Encounter>>;
    getAllPatients(): Promise<Array<Patient>>;
    getAllPrescriptions(): Promise<Array<Prescription>>;
    getAllVisits(): Promise<Array<Visit>>;
    getAuditTrail(patientId: bigint, limit: bigint, offset: bigint): Promise<Array<AuditEntry>>;
    getAvailableBeds(): Promise<Array<BedRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getClinicalNotesByPatient(patientId: bigint): Promise<Array<ClinicalNote>>;
    getClinicalNotesByType(patientId: bigint, noteType: NoteType): Promise<Array<ClinicalNote>>;
    getCurrentUser(): Promise<CurrentUser>;
    getDiagnosisTemplate(id: bigint): Promise<DiagnosisTemplate | null>;
    getEncountersByPatient(patientId: bigint): Promise<Array<Encounter>>;
    getLastSyncTime(deviceId: string): Promise<bigint | null>;
    getObservationsByPatient(patientId: bigint): Promise<Array<Observation>>;
    getObservationsByType(patientId: bigint, observationType: ObservationType): Promise<Array<Observation>>;
    getOccupiedBeds(): Promise<Array<BedRecord>>;
    getOrdersByPatient(patientId: bigint): Promise<Array<ClinicalOrder>>;
    getPatient(id: bigint): Promise<Patient | null>;
    getPrescription(id: bigint): Promise<Prescription | null>;
    getPrescriptionsByPatientId(patientId: bigint): Promise<Array<Prescription>>;
    getPrescriptionsByVisitId(visitId: bigint): Promise<Array<Prescription>>;
    getUnacknowledgedAlerts(): Promise<Array<ClinicalAlert>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVisit(id: bigint): Promise<Visit | null>;
    getVisitsByPatientId(patientId: bigint): Promise<Array<Visit>>;
    isCallerAdmin(): Promise<boolean>;
    migrateFromLocalStorage(patientsJson: string, visitsJson: string, prescriptionsJson: string, appointmentsJson: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordDeviceSync(deviceId: string, pendingChanges: bigint): Promise<{
        __kind__: "ok";
        ok: SyncRecord;
    } | {
        __kind__: "err";
        err: string;
    }>;
    resolveAlert(id: bigint): Promise<{
        __kind__: "ok";
        ok: ClinicalAlert;
    } | {
        __kind__: "err";
        err: string;
    }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    transferBed(bedId: bigint, newBedId: bigint, reason: string): Promise<{
        __kind__: "ok";
        ok: BedRecord;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateClinicalNote(id: bigint, content: string, isDraft: boolean, changeReason: string | null): Promise<{
        __kind__: "ok";
        ok: ClinicalNote;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateDiagnosisTemplate(id: bigint, diagnosisName: string, diagnosisNameBn: string | null, icdCode: string | null, defaultDrugs: Array<string>, defaultInvestigations: Array<string>, defaultAdvice: Array<string>, defaultAdviceBn: Array<string>): Promise<{
        __kind__: "ok";
        ok: DiagnosisTemplate;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateEncounter(id: bigint, patientId: bigint, status: EncounterStatus, endDate: bigint | null, locationNotes: string | null): Promise<{
        __kind__: "ok";
        ok: Encounter;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateOrderStatus(id: bigint, status: OrderStatus, result: string | null, completedAt: bigint | null): Promise<{
        __kind__: "ok";
        ok: ClinicalOrder;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updatePatient(id: bigint, fullName: string, nameBn: string | null, dateOfBirth: Time | null, gender: Gender, phone: string | null, email: string | null, address: string | null, bloodGroup: string | null, weight: number | null, height: number | null, allergies: Array<string>, chronicConditions: Array<string>, pastSurgicalHistory: string | null, patientType: PatientType, consultantEmail: string | null, consultantName: string | null): Promise<Patient>;
    updatePrescription(id: bigint, patientId: bigint, visitId: bigint | null, prescriptionDate: Time, diagnosis: string | null, medications: Array<Medication>, notes: string | null): Promise<Prescription>;
    updateVisit(id: bigint, patientId: bigint, visitDate: Time, chiefComplaint: string, historyOfPresentIllness: string | null, vitalSigns: VitalSigns, physicalExamination: string | null, diagnosis: string | null, notes: string | null, visitType: VisitType): Promise<Visit>;
}
