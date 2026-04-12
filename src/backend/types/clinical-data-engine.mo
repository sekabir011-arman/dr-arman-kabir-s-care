import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {

  // ─── Staff Roles ───────────────────────────────────────────────────────────

  public type StaffRole = {
    #admin;
    #doctor;
    #consultant_doctor;
    #medical_officer;
    #intern_doctor;
    #nurse;
    #staff;
    #patient;
  };

  // ─── Versioning / Audit Chain ──────────────────────────────────────────────

  public type VersionedRecord = {
    version : Nat;
    createdAt : Int;
    createdBy : Principal;
    createdByName : Text;
    createdByRole : StaffRole;
    changeReason : ?Text;
  };

  // ─── Encounter ─────────────────────────────────────────────────────────────

  public type EncounterType = { #OPD; #IPD; #Emergency; #FollowUp };
  public type EncounterStatus = { #Planned; #InProgress; #Completed; #Cancelled };

  public type Encounter = {
    id : Nat;
    patientId : Nat;
    encounterId : Text;
    encounterType : EncounterType;
    status : EncounterStatus;
    startDate : Int;
    endDate : ?Int;
    providerId : Principal;
    providerName : Text;
    locationNotes : ?Text;
    versionInfo : VersionedRecord;
    previousVersions : [VersionedRecord];
  };

  // ─── Observation ───────────────────────────────────────────────────────────

  public type ObservationType = {
    #Vital;
    #Lab;
    #ExamFinding;
    #IntakeOutput;
    #DrainMonitoring;
  };

  public type ObservationStatus = { #Preliminary; #Final; #Corrected };

  public type Observation = {
    id : Nat;
    patientId : Nat;
    encounterId : ?Nat;
    observationType : ObservationType;
    code : Text;
    value : Text;
    numericValue : ?Float;
    unit : Text;
    interpretation : ?Text;
    normalRange : ?Text;
    status : ObservationStatus;
    observationDate : Int;
    recordedBy : Principal;
    recordedByName : Text;
    recordedByRole : StaffRole;
    versionInfo : VersionedRecord;
    isDeleted : Bool;
  };

  // ─── Clinical Order ────────────────────────────────────────────────────────

  public type OrderType = { #Medication; #LabTest; #Procedure; #Investigation };
  public type OrderStatus = {
    #Requested;
    #Pending;
    #InProgress;
    #Completed;
    #Cancelled;
  };

  public type ClinicalOrder = {
    id : Nat;
    patientId : Nat;
    encounterId : ?Nat;
    orderType : OrderType;
    code : Text;
    description : Text;
    status : OrderStatus;
    orderedAt : Int;
    orderedBy : Principal;
    orderedByName : Text;
    orderedByRole : StaffRole;
    completedAt : ?Int;
    result : ?Text;
    notes : ?Text;
    versionInfo : VersionedRecord;
  };

  // ─── Clinical Note ─────────────────────────────────────────────────────────

  public type NoteType = {
    #SOAP;
    #DailyProgress;
    #Discharge;
    #Nursing;
    #Handover;
    #General;
  };

  public type ClinicalNote = {
    id : Nat;
    patientId : Nat;
    encounterId : ?Nat;
    noteType : NoteType;
    noteSubtype : ?Text;
    authorId : Principal;
    authorName : Text;
    authorRole : StaffRole;
    content : Text;
    isDraft : Bool;
    createdAt : Int;
    versionInfo : VersionedRecord;
    previousVersionIds : [Nat];
    isDeleted : Bool;
  };

  // ─── Audit Entry ───────────────────────────────────────────────────────────

  public type AuditEntry = {
    id : Nat;
    entityType : Text;
    entityId : Nat;
    fieldName : Text;
    beforeValue : ?Text;
    afterValue : Text;
    changedBy : Principal;
    changedByName : Text;
    changedByRole : StaffRole;
    changedAt : Int;
    reason : ?Text;
    ipAddress : ?Text;
  };

  // ─── Clinical Alert ────────────────────────────────────────────────────────

  public type AlertType = {
    #Sepsis;
    #AKI;
    #Hypotension;
    #Hypoxia;
    #DrugInteraction;
    #AllergyContraindication;
    #CriticalLab;
  };

  public type AlertSeverity = { #Critical; #Warning; #Info };

  public type ClinicalAlert = {
    id : Nat;
    patientId : Nat;
    alertType : AlertType;
    severity : AlertSeverity;
    message : Text;
    details : ?Text;
    triggeredAt : Int;
    triggeredBy : Text;
    isAcknowledged : Bool;
    acknowledgedBy : ?Principal;
    acknowledgedAt : ?Int;
    isResolved : Bool;
    resolvedAt : ?Int;
  };

  // ─── Bed Record ────────────────────────────────────────────────────────────

  public type BedStatus = { #Empty; #Occupied; #Maintenance };

  public type BedTransferEntry = {
    fromBed : Text;
    toBed : Text;
    date : Int;
    reason : Text;
  };

  public type BedRecord = {
    id : Nat;
    bedNumber : Text;
    ward : Text;
    status : BedStatus;
    patientId : ?Nat;
    patientName : ?Text;
    admissionDate : ?Int;
    dischargeDate : ?Int;
    transferHistory : [BedTransferEntry];
  };

  // ─── Diagnosis Template ────────────────────────────────────────────────────

  public type DiagnosisTemplate = {
    id : Nat;
    diagnosisName : Text;
    diagnosisNameBn : ?Text;
    icdCode : ?Text;
    defaultDrugs : [Text];
    defaultInvestigations : [Text];
    defaultAdvice : [Text];
    defaultAdviceBn : [Text];
    createdBy : Principal;
    createdAt : Int;
    isActive : Bool;
  };

  // ─── Sync Record ───────────────────────────────────────────────────────────

  public type SyncRecord = {
    id : Nat;
    deviceId : Text;
    userId : Principal;
    lastSyncAt : Int;
    pendingChanges : Nat;
    lastEntityType : ?Text;
    lastEntityId : ?Nat;
  };

};
