import Principal "mo:core/Principal";

import Types "../types/clinical-data-engine";
import Lib "../lib/clinical-data-engine";
import AccessControl "../authorization/access-control/lib";

mixin (
  engineState : Lib.EngineState,
  accessControlState : AccessControl.AccessControlState,
) {

  // ─── Internal: Resolve caller role ─────────────────────────────────────────

  func getCallerRole(caller : Principal) : Types.StaffRole {
    if (caller.isAnonymous()) { return #patient };
    switch (accessControlState.userRoles.get(caller)) {
      case (null) { #patient };
      case (?#admin) { #admin };
      case (?#user) { #doctor }; // default user role maps to doctor
      case (?#guest) { #patient };
    };
  };

  // ─── Encounter API ─────────────────────────────────────────────────────────

  public shared ({ caller }) func createEncounter(
    patientId : Nat,
    encounterType : Types.EncounterType,
    locationNotes : ?Text,
  ) : async { #ok : Types.Encounter; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can create encounters");
    };
    let encounter = Lib.createEncounter(engineState, caller, caller.toText(), role, patientId, encounterType, locationNotes);
    #ok(encounter);
  };

  public shared ({ caller }) func updateEncounter(
    id : Nat,
    patientId : Nat,
    status : Types.EncounterStatus,
    endDate : ?Int,
    locationNotes : ?Text,
  ) : async { #ok : Types.Encounter; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can update encounters");
    };
    let encounter = Lib.updateEncounter(engineState, caller, caller.toText(), role, id, patientId, status, endDate, locationNotes);
    #ok(encounter);
  };

  public query ({ caller }) func getEncountersByPatient(
    patientId : Nat
  ) : async [Types.Encounter] {
    Lib.getEncountersByPatient(engineState, patientId);
  };

  public query ({ caller }) func getAllEncounters() : async [Types.Encounter] {
    let role = getCallerRole(caller);
    switch (role) {
      case (#admin or #doctor or #consultant_doctor) {
        Lib.getAllEncounters(engineState);
      };
      case (_) { [] };
    };
  };

  // ─── Observation API ───────────────────────────────────────────────────────

  public shared ({ caller }) func createObservation(
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
  ) : async { #ok : Types.Observation; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can record observations");
    };
    let obs = Lib.createObservation(
      engineState, caller, caller.toText(), role,
      patientId, encounterId, observationType, code, value,
      numericValue, unit, interpretation, normalRange, observationDate,
    );
    #ok(obs);
  };

  public query ({ caller }) func getObservationsByPatient(
    patientId : Nat
  ) : async [Types.Observation] {
    Lib.getObservationsByPatient(engineState, patientId);
  };

  public query ({ caller }) func getObservationsByType(
    patientId : Nat,
    observationType : Types.ObservationType,
  ) : async [Types.Observation] {
    Lib.getObservationsByType(engineState, patientId, observationType);
  };

  public shared ({ caller }) func acknowledgeObservationCorrection(
    id : Nat,
    newValue : Text,
    reason : Text,
  ) : async { #ok : Types.Observation; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can correct observations");
    };
    let obs = Lib.acknowledgeObservationCorrection(engineState, caller, caller.toText(), role, id, newValue, reason);
    #ok(obs);
  };

  // ─── Clinical Order API ────────────────────────────────────────────────────

  public shared ({ caller }) func createOrder(
    patientId : Nat,
    encounterId : ?Nat,
    orderType : Types.OrderType,
    code : Text,
    description : Text,
    notes : ?Text,
  ) : async { #ok : Types.ClinicalOrder; #err : Text } {
    let role = getCallerRole(caller);
    switch (role) {
      case (#admin or #doctor or #consultant_doctor or #medical_officer) {};
      case (_) { return #err("Unauthorized: role cannot create orders") };
    };
    let order = Lib.createOrder(engineState, caller, caller.toText(), role, patientId, encounterId, orderType, code, description, notes);
    #ok(order);
  };

  public shared ({ caller }) func updateOrderStatus(
    id : Nat,
    status : Types.OrderStatus,
    result : ?Text,
    completedAt : ?Int,
  ) : async { #ok : Types.ClinicalOrder; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.canCompleteOrder(role)) {
      return #err("Unauthorized: role cannot update order status");
    };
    // Nurses can only mark as completed, not cancel
    if (role == #nurse) {
      switch (status) {
        case (#Completed) {};
        case (_) { return #err("Unauthorized: nurses can only mark orders as completed") };
      };
    };
    let order = Lib.updateOrderStatus(engineState, caller, caller.toText(), role, id, status, result, completedAt);
    #ok(order);
  };

  public query ({ caller }) func getOrdersByPatient(
    patientId : Nat
  ) : async [Types.ClinicalOrder] {
    Lib.getOrdersByPatient(engineState, patientId);
  };

  public query ({ caller }) func getActiveOrdersByPatient(
    patientId : Nat
  ) : async [Types.ClinicalOrder] {
    Lib.getActiveOrdersByPatient(engineState, patientId);
  };

  // ─── Clinical Note API ─────────────────────────────────────────────────────

  public shared ({ caller }) func createClinicalNote(
    patientId : Nat,
    encounterId : ?Nat,
    noteType : Types.NoteType,
    noteSubtype : ?Text,
    content : Text,
    isDraft : Bool,
  ) : async { #ok : Types.ClinicalNote; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can create clinical notes");
    };
    let note = Lib.createClinicalNote(engineState, caller, caller.toText(), role, patientId, encounterId, noteType, noteSubtype, content, isDraft);
    #ok(note);
  };

  public shared ({ caller }) func updateClinicalNote(
    id : Nat,
    content : Text,
    isDraft : Bool,
    changeReason : ?Text,
  ) : async { #ok : Types.ClinicalNote; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can update clinical notes");
    };
    let note = Lib.updateClinicalNote(engineState, caller, caller.toText(), role, id, content, isDraft, changeReason);
    #ok(note);
  };

  public query ({ caller }) func getClinicalNotesByPatient(
    patientId : Nat
  ) : async [Types.ClinicalNote] {
    Lib.getClinicalNotesByPatient(engineState, patientId);
  };

  public query ({ caller }) func getClinicalNotesByType(
    patientId : Nat,
    noteType : Types.NoteType,
  ) : async [Types.ClinicalNote] {
    Lib.getClinicalNotesByType(engineState, patientId, noteType);
  };

  // ─── Audit Trail API ───────────────────────────────────────────────────────

  public query ({ caller }) func getAuditTrail(
    patientId : Nat,
    limit : Nat,
    offset : Nat,
  ) : async [Types.AuditEntry] {
    let role = getCallerRole(caller);
    if (not Lib.canViewAuditTrail(role)) {
      return [];
    };
    Lib.getAuditTrail(engineState, patientId, limit, offset);
  };

  public query ({ caller }) func getAllAuditEntries(
    limit : Nat,
    offset : Nat,
  ) : async [Types.AuditEntry] {
    let role = getCallerRole(caller);
    if (role != #admin) {
      return [];
    };
    Lib.getAllAuditEntries(engineState, limit, offset);
  };

  // ─── Clinical Alert API ────────────────────────────────────────────────────

  public shared ({ caller }) func createClinicalAlert(
    patientId : Nat,
    alertType : Types.AlertType,
    severity : Types.AlertSeverity,
    message : Text,
    details : ?Text,
  ) : async { #ok : Types.ClinicalAlert; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can create alerts");
    };
    let alert = Lib.createClinicalAlert(engineState, patientId, alertType, severity, message, details);
    #ok(alert);
  };

  public shared ({ caller }) func acknowledgeAlert(
    id : Nat
  ) : async { #ok : Types.ClinicalAlert; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can acknowledge alerts");
    };
    let alert = Lib.acknowledgeAlert(engineState, caller, id);
    #ok(alert);
  };

  public shared ({ caller }) func resolveAlert(
    id : Nat
  ) : async { #ok : Types.ClinicalAlert; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) {
      return #err("Unauthorized: only clinicians can resolve alerts");
    };
    let alert = Lib.resolveAlert(engineState, caller, id);
    #ok(alert);
  };

  public query ({ caller }) func getAlertsByPatient(
    patientId : Nat
  ) : async [Types.ClinicalAlert] {
    Lib.getAlertsByPatient(engineState, patientId);
  };

  public query ({ caller }) func getUnacknowledgedAlerts() : async [Types.ClinicalAlert] {
    let role = getCallerRole(caller);
    if (not Lib.isClinician(role)) { return [] };
    Lib.getUnacknowledgedAlerts(engineState);
  };

  // ─── Bed Management API ────────────────────────────────────────────────────

  public shared ({ caller }) func createBedRecord(
    bedNumber : Text,
    ward : Text,
  ) : async { #ok : Types.BedRecord; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.canManageBeds(role)) {
      return #err("Unauthorized: role cannot manage beds");
    };
    let bed = Lib.createBedRecord(engineState, caller, role, bedNumber, ward);
    #ok(bed);
  };

  public shared ({ caller }) func assignBed(
    bedId : Nat,
    patientId : Nat,
    patientName : Text,
  ) : async { #ok : Types.BedRecord; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.canManageBeds(role)) {
      return #err("Unauthorized: role cannot assign beds");
    };
    let bed = Lib.assignBed(engineState, caller, role, bedId, patientId, patientName);
    #ok(bed);
  };

  public shared ({ caller }) func transferBed(
    bedId : Nat,
    newBedId : Nat,
    reason : Text,
  ) : async { #ok : Types.BedRecord; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.canManageBeds(role)) {
      return #err("Unauthorized: role cannot transfer beds");
    };
    let bed = Lib.transferBed(engineState, caller, role, bedId, newBedId, reason);
    #ok(bed);
  };

  public shared ({ caller }) func dischargeBed(
    bedId : Nat
  ) : async { #ok : Types.BedRecord; #err : Text } {
    let role = getCallerRole(caller);
    if (not Lib.canManageBeds(role)) {
      return #err("Unauthorized: role cannot discharge beds");
    };
    let bed = Lib.dischargeBed(engineState, caller, role, bedId);
    #ok(bed);
  };

  public query ({ caller }) func getAllBeds() : async [Types.BedRecord] {
    Lib.getAllBeds(engineState);
  };

  public query ({ caller }) func getAvailableBeds() : async [Types.BedRecord] {
    Lib.getAvailableBeds(engineState);
  };

  public query ({ caller }) func getOccupiedBeds() : async [Types.BedRecord] {
    Lib.getOccupiedBeds(engineState);
  };

  // ─── Diagnosis Template API ────────────────────────────────────────────────

  public shared ({ caller }) func createDiagnosisTemplate(
    diagnosisName : Text,
    diagnosisNameBn : ?Text,
    icdCode : ?Text,
    defaultDrugs : [Text],
    defaultInvestigations : [Text],
    defaultAdvice : [Text],
    defaultAdviceBn : [Text],
  ) : async { #ok : Types.DiagnosisTemplate; #err : Text } {
    let role = getCallerRole(caller);
    switch (role) {
      case (#admin or #doctor or #consultant_doctor) {};
      case (_) { return #err("Unauthorized: role cannot manage diagnosis templates") };
    };
    let template = Lib.createDiagnosisTemplate(
      engineState, caller, role,
      diagnosisName, diagnosisNameBn, icdCode,
      defaultDrugs, defaultInvestigations, defaultAdvice, defaultAdviceBn,
    );
    #ok(template);
  };

  public shared ({ caller }) func updateDiagnosisTemplate(
    id : Nat,
    diagnosisName : Text,
    diagnosisNameBn : ?Text,
    icdCode : ?Text,
    defaultDrugs : [Text],
    defaultInvestigations : [Text],
    defaultAdvice : [Text],
    defaultAdviceBn : [Text],
  ) : async { #ok : Types.DiagnosisTemplate; #err : Text } {
    let role = getCallerRole(caller);
    switch (role) {
      case (#admin or #doctor or #consultant_doctor) {};
      case (_) { return #err("Unauthorized: role cannot manage diagnosis templates") };
    };
    let template = Lib.updateDiagnosisTemplate(
      engineState, caller, role, id,
      diagnosisName, diagnosisNameBn, icdCode,
      defaultDrugs, defaultInvestigations, defaultAdvice, defaultAdviceBn,
    );
    #ok(template);
  };

  public query ({ caller }) func getAllDiagnosisTemplates() : async [Types.DiagnosisTemplate] {
    Lib.getAllDiagnosisTemplates(engineState);
  };

  public query ({ caller }) func getDiagnosisTemplate(
    id : Nat
  ) : async ?Types.DiagnosisTemplate {
    Lib.getDiagnosisTemplate(engineState, id);
  };

  // ─── Sync API ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func recordDeviceSync(
    deviceId : Text,
    pendingChanges : Nat,
  ) : async { #ok : Types.SyncRecord; #err : Text } {
    let record = Lib.recordDeviceSync(engineState, caller, deviceId, pendingChanges);
    #ok(record);
  };

  public query ({ caller }) func getLastSyncTime(
    deviceId : Text
  ) : async ?Int {
    Lib.getLastSyncTime(engineState, deviceId);
  };

  // ─── Data Migration API ────────────────────────────────────────────────────

  public shared ({ caller }) func migrateFromLocalStorage(
    patientsJson : Text,
    visitsJson : Text,
    prescriptionsJson : Text,
    appointmentsJson : Text,
  ) : async { #ok : Text; #err : Text } {
    let role = getCallerRole(caller);
    if (role != #admin) {
      return #err("Unauthorized: only admin can run data migration");
    };
    let summary = Lib.migrateFromLocalStorage(patientsJson, visitsJson, prescriptionsJson, appointmentsJson);
    #ok(summary);
  };

  // ─── Appointment API ───────────────────────────────────────────────────────

  public shared ({ caller }) func createAppointment(
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
  ) : async { #ok : Types.Appointment; #err : Text } {
    let role = getCallerRole(caller);
    Lib.createAppointment(
      engineState, caller, role, caller.toText(),
      id, patientId, patientName, registerNumber, phone,
      appointmentType, chamberName, hospitalName, date, timeSlot,
      status, doctorEmail, serialNumber, notes,
    );
  };

  public shared ({ caller }) func updateAppointment(
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
  ) : async { #ok : Types.Appointment; #err : Text } {
    let role = getCallerRole(caller);
    Lib.updateAppointment(
      engineState, role, caller.toText(),
      id, patientId, patientName, registerNumber, phone,
      appointmentType, chamberName, hospitalName, date, timeSlot,
      status, serialNumber, notes,
    );
  };

  public shared ({ caller }) func deleteAppointment(
    id : Text
  ) : async { #ok : (); #err : Text } {
    let role = getCallerRole(caller);
    Lib.deleteAppointment(engineState, role, caller.toText(), id);
  };

  public query ({ caller }) func getAppointmentById(
    id : Text
  ) : async { #ok : ?Types.Appointment; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getAppointmentById(engineState, role, caller.toText(), id);
  };

  public query ({ caller }) func getAppointmentsByDoctor(
    doctorEmail : Text,
    date : Text,
  ) : async { #ok : [Types.Appointment]; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getAppointmentsByDoctor(engineState, role, caller.toText(), doctorEmail, date);
  };

  public query ({ caller }) func getAllAppointmentsByDoctor(
    doctorEmail : Text
  ) : async { #ok : [Types.Appointment]; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getAllAppointmentsByDoctor(engineState, role, caller.toText(), doctorEmail);
  };

  public query ({ caller }) func getAppointmentsSince(
    doctorEmail : Text,
    sinceTimestamp : Int,
  ) : async { #ok : [Types.Appointment]; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getAppointmentsSince(engineState, role, caller.toText(), doctorEmail, sinceTimestamp);
  };

  public shared ({ caller }) func bulkUpsertAppointments(
    appts : [Types.Appointment]
  ) : async { #ok : Nat; #err : Text } {
    let role = getCallerRole(caller);
    Lib.bulkUpsertAppointments(engineState, role, caller.toText(), appts);
  };

  // ─── Serial Queue API ──────────────────────────────────────────────────────

  public shared ({ caller }) func createQueueEntry(
    id : Text,
    date : Text,
    serialNumber : Nat,
    patientName : Text,
    registerNumber : ?Text,
    phone : ?Text,
    status : Types.QueueStatus,
    calledAt : ?Int,
    doctorEmail : Text,
  ) : async { #ok : Types.SerialQueueEntry; #err : Text } {
    let role = getCallerRole(caller);
    Lib.createQueueEntry(
      engineState, role, caller.toText(),
      id, date, serialNumber, patientName, registerNumber, phone,
      status, calledAt, doctorEmail,
    );
  };

  public shared ({ caller }) func updateQueueEntry(
    id : Text,
    status : Types.QueueStatus,
    calledAt : ?Int,
  ) : async { #ok : Types.SerialQueueEntry; #err : Text } {
    let role = getCallerRole(caller);
    Lib.updateQueueEntry(engineState, role, caller.toText(), id, status, calledAt);
  };

  public shared ({ caller }) func deleteQueueEntry(
    id : Text
  ) : async { #ok : (); #err : Text } {
    let role = getCallerRole(caller);
    Lib.deleteQueueEntry(engineState, role, caller.toText(), id);
  };

  public query ({ caller }) func getQueueByDateAndDoctor(
    date : Text,
    doctorEmail : Text,
  ) : async { #ok : [Types.SerialQueueEntry]; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getQueueByDateAndDoctor(engineState, role, caller.toText(), date, doctorEmail);
  };

  public shared ({ caller }) func clearQueueByDate(
    date : Text,
    doctorEmail : Text,
  ) : async { #ok : Nat; #err : Text } {
    let role = getCallerRole(caller);
    Lib.clearQueueByDate(engineState, role, caller.toText(), date, doctorEmail);
  };

  public query ({ caller }) func getQueueEntriesSince(
    doctorEmail : Text,
    sinceTimestamp : Int,
  ) : async { #ok : [Types.SerialQueueEntry]; #err : Text } {
    let role = getCallerRole(caller);
    Lib.getQueueEntriesSince(engineState, role, caller.toText(), doctorEmail, sinceTimestamp);
  };

  public shared ({ caller }) func bulkUpsertQueueEntries(
    entries : [Types.SerialQueueEntry]
  ) : async { #ok : Nat; #err : Text } {
    let role = getCallerRole(caller);
    Lib.bulkUpsertQueueEntries(engineState, role, caller.toText(), entries);
  };

};
