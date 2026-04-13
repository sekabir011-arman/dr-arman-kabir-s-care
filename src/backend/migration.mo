import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Time "mo:core/Time";

module {

  // ─── Old Types (inlined from .old/src/backend/main.mo) ─────────────────────

  type OldGender = { #male; #female; #other };
  type OldPatientType = { #admitted; #outdoor };

  type OldPatient = {
    id : Nat;
    fullName : Text;
    nameBn : ?Text;
    dateOfBirth : ?Time.Time;
    gender : OldGender;
    phone : ?Text;
    email : ?Text;
    address : ?Text;
    bloodGroup : ?Text;
    weight : ?Float;
    height : ?Float;
    allergies : [Text];
    chronicConditions : [Text];
    pastSurgicalHistory : ?Text;
    patientType : OldPatientType;
    createdAt : Time.Time;
    consultantEmail : ?Text;
    consultantName : ?Text;
  };

  // ─── New Types (matching main.mo Patient type) ───────────────────────────────

  type NewGender = { #male; #female; #other };
  type NewPatientType = { #admitted; #outdoor };

  type NewPatient = {
    id : Nat;
    fullName : Text;
    nameBn : ?Text;
    dateOfBirth : ?Time.Time;
    gender : NewGender;
    phone : ?Text;
    email : ?Text;
    address : ?Text;
    bloodGroup : ?Text;
    weight : ?Float;
    height : ?Float;
    allergies : [Text];
    chronicConditions : [Text];
    pastSurgicalHistory : ?Text;
    patientType : NewPatientType;
    createdAt : Time.Time;
    consultantEmail : ?Text;
    consultantName : ?Text;
  };

  // ─── Actor State Shapes ─────────────────────────────────────────────────────

  type OldActor = {
    patients : Map.Map<Nat, OldPatient>;
    var patientIdCounter : Nat;
  };

  type NewActor = {
    patients : Map.Map<Nat, NewPatient>;
    var patientIdCounter : Nat;
  };

  // ─── Migration Function ─────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let patients = old.patients.map<Nat, OldPatient, NewPatient>(
      func(_id, p) {
        {
          p with
          consultantEmail = p.consultantEmail;
          consultantName = p.consultantName;
        }
      }
    );
    {
      patients;
      var patientIdCounter = old.patientIdCounter;
    };
  };

};
