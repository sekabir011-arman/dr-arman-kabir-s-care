import Map "mo:core/Map";
import Types "types/clinical-data-engine";

module {

  // ─── Old State Shape ───────────────────────────────────────────────────────
  // Copied from the previous version (no appointments or queueEntries fields).

  type OldEngineState = {
    encounters : Map.Map<Nat, Types.Encounter>;
    observations : Map.Map<Nat, Types.Observation>;
    orders : Map.Map<Nat, Types.ClinicalOrder>;
    notes : Map.Map<Nat, Types.ClinicalNote>;
    auditEntries : Map.Map<Nat, Types.AuditEntry>;
    alerts : Map.Map<Nat, Types.ClinicalAlert>;
    beds : Map.Map<Nat, Types.BedRecord>;
    diagnosisTemplates : Map.Map<Nat, Types.DiagnosisTemplate>;
    syncRecords : Map.Map<Text, Types.SyncRecord>;
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

  // ─── New State Shape ────────────────────────────────────────────────────────
  // Matches ClinicalDataEngineLib.EngineState (adds appointments and queueEntries).

  type NewEngineState = {
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

  type OldActor = {
    clinicalEngineState : OldEngineState;
  };

  type NewActor = {
    clinicalEngineState : NewEngineState;
  };

  public func run(old : OldActor) : NewActor {
    let oldEngine = old.clinicalEngineState;
    {
      clinicalEngineState = {
        encounters = oldEngine.encounters;
        observations = oldEngine.observations;
        orders = oldEngine.orders;
        notes = oldEngine.notes;
        auditEntries = oldEngine.auditEntries;
        alerts = oldEngine.alerts;
        beds = oldEngine.beds;
        diagnosisTemplates = oldEngine.diagnosisTemplates;
        syncRecords = oldEngine.syncRecords;
        appointments = Map.empty<Text, Types.Appointment>();
        queueEntries = Map.empty<Text, Types.SerialQueueEntry>();
        var encounterIdCounter = oldEngine.encounterIdCounter;
        var observationIdCounter = oldEngine.observationIdCounter;
        var orderIdCounter = oldEngine.orderIdCounter;
        var noteIdCounter = oldEngine.noteIdCounter;
        var auditIdCounter = oldEngine.auditIdCounter;
        var alertIdCounter = oldEngine.alertIdCounter;
        var bedIdCounter = oldEngine.bedIdCounter;
        var diagnosisTemplateIdCounter = oldEngine.diagnosisTemplateIdCounter;
        var syncRecordIdCounter = oldEngine.syncRecordIdCounter;
      };
    };
  };

};
