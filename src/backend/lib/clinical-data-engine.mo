import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";

import Types "../types/clinical-data-engine";

module {

  // ─── State Shape (injected by main.mo) ─────────────────────────────────────

  public type EngineState = {
    encounters : Map.Map<Nat, Types.Encounter>;
    observations : Map.Map<Nat, Types.Observation>;
    orders : Map.Map<Nat, Types.ClinicalOrder>;
    notes : Map.Map<Nat, Types.ClinicalNote>;
    auditEntries : Map.Map<Nat, Types.AuditEntry>;
    alerts : Map.Map<Nat, Types.ClinicalAlert>;
    beds : Map.Map<Nat, Types.BedRecord>;
    diagnosisTemplates : Map.Map<Nat, Types.DiagnosisTemplate>;
    syncRecords : Map.Map<Text, Types.SyncRecord>;
    appointments : Map.Map<Text, Types.Appointment>;
    queueEntries : Map.Map<Text, Types.SerialQueueEntry>;
    var encounterIdCounter : Nat;
    var observationIdCounter : Nat;
    var orderIdCounter : Nat;
    var noteIdCounter : Nat;
    var auditIdCounter : Nat;
    var alertIdCounter : Nat;
    var bedIdCounter : Nat;
    var diagnosisTemplateIdCounter : Nat;
    var syncRecordIdCounter : Nat;
  };

  public func initState() : EngineState {
    {
      encounters = Map.empty<Nat, Types.Encounter>();
      observations = Map.empty<Nat, Types.Observation>();
      orders = Map.empty<Nat, Types.ClinicalOrder>();
      notes = Map.empty<Nat, Types.ClinicalNote>();
      auditEntries = Map.empty<Nat, Types.AuditEntry>();
      alerts = Map.empty<Nat, Types.ClinicalAlert>();
      beds = Map.empty<Nat, Types.BedRecord>();
      diagnosisTemplates = Map.empty<Nat, Types.DiagnosisTemplate>();
      syncRecords = Map.empty<Text, Types.SyncRecord>();
      appointments = Map.empty<Text, Types.Appointment>();
      queueEntries = Map.empty<Text, Types.SerialQueueEntry>();
      var encounterIdCounter = 1;
      var observationIdCounter = 1;
      var orderIdCounter = 1;
      var noteIdCounter = 1;
      var auditIdCounter = 1;
      var alertIdCounter = 1;
      var bedIdCounter = 1;
      var diagnosisTemplateIdCounter = 1;
      var syncRecordIdCounter = 1;
    };
  };

  // ─── Role Helpers ──────────────────────────────────────────────────────────

  public func isClinician(role : Types.StaffRole) : Bool {
    switch (role) {
      case (#admin or #doctor or #consultant_doctor or #medical_officer or #intern_doctor or #nurse) true;
      case (_) false;
    };
  };

  public func canFinalizeClinicalNote(role : Types.StaffRole) : Bool {
    switch (role) {
      case (#admin or #doctor or #consultant_doctor or #medical_officer) true;
      case (_) false;
    };
  };

  public func canViewAuditTrail(role : Types.StaffRole) : Bool {
    switch (role) {
      case (#admin or #consultant_doctor) true;
      case (_) false;
    };
  };

  public func canManageBeds(role : Types.StaffRole) : Bool {
    switch (role) {
      case (#admin or #staff or #doctor or #consultant_doctor) true;
      case (_) false;
    };
  };

  public func canCompleteOrder(role : Types.StaffRole) : Bool {
    switch (role) {
      case (#admin or #doctor or #consultant_doctor or #medical_officer or #nurse) true;
      case (_) false;
    };
  };

  // ─── Versioning Helpers ────────────────────────────────────────────────────

  public func makeVersionedRecord(
    version : Nat,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    changeReason : ?Text,
  ) : Types.VersionedRecord {
    {
      version;
      createdAt = Time.now();
      createdBy = caller;
      createdByName = callerName;
      createdByRole = callerRole;
      changeReason;
    };
  };

  // ─── Audit Append (internal) ───────────────────────────────────────────────

  func addAudit(
    state : EngineState,
    entityType : Text,
    entityId : Nat,
    fieldName : Text,
    beforeValue : ?Text,
    afterValue : Text,
    changedBy : Principal,
    changedByName : Text,
    changedByRole : Types.StaffRole,
    reason : ?Text,
  ) {
    let id = state.auditIdCounter;
    state.auditIdCounter += 1;
    let entry : Types.AuditEntry = {
      id;
      entityType;
      entityId;
      fieldName;
      beforeValue;
      afterValue;
      changedBy;
      changedByName;
      changedByRole;
      changedAt = Time.now();
      reason;
      ipAddress = null;
    };
    state.auditEntries.add(id, entry);
  };

  // ─── Clinical Alert Auto-Detection ─────────────────────────────────────────

  func checkClinicalAlerts(
    state : EngineState,
    patientId : Nat,
    code : Text,
    numericValue : ?Float,
  ) {
    let now = Time.now();
    switch (numericValue) {
      case (null) {};
      case (?val) {
        // Hypotension: systolic BP < 90
        if (code == "BP_SYSTOLIC" and val < 90.0) {
          let alertId = state.alertIdCounter;
          state.alertIdCounter += 1;
          state.alerts.add(alertId, {
            id = alertId;
            patientId;
            alertType = #Hypotension;
            severity = #Critical;
            message = "Critical: Systolic BP < 90 mmHg (" # val.toText() # " mmHg)";
            details = ?"Immediate clinical review required";
            triggeredAt = now;
            triggeredBy = "Auto-detection: Vital observation";
            isAcknowledged = false;
            acknowledgedBy = null;
            acknowledgedAt = null;
            isResolved = false;
            resolvedAt = null;
          });
        };
        // Hypoxia: SpO2 < 90
        if (code == "SPO2" and val < 90.0) {
          let alertId = state.alertIdCounter;
          state.alertIdCounter += 1;
          state.alerts.add(alertId, {
            id = alertId;
            patientId;
            alertType = #Hypoxia;
            severity = #Critical;
            message = "Critical: SpO2 < 90% (" # val.toText() # "%)";
            details = ?"Oxygen supplementation may be required";
            triggeredAt = now;
            triggeredBy = "Auto-detection: Vital observation";
            isAcknowledged = false;
            acknowledgedBy = null;
            acknowledgedAt = null;
            isResolved = false;
            resolvedAt = null;
          });
        };

        // Sepsis screen: check if recent vitals meet criteria
        // We check Temp abnormality here; sepsis composite is checked in getObservationsByPatient context
        if (code == "TEMPERATURE" and (val > 38.5 or val < 36.0)) {
          // Gather recent pulse and RR to check sepsis combo
          let recentObs = state.observations.values().filter(func (o) {
            o.patientId == patientId and not o.isDeleted
          }).toArray();
          let latestPulse = recentObs.filterMap(func (o : Types.Observation) : ?Float {
            if (o.code == "PULSE") { o.numericValue } else { null }
          });
          let latestRR = recentObs.filterMap(func (o : Types.Observation) : ?Float {
            if (o.code == "RR") { o.numericValue } else { null }
          });
          let hasPulse = latestPulse.any(func (p) { p > 100.0 });
          let hasRR = latestRR.any(func (r) { r > 20.0 });
          if (hasPulse and hasRR) {
            let alertId = state.alertIdCounter;
            state.alertIdCounter += 1;
            state.alerts.add(alertId, {
              id = alertId;
              patientId;
              alertType = #Sepsis;
              severity = #Critical;
              message = "Possible Sepsis: Temp abnormal + HR > 100 + RR > 20";
              details = ?"SIRS criteria met — immediate clinical review required";
              triggeredAt = now;
              triggeredBy = "Auto-detection: Sepsis screen";
              isAcknowledged = false;
              acknowledgedBy = null;
              acknowledgedAt = null;
              isResolved = false;
              resolvedAt = null;
            });
          };
        };

        // AKI screen: creatinine trending up (simple threshold > 1.5 with downtrend U/O)
        if (code == "CREATININE" and val >= 1.5) {
          let recentUO = state.observations.values().filter(func (o) {
            o.patientId == patientId and o.code == "URINE_OUTPUT" and not o.isDeleted
          }).toArray();
          let lowUO = recentUO.any(func (o) {
            switch (o.numericValue) {
              case (?v) { v < 0.5 };
              case (null) { false };
            }
          });
          if (lowUO) {
            let alertId = state.alertIdCounter;
            state.alertIdCounter += 1;
            state.alerts.add(alertId, {
              id = alertId;
              patientId;
              alertType = #AKI;
              severity = #Critical;
              message = "Possible AKI: Creatinine " # val.toText() # " mg/dL + low urine output";
              details = ?"Creatinine elevated and urine output < 0.5 ml/kg/hr";
              triggeredAt = now;
              triggeredBy = "Auto-detection: AKI screen";
              isAcknowledged = false;
              acknowledgedBy = null;
              acknowledgedAt = null;
              isResolved = false;
              resolvedAt = null;
            });
          };
        };
      };
    };
  };

  // ─── Encounter Logic ───────────────────────────────────────────────────────

  public func createEncounter(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    patientId : Nat,
    encounterType : Types.EncounterType,
    locationNotes : ?Text,
  ) : Types.Encounter {
    let id = state.encounterIdCounter;
    state.encounterIdCounter += 1;
    let versionInfo = makeVersionedRecord(1, caller, callerName, callerRole, null);
    let encounter : Types.Encounter = {
      id;
      patientId;
      encounterId = "ENC-" # id.toText();
      encounterType;
      status = #InProgress;
      startDate = Time.now();
      endDate = null;
      providerId = caller;
      providerName = callerName;
      locationNotes;
      versionInfo;
      previousVersions = [];
    };
    state.encounters.add(id, encounter);
    addAudit(state, "Encounter", id, "created", null, "ENC-" # id.toText(), caller, callerName, callerRole, null);
    encounter;
  };

  public func updateEncounter(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    id : Nat,
    patientId : Nat,
    status : Types.EncounterStatus,
    endDate : ?Int,
    locationNotes : ?Text,
  ) : Types.Encounter {
    let existing = switch (state.encounters.get(id)) {
      case (null) { Runtime.trap("Encounter not found") };
      case (?e) { e };
    };
    let prevVersions = existing.previousVersions.concat([existing.versionInfo]);
    let newVersion = makeVersionedRecord(existing.versionInfo.version + 1, caller, callerName, callerRole, null);
    let updated : Types.Encounter = {
      existing with
      patientId;
      status;
      endDate;
      locationNotes;
      versionInfo = newVersion;
      previousVersions = prevVersions;
    };
    state.encounters.add(id, updated);
    addAudit(state, "Encounter", id, "status", ?debug_show(existing.status), debug_show(status), caller, callerName, callerRole, null);
    updated;
  };

  public func getEncountersByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.Encounter] {
    state.encounters.values().filter(func (e) { e.patientId == patientId }).toArray();
  };

  public func getAllEncounters(state : EngineState) : [Types.Encounter] {
    state.encounters.values().toArray();
  };

  // ─── Observation Logic ─────────────────────────────────────────────────────

  public func createObservation(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    patientId : Nat,
    encounterId : ?Nat,
    observationType : Types.ObservationType,
    code : Text,
    value : Text,
    numericValue : ?Float,
    unit : Text,
    interpretation : ?Text,
    normalRange : ?Text,
    observationDate : Int,
  ) : Types.Observation {
    let id = state.observationIdCounter;
    state.observationIdCounter += 1;
    let versionInfo = makeVersionedRecord(1, caller, callerName, callerRole, null);
    let obs : Types.Observation = {
      id;
      patientId;
      encounterId;
      observationType;
      code;
      value;
      numericValue;
      unit;
      interpretation;
      normalRange;
      status = #Final;
      observationDate;
      recordedBy = caller;
      recordedByName = callerName;
      recordedByRole = callerRole;
      versionInfo;
      isDeleted = false;
    };
    state.observations.add(id, obs);
    addAudit(state, "Observation", id, "created", null, code # "=" # value, caller, callerName, callerRole, null);
    // Auto-detect clinical alerts for vitals and labs
    switch (observationType) {
      case (#Vital or #Lab) {
        checkClinicalAlerts(state, patientId, code, numericValue);
      };
      case (_) {};
    };
    obs;
  };

  public func getObservationsByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.Observation] {
    state.observations.values().filter(func (o) {
      o.patientId == patientId and not o.isDeleted
    }).toArray();
  };

  public func getObservationsByType(
    state : EngineState,
    patientId : Nat,
    observationType : Types.ObservationType,
  ) : [Types.Observation] {
    state.observations.values().filter(func (o) {
      o.patientId == patientId and o.observationType == observationType and not o.isDeleted
    }).toArray();
  };

  public func acknowledgeObservationCorrection(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    id : Nat,
    newValue : Text,
    reason : Text,
  ) : Types.Observation {
    let existing = switch (state.observations.get(id)) {
      case (null) { Runtime.trap("Observation not found") };
      case (?o) { o };
    };
    // Bump version — audit trail tracks history for observations
    let newVersion = makeVersionedRecord(existing.versionInfo.version + 1, caller, callerName, callerRole, ?reason);
    let updated : Types.Observation = {
      existing with
      value = newValue;
      status = #Corrected;
      versionInfo = newVersion;
    };
    state.observations.add(id, updated);
    addAudit(state, "Observation", id, "value", ?existing.value, newValue, caller, callerName, callerRole, ?reason);
    updated;
  };

  // ─── Clinical Order Logic ──────────────────────────────────────────────────

  public func createOrder(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    patientId : Nat,
    encounterId : ?Nat,
    orderType : Types.OrderType,
    code : Text,
    description : Text,
    notes : ?Text,
  ) : Types.ClinicalOrder {
    let id = state.orderIdCounter;
    state.orderIdCounter += 1;
    let versionInfo = makeVersionedRecord(1, caller, callerName, callerRole, null);
    let order : Types.ClinicalOrder = {
      id;
      patientId;
      encounterId;
      orderType;
      code;
      description;
      status = #Requested;
      orderedAt = Time.now();
      orderedBy = caller;
      orderedByName = callerName;
      orderedByRole = callerRole;
      completedAt = null;
      result = null;
      notes;
      versionInfo;
    };
    state.orders.add(id, order);
    addAudit(state, "ClinicalOrder", id, "created", null, code # ": " # description, caller, callerName, callerRole, null);
    order;
  };

  public func updateOrderStatus(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    id : Nat,
    status : Types.OrderStatus,
    result : ?Text,
    completedAt : ?Int,
  ) : Types.ClinicalOrder {
    if (not canCompleteOrder(callerRole)) {
      Runtime.trap("Unauthorized: role cannot update order status");
    };
    let existing = switch (state.orders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };
    let newVersion = makeVersionedRecord(existing.versionInfo.version + 1, caller, callerName, callerRole, null);
    let updated : Types.ClinicalOrder = {
      existing with
      status;
      result;
      completedAt;
      versionInfo = newVersion;
    };
    state.orders.add(id, updated);
    addAudit(state, "ClinicalOrder", id, "status", ?debug_show(existing.status), debug_show(status), caller, callerName, callerRole, null);
    updated;
  };

  public func getOrdersByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.ClinicalOrder] {
    state.orders.values().filter(func (o) { o.patientId == patientId }).toArray();
  };

  public func getActiveOrdersByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.ClinicalOrder] {
    state.orders.values().filter(func (o) {
      o.patientId == patientId and (o.status == #Requested or o.status == #Pending or o.status == #InProgress)
    }).toArray();
  };

  // ─── Clinical Note Logic ───────────────────────────────────────────────────

  public func createClinicalNote(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    patientId : Nat,
    encounterId : ?Nat,
    noteType : Types.NoteType,
    noteSubtype : ?Text,
    content : Text,
    isDraft : Bool,
  ) : Types.ClinicalNote {
    // Interns can only create draft notes
    if (callerRole == #intern_doctor and not isDraft) {
      Runtime.trap("Unauthorized: Intern doctors can only create draft notes");
    };
    // Finalized notes require clinician role
    if (not isDraft and not canFinalizeClinicalNote(callerRole)) {
      Runtime.trap("Unauthorized: role cannot finalize clinical notes");
    };
    let id = state.noteIdCounter;
    state.noteIdCounter += 1;
    let versionInfo = makeVersionedRecord(1, caller, callerName, callerRole, null);
    let note : Types.ClinicalNote = {
      id;
      patientId;
      encounterId;
      noteType;
      noteSubtype;
      authorId = caller;
      authorName = callerName;
      authorRole = callerRole;
      content;
      isDraft;
      createdAt = Time.now();
      versionInfo;
      previousVersionIds = [];
      isDeleted = false;
    };
    state.notes.add(id, note);
    addAudit(state, "ClinicalNote", id, "created", null, debug_show(noteType), caller, callerName, callerRole, null);
    note;
  };

  public func updateClinicalNote(
    state : EngineState,
    caller : Principal,
    callerName : Text,
    callerRole : Types.StaffRole,
    id : Nat,
    content : Text,
    isDraft : Bool,
    changeReason : ?Text,
  ) : Types.ClinicalNote {
    let existing = switch (state.notes.get(id)) {
      case (null) { Runtime.trap("Clinical note not found") };
      case (?n) { n };
    };
    if (callerRole == #intern_doctor and not isDraft) {
      Runtime.trap("Unauthorized: Intern doctors can only save draft notes");
    };
    if (not isDraft and not canFinalizeClinicalNote(callerRole)) {
      Runtime.trap("Unauthorized: role cannot finalize clinical notes");
    };
    // Archive the existing note by saving it under a new ID (version history chain)
    let archiveId = state.noteIdCounter;
    state.noteIdCounter += 1;
    let archivedNote : Types.ClinicalNote = {
      existing with
      id = archiveId;
      isDeleted = true; // soft-deleted archive
    };
    state.notes.add(archiveId, archivedNote);

    // Create the new version with chain link to previous
    let prevIds = existing.previousVersionIds.concat([archiveId]);
    let newVersion = makeVersionedRecord(existing.versionInfo.version + 1, caller, callerName, callerRole, changeReason);
    let updated : Types.ClinicalNote = {
      existing with
      content;
      isDraft;
      versionInfo = newVersion;
      previousVersionIds = prevIds;
    };
    state.notes.add(id, updated);
    addAudit(state, "ClinicalNote", id, "content", ?existing.content, content, caller, callerName, callerRole, changeReason);
    updated;
  };

  public func getClinicalNotesByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.ClinicalNote] {
    state.notes.values().filter(func (n) {
      n.patientId == patientId and not n.isDeleted
    }).toArray();
  };

  public func getClinicalNotesByType(
    state : EngineState,
    patientId : Nat,
    noteType : Types.NoteType,
  ) : [Types.ClinicalNote] {
    state.notes.values().filter(func (n) {
      n.patientId == patientId and n.noteType == noteType and not n.isDeleted
    }).toArray();
  };

  // ─── Audit Logic ───────────────────────────────────────────────────────────

  public func appendAuditEntry(
    state : EngineState,
    entityType : Text,
    entityId : Nat,
    fieldName : Text,
    beforeValue : ?Text,
    afterValue : Text,
    changedBy : Principal,
    changedByName : Text,
    changedByRole : Types.StaffRole,
    reason : ?Text,
  ) {
    addAudit(state, entityType, entityId, fieldName, beforeValue, afterValue, changedBy, changedByName, changedByRole, reason);
  };

  public func getAuditTrail(
    state : EngineState,
    patientId : Nat,
    limit : Nat,
    offset : Nat,
  ) : [Types.AuditEntry] {
    let all = state.auditEntries.values().toArray();
    // Return all audit entries where the entity is directly tied to this patient
    // (Patient record changes use entityId = patientId; clinical entities tracked separately)
    let filtered = all.filter(func (e) { e.entityId == patientId });
    let sorted = filtered.sort(func (a, b) { Int.compare(b.changedAt, a.changedAt) });
    let total = sorted.size();
    if (offset >= total) { return [] };
    let end = Nat.min(offset + limit, total);
    sorted.sliceToArray(offset.toInt(), end.toInt());
  };

  public func getAllAuditEntries(
    state : EngineState,
    limit : Nat,
    offset : Nat,
  ) : [Types.AuditEntry] {
    let all = state.auditEntries.values().toArray();
    let sorted = all.sort(func (a, b) { Int.compare(b.changedAt, a.changedAt) });
    let total = sorted.size();
    if (offset >= total) { return [] };
    let end = Nat.min(offset + limit, total);
    sorted.sliceToArray(offset.toInt(), end.toInt());
  };

  // ─── Alert Logic ───────────────────────────────────────────────────────────

  public func createClinicalAlert(
    state : EngineState,
    patientId : Nat,
    alertType : Types.AlertType,
    severity : Types.AlertSeverity,
    message : Text,
    details : ?Text,
  ) : Types.ClinicalAlert {
    let id = state.alertIdCounter;
    state.alertIdCounter += 1;
    let alert : Types.ClinicalAlert = {
      id;
      patientId;
      alertType;
      severity;
      message;
      details;
      triggeredAt = Time.now();
      triggeredBy = "Manual";
      isAcknowledged = false;
      acknowledgedBy = null;
      acknowledgedAt = null;
      isResolved = false;
      resolvedAt = null;
    };
    state.alerts.add(id, alert);
    alert;
  };

  public func acknowledgeAlert(
    state : EngineState,
    caller : Principal,
    id : Nat,
  ) : Types.ClinicalAlert {
    let existing = switch (state.alerts.get(id)) {
      case (null) { Runtime.trap("Alert not found") };
      case (?a) { a };
    };
    let updated : Types.ClinicalAlert = {
      existing with
      isAcknowledged = true;
      acknowledgedBy = ?caller;
      acknowledgedAt = ?Time.now();
    };
    state.alerts.add(id, updated);
    updated;
  };

  public func resolveAlert(
    state : EngineState,
    caller : Principal,
    id : Nat,
  ) : Types.ClinicalAlert {
    let existing = switch (state.alerts.get(id)) {
      case (null) { Runtime.trap("Alert not found") };
      case (?a) { a };
    };
    let updated : Types.ClinicalAlert = {
      existing with
      isAcknowledged = true;
      acknowledgedBy = ?caller;
      acknowledgedAt = switch (existing.acknowledgedAt) {
        case (?t) { ?t };
        case (null) { ?Time.now() };
      };
      isResolved = true;
      resolvedAt = ?Time.now();
    };
    state.alerts.add(id, updated);
    updated;
  };

  public func getAlertsByPatient(
    state : EngineState,
    patientId : Nat,
  ) : [Types.ClinicalAlert] {
    state.alerts.values().filter(func (a) { a.patientId == patientId }).toArray();
  };

  public func getUnacknowledgedAlerts(state : EngineState) : [Types.ClinicalAlert] {
    state.alerts.values().filter(func (a) { not a.isAcknowledged }).toArray();
  };

  // ─── Bed Management Logic ──────────────────────────────────────────────────

  public func createBedRecord(
    state : EngineState,
    _caller : Principal,
    callerRole : Types.StaffRole,
    bedNumber : Text,
    ward : Text,
  ) : Types.BedRecord {
    if (not canManageBeds(callerRole)) {
      Runtime.trap("Unauthorized: role cannot manage beds");
    };
    let id = state.bedIdCounter;
    state.bedIdCounter += 1;
    let bed : Types.BedRecord = {
      id;
      bedNumber;
      ward;
      status = #Empty;
      patientId = null;
      patientName = null;
      admissionDate = null;
      dischargeDate = null;
      transferHistory = [];
    };
    state.beds.add(id, bed);
    bed;
  };

  public func assignBed(
    state : EngineState,
    _caller : Principal,
    callerRole : Types.StaffRole,
    bedId : Nat,
    patientId : Nat,
    patientName : Text,
  ) : Types.BedRecord {
    if (not canManageBeds(callerRole)) {
      Runtime.trap("Unauthorized: role cannot manage beds");
    };
    let existing = switch (state.beds.get(bedId)) {
      case (null) { Runtime.trap("Bed not found") };
      case (?b) { b };
    };
    if (existing.status == #Occupied) {
      Runtime.trap("Bed is already occupied");
    };
    let updated : Types.BedRecord = {
      existing with
      status = #Occupied;
      patientId = ?patientId;
      patientName = ?patientName;
      admissionDate = ?Time.now();
      dischargeDate = null;
    };
    state.beds.add(bedId, updated);
    updated;
  };

  public func transferBed(
    state : EngineState,
    _caller : Principal,
    callerRole : Types.StaffRole,
    bedId : Nat,
    newBedId : Nat,
    reason : Text,
  ) : Types.BedRecord {
    if (not canManageBeds(callerRole)) {
      Runtime.trap("Unauthorized: role cannot manage beds");
    };
    let sourceBed = switch (state.beds.get(bedId)) {
      case (null) { Runtime.trap("Source bed not found") };
      case (?b) { b };
    };
    let targetBed = switch (state.beds.get(newBedId)) {
      case (null) { Runtime.trap("Target bed not found") };
      case (?b) { b };
    };
    if (sourceBed.status != #Occupied) {
      Runtime.trap("Source bed is not occupied");
    };
    if (targetBed.status == #Occupied) {
      Runtime.trap("Target bed is already occupied");
    };
    let transferEntry : Types.BedTransferEntry = {
      fromBed = sourceBed.bedNumber;
      toBed = targetBed.bedNumber;
      date = Time.now();
      reason;
    };
    // Free source bed
    let freedSource : Types.BedRecord = {
      sourceBed with
      status = #Empty;
      patientId = null;
      patientName = null;
      dischargeDate = ?Time.now();
    };
    state.beds.add(bedId, freedSource);
    // Occupy target bed
    let newHistory = targetBed.transferHistory.concat([transferEntry]);
    let occupiedTarget : Types.BedRecord = {
      targetBed with
      status = #Occupied;
      patientId = sourceBed.patientId;
      patientName = sourceBed.patientName;
      admissionDate = sourceBed.admissionDate;
      dischargeDate = null;
      transferHistory = newHistory;
    };
    state.beds.add(newBedId, occupiedTarget);
    occupiedTarget;
  };

  public func dischargeBed(
    state : EngineState,
    _caller : Principal,
    callerRole : Types.StaffRole,
    bedId : Nat,
  ) : Types.BedRecord {
    if (not canManageBeds(callerRole)) {
      Runtime.trap("Unauthorized: role cannot manage beds");
    };
    let existing = switch (state.beds.get(bedId)) {
      case (null) { Runtime.trap("Bed not found") };
      case (?b) { b };
    };
    let updated : Types.BedRecord = {
      existing with
      status = #Empty;
      patientId = null;
      patientName = null;
      dischargeDate = ?Time.now();
    };
    state.beds.add(bedId, updated);
    updated;
  };

  public func getAllBeds(state : EngineState) : [Types.BedRecord] {
    state.beds.values().toArray();
  };

  public func getAvailableBeds(state : EngineState) : [Types.BedRecord] {
    state.beds.values().filter(func (b) { b.status == #Empty }).toArray();
  };

  public func getOccupiedBeds(state : EngineState) : [Types.BedRecord] {
    state.beds.values().filter(func (b) { b.status == #Occupied }).toArray();
  };

  // ─── Diagnosis Template Logic ──────────────────────────────────────────────

  public func createDiagnosisTemplate(
    state : EngineState,
    caller : Principal,
    _callerRole : Types.StaffRole,
    diagnosisName : Text,
    diagnosisNameBn : ?Text,
    icdCode : ?Text,
    defaultDrugs : [Text],
    defaultInvestigations : [Text],
    defaultAdvice : [Text],
    defaultAdviceBn : [Text],
  ) : Types.DiagnosisTemplate {
    let id = state.diagnosisTemplateIdCounter;
    state.diagnosisTemplateIdCounter += 1;
    let template : Types.DiagnosisTemplate = {
      id;
      diagnosisName;
      diagnosisNameBn;
      icdCode;
      defaultDrugs;
      defaultInvestigations;
      defaultAdvice;
      defaultAdviceBn;
      createdBy = caller;
      createdAt = Time.now();
      isActive = true;
    };
    state.diagnosisTemplates.add(id, template);
    template;
  };

  public func updateDiagnosisTemplate(
    state : EngineState,
    _caller : Principal,
    _callerRole : Types.StaffRole,
    id : Nat,
    diagnosisName : Text,
    diagnosisNameBn : ?Text,
    icdCode : ?Text,
    defaultDrugs : [Text],
    defaultInvestigations : [Text],
    defaultAdvice : [Text],
    defaultAdviceBn : [Text],
  ) : Types.DiagnosisTemplate {
    let existing = switch (state.diagnosisTemplates.get(id)) {
      case (null) { Runtime.trap("Diagnosis template not found") };
      case (?t) { t };
    };
    let updated : Types.DiagnosisTemplate = {
      existing with
      diagnosisName;
      diagnosisNameBn;
      icdCode;
      defaultDrugs;
      defaultInvestigations;
      defaultAdvice;
      defaultAdviceBn;
    };
    state.diagnosisTemplates.add(id, updated);
    updated;
  };

  public func getAllDiagnosisTemplates(state : EngineState) : [Types.DiagnosisTemplate] {
    state.diagnosisTemplates.values().filter(func (t) { t.isActive }).toArray();
  };

  public func getDiagnosisTemplate(
    state : EngineState,
    id : Nat,
  ) : ?Types.DiagnosisTemplate {
    state.diagnosisTemplates.get(id);
  };

  // ─── Sync Logic ────────────────────────────────────────────────────────────

  public func recordDeviceSync(
    state : EngineState,
    caller : Principal,
    deviceId : Text,
    pendingChanges : Nat,
  ) : Types.SyncRecord {
    let existing = state.syncRecords.get(deviceId);
    let id = switch (existing) {
      case (?r) { r.id };
      case (null) {
        let newId = state.syncRecordIdCounter;
        state.syncRecordIdCounter += 1;
        newId;
      };
    };
    let record : Types.SyncRecord = {
      id;
      deviceId;
      userId = caller;
      lastSyncAt = Time.now();
      pendingChanges;
      lastEntityType = null;
      lastEntityId = null;
    };
    state.syncRecords.add(deviceId, record);
    record;
  };

  public func getLastSyncTime(
    state : EngineState,
    deviceId : Text,
  ) : ?Int {
    switch (state.syncRecords.get(deviceId)) {
      case (null) { null };
      case (?r) { ?r.lastSyncAt };
    };
  };

  // ─── Migration Helper ──────────────────────────────────────────────────────
  // Accepts JSON strings from the frontend (localStorage export) and returns
  // a summary. The actual parsing of JSON is deferred to the frontend which
  // calls individual create* methods per entity. This method acts as an
  // idempotent acknowledgment endpoint — true migration happens entity by entity.

  public func migrateFromLocalStorage(
    patientsJson : Text,
    visitsJson : Text,
    prescriptionsJson : Text,
    appointmentsJson : Text,
  ) : Text {
    // Migration summary: we return a JSON-like summary so the frontend can
    // track what was received. Actual structured parsing requires the frontend
    // to call createPatient / createVisit / etc. per record since Motoko
    // has no JSON parser in mo:core. This is the coordination handshake.
    let summary = "{\"status\":\"received\","
      # "\"patientsJsonLen\":" # patientsJson.size().toText() # ","
      # "\"visitsJsonLen\":" # visitsJson.size().toText() # ","
      # "\"prescriptionsJsonLen\":" # prescriptionsJson.size().toText() # ","
      # "\"appointmentsJsonLen\":" # appointmentsJson.size().toText() # ","
      # "\"note\":\"Use createPatient/createVisit/createPrescription per entity for full migration\"}";
    summary;
  };

  // ─── Appointment Logic ─────────────────────────────────────────────────────

  public func createAppointment(
    state : EngineState,
    _caller : Principal,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
    patientId : ?Nat,
    patientName : Text,
    registerNumber : ?Text,
    phone : ?Text,
    appointmentType : Types.AppointmentType,
    chamberName : ?Text,
    hospitalName : ?Text,
    date : Text,
    timeSlot : ?Text,
    status : Types.AppointmentStatus,
    doctorEmail : Text,
    serialNumber : ?Nat,
    notes : ?Text,
  ) : { #ok : Types.Appointment; #err : Text } {
    // Only admin or the owning doctor can create appointments
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only create appointments for your own account");
    };
    let now = Time.now();
    let appt : Types.Appointment = {
      id;
      patientId;
      patientName;
      registerNumber;
      phone;
      appointmentType;
      chamberName;
      hospitalName;
      date;
      timeSlot;
      status;
      doctorEmail;
      serialNumber;
      notes;
      createdAt = now;
      updatedAt = now;
    };
    state.appointments.add(id, appt);
    #ok(appt);
  };

  public func updateAppointment(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
    patientId : ?Nat,
    patientName : Text,
    registerNumber : ?Text,
    phone : ?Text,
    appointmentType : Types.AppointmentType,
    chamberName : ?Text,
    hospitalName : ?Text,
    date : Text,
    timeSlot : ?Text,
    status : Types.AppointmentStatus,
    serialNumber : ?Nat,
    notes : ?Text,
  ) : { #ok : Types.Appointment; #err : Text } {
    let existing = switch (state.appointments.get(id)) {
      case (null) { return #err("Appointment not found") };
      case (?a) { a };
    };
    if (callerRole != #admin and callerEmail != existing.doctorEmail) {
      return #err("Unauthorized: can only update your own appointments");
    };
    let updated : Types.Appointment = {
      existing with
      patientId;
      patientName;
      registerNumber;
      phone;
      appointmentType;
      chamberName;
      hospitalName;
      date;
      timeSlot;
      status;
      serialNumber;
      notes;
      updatedAt = Time.now();
    };
    state.appointments.add(id, updated);
    #ok(updated);
  };

  public func deleteAppointment(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
  ) : { #ok : (); #err : Text } {
    switch (state.appointments.get(id)) {
      case (null) { return #err("Appointment not found") };
      case (?a) {
        if (callerRole != #admin and callerEmail != a.doctorEmail) {
          return #err("Unauthorized: can only delete your own appointments");
        };
      };
    };
    state.appointments.remove(id);
    #ok(());
  };

  public func getAppointmentById(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
  ) : { #ok : ?Types.Appointment; #err : Text } {
    switch (state.appointments.get(id)) {
      case (null) { #ok(null) };
      case (?a) {
        if (callerRole != #admin and callerEmail != a.doctorEmail) {
          return #err("Unauthorized: can only view your own appointments");
        };
        #ok(?a);
      };
    };
  };

  public func getAppointmentsByDoctor(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    doctorEmail : Text,
    date : Text,
  ) : { #ok : [Types.Appointment]; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only view your own appointments");
    };
    let results = state.appointments.values().filter(func (a) {
      a.doctorEmail == doctorEmail and a.date == date
    }).toArray();
    #ok(results);
  };

  public func getAllAppointmentsByDoctor(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    doctorEmail : Text,
  ) : { #ok : [Types.Appointment]; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only view your own appointments");
    };
    let results = state.appointments.values().filter(func (a) {
      a.doctorEmail == doctorEmail
    }).toArray();
    #ok(results);
  };

  public func getAppointmentsSince(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    doctorEmail : Text,
    sinceTimestamp : Int,
  ) : { #ok : [Types.Appointment]; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only sync your own appointments");
    };
    let results = state.appointments.values().filter(func (a) {
      a.doctorEmail == doctorEmail and a.updatedAt >= sinceTimestamp
    }).toArray();
    #ok(results);
  };

  public func bulkUpsertAppointments(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    appts : [Types.Appointment],
  ) : { #ok : Nat; #err : Text } {
    var count = 0;
    for (a in appts.values()) {
      if (callerRole != #admin and callerEmail != a.doctorEmail) {
        return #err("Unauthorized: can only upsert your own appointments");
      };
      state.appointments.add(a.id, a);
      count += 1;
    };
    #ok(count);
  };

  // ─── Serial Queue Logic ────────────────────────────────────────────────────

  public func createQueueEntry(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
    date : Text,
    serialNumber : Nat,
    patientName : Text,
    registerNumber : ?Text,
    phone : ?Text,
    status : Types.QueueStatus,
    calledAt : ?Int,
    doctorEmail : Text,
  ) : { #ok : Types.SerialQueueEntry; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only create queue entries for your own account");
    };
    let entry : Types.SerialQueueEntry = {
      id;
      date;
      serialNumber;
      patientName;
      registerNumber;
      phone;
      status;
      calledAt;
      doctorEmail;
      createdAt = Time.now();
    };
    state.queueEntries.add(id, entry);
    #ok(entry);
  };

  public func updateQueueEntry(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
    status : Types.QueueStatus,
    calledAt : ?Int,
  ) : { #ok : Types.SerialQueueEntry; #err : Text } {
    let existing = switch (state.queueEntries.get(id)) {
      case (null) { return #err("Queue entry not found") };
      case (?e) { e };
    };
    if (callerRole != #admin and callerEmail != existing.doctorEmail) {
      return #err("Unauthorized: can only update your own queue entries");
    };
    let updated : Types.SerialQueueEntry = {
      existing with
      status;
      calledAt;
    };
    state.queueEntries.add(id, updated);
    #ok(updated);
  };

  public func deleteQueueEntry(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    id : Text,
  ) : { #ok : (); #err : Text } {
    switch (state.queueEntries.get(id)) {
      case (null) { return #err("Queue entry not found") };
      case (?e) {
        if (callerRole != #admin and callerEmail != e.doctorEmail) {
          return #err("Unauthorized: can only delete your own queue entries");
        };
      };
    };
    state.queueEntries.remove(id);
    #ok(());
  };

  public func getQueueByDateAndDoctor(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    date : Text,
    doctorEmail : Text,
  ) : { #ok : [Types.SerialQueueEntry]; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only view your own queue");
    };
    let results = state.queueEntries.values().filter(func (e) {
      e.date == date and e.doctorEmail == doctorEmail
    }).toArray();
    #ok(results);
  };

  public func clearQueueByDate(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    date : Text,
    doctorEmail : Text,
  ) : { #ok : Nat; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only clear your own queue");
    };
    let toRemove = state.queueEntries.values().filter(func (e) {
      e.date == date and e.doctorEmail == doctorEmail
    }).toArray();
    for (e in toRemove.values()) {
      state.queueEntries.remove(e.id);
    };
    #ok(toRemove.size());
  };

  public func getQueueEntriesSince(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    doctorEmail : Text,
    sinceTimestamp : Int,
  ) : { #ok : [Types.SerialQueueEntry]; #err : Text } {
    if (callerRole != #admin and callerEmail != doctorEmail) {
      return #err("Unauthorized: can only sync your own queue entries");
    };
    let results = state.queueEntries.values().filter(func (e) {
      e.doctorEmail == doctorEmail and e.createdAt >= sinceTimestamp
    }).toArray();
    #ok(results);
  };

  public func bulkUpsertQueueEntries(
    state : EngineState,
    callerRole : Types.StaffRole,
    callerEmail : Text,
    entries : [Types.SerialQueueEntry],
  ) : { #ok : Nat; #err : Text } {
    var count = 0;
    for (e in entries.values()) {
      if (callerRole != #admin and callerEmail != e.doctorEmail) {
        return #err("Unauthorized: can only upsert your own queue entries");
      };
      state.queueEntries.add(e.id, e);
      count += 1;
    };
    #ok(count);
  };

};
