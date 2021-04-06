let Config = {};

Config.clientSettings = {
  "client_id": "9858e697-1755-4f14-b77d-1b669cd3b05a",
  "scope"    : "patient/*.* openid profile"
}

Config.submitEndpoint = "/Measure/MEASUREID/$submit-data";

Config.payerEndpoints = [{
    "name": "Alphora (Open)",
    "type": "open",
    "url": "https://gic-sandbox.alphora.com/cqf-ruler-r4/fhir/",
    "measureID": "measure-mrp"
  },{
    "name": "HSPC Payer Demo (Secure)",
    "type": "secure-smart",
    "url": "https://api.logicahealth.org/DaVinciMRPPayerR4/data",
    "measureID": "measure-mrp",
    "clientID": "436f7bcc-07cc-4e04-a395-a610fde492ba",
    "scope": "user/*.write" // offline_access
  },{
    "name": "HSPC Payer Demo (Open)",
    "type": "open",
    "url": "https://api.logicahealth.org/DaVinciMRPPayerR4/open",
    "measureID": "measure-mrp"
  },{
    "name": "DBCG (Open)",
    "type": "open",
    "url": "http://measure.eval.kanvix.com/cqf-ruler/baseDstu3",
    "measureID": "measure-mrp"
  },{
    "name": "BCBS Alabama (Secure)",
    "type": "secure-generic",
    "url": "https://api2.bcbsal.org/fhir/stu3",
    "measureID": "measure-mrp",
    "accessToken": "SECRETHERE"
  },{
    "name": "CareEvolution (Secure)",
    "type": "secure-smart",
    "url": "https://b3-fhirmeasuresendpoints-3629-consumers-sprint-s.b3-deploys.com/FhirMeasuresEndPoints.Adapter1.WebClient/api/fhir",
    "measureID": "measure-mrp",
    "clientID": "HSPC",
    "scope": "user/*.read"
  },{
    "name": "TS Proxy - CareEvolution (Secure)",
    "type": "secure-smart",
    "url": "https://touchstone.aegis.net:57827/FhirMeasuresEndPoints.Adapter1.WebClient/api/fhir",
    "measureID": "measure-mrp",
    "clientID": "HSPC",
    "scope": "user/*.read"
  },{
    "name": "Humana (Open)",
    "type": "open",
    "url": "https://deqm-dot-hum-hcs-rapid-fhir-sbx.appspot.com/baseSTU3",
    "measureID": "measure-mrp"
  },{
    "name": "TS Proxy - Humana (Open)",
    "type": "open",
    "url": "https://touchstone.aegis.net:54868/baseSTU3",
    "measureID": "measure-mrp"
  },{
    "name": "IBC (Open)",
    "type": "open",
    "url": "https://TBD",
    "measureID": "measure-mrp"
  },{
    "name": "Edifecs - GuideWell Demo (Open)",
    "type": "open",
    "url": "https://fhir.collablynk.com",
    "measureID": "measure-mrp"
  },{
    "name": "TS Proxy - Edifecs - GuideWell Demo (Open)",
    "type": "open",
    "url": "https://touchstone.aegis.net:59200",
    "measureID": "measure-mrp"
  },{
    "name": "UnitedHealthcare (Open)",
    "type": "open",
    "url": "https://fhirreststaging.azurewebsites.net/fhir",
    "measureID": "measure-mrp"
  },{
    "name": "TS Proxy - UnitedHealthcare (Open)",
    "type": "open",
    "url": "https://touchstone.aegis.net:57798/fhir",
    "measureID": "measure-mrp"
  }
]

// default configuration
Config.configSetting = 0; // Alphora (Open)
Config.payerEndpoint = Config.payerEndpoints[Config.configSetting];

Config.scenarios = {
  "patient01": {
    "lists": ["list01", "list02"],
    "location": "location01",
    "description": "Mr. Webster is a 72 y.o. male who was discharged from the hospital 10 days ago. He was admitted for an exacerbation of heart failure due to fluid overload due to dietary changes. His weight had increased by 15 pounds compared to his last outpatient visit 6 weeks earlier. His echocardiogram showed a stable ejection fraction of 25% compared to 8 months prior. He was treated with diuretics, and his medications were adjusted at discharge.<br/><br/>As the follow-up physician, you will be reconciling Mr. Webster's discharge medication list against his last outpatient medication list."
  },
  "patient02": {
    "lists": ["list03", "list04"],
    "location": "location02",
    "description": "Mr. Bernard is a 51 y.o. male with a history of hypertension and gout who was discharged from the hospital 3 days ago following a 3 day admission for acute left lower lobe pneumonia. He was discharged on an oral antibiotics and instructed to follow-up with his primary care physician within 5 days of discharge.<br/><br/>As the follow-up physician, you will be reconciling Mr. Bernard's discharge medication list against his last outpatient medication list."
  },
  "patient03": {
    "lists": ["list05", "list06"],
    "location": "location03",
    "description": "Ms. Hartman is a 35y.o. previously healthy female who was discharged from the hospital 10 days prior following a 2 day admission for acute pyelonephritis. She was discharged on oral antibiotics and instructed to follow-up with her primary care physician within 2 weeks.<br/><br/>As the follow-up physician, you will be reconciling Ms. Hartman's discharge medication list against his last outpatient medication list."
  },
  "patient04": {
    "lists": ["list07", "list08"],
    "location": "location01",
    "description": "Viet to put in"
  },
  "cf-1548845717752": {
    "lists": ["cf-1549030480855", "cf-1549030685865"],
    "location": "location01",
    "description": "You the primary care provider who is seeing Dara Kim for a discharge follow-up appointment. She was admitted to the hospital for evaluation of chest pain. She was found to have coronary disease and received a stent. She was discharged seven days ago. During this visit you will be performing a post-discharge medication reconciliation and attest to completing the reconciliation."
  }
}

Config.operationPayload = {
    "resourceType": "Parameters",
    "id": "OPERATIONID",
    "parameter": [
      {
        "name": "measureReport",
        "resource": {
            "resourceType": "MeasureReport",
            "meta": {
              "profile": ["http://hl7.org/fhir/us/davinci-deqm/STU3/StructureDefinition/measurereport-deqm"]
            },
            "id": "MEASUREREPORTID",
            "status": "complete",
            "type": "individual",
            "measure": {
                "reference": "https://ncqa.org/fhir/ig/Measure/measure-mrp"
            },
            "subject": {
                "reference": "Patient/PATIENTID"
            },
            "date": "TIMESTAMP",
            "period": {
                "start": "TIMESTAMP",
                "end": "TIMESTAMP"
            },
            "reporter": {
                "reference": "Organization/ORGANIZATIONID"
            },
            "evaluatedResource": [{
                "reference": "Task/TASKID"
            }]
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Task",
            "meta": {
              "profile": ["http://hl7.org/fhir/us/hedis/StructureDefinition/hedis-task"]
            },
            "id": "TASKID",
            "identifier" : [
              {
                "system" : "http://www.acme.org/tasks",
                "value" : "12345"
              }
            ],            
            "status": "completed",
            "intent": "plan",
            "priority": "routine",
            "code": {
                "coding":[
                    {
                        "system": "http://www.ama-assn.org/go/cpt",
                        "code": "1111F",
                        "display": "Medication Reconciliation"
                    }
                ]
            },
            "for": {
              "reference": "Patient/PATIENTID"
            },
            "encounter": {
              "reference": "Encounter/ENCOUNTERID"
            },
            "authoredOn": "TIMESTAMP",
            "executionPeriod": {
              "start": "TIMESTAMP",
              "end": "TIMESTAMP"
            },
            "owner": {
              "reference": "Practitioner/PRACTITIONERID"
            }
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Patient"
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Location"
        }          
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Practitioner"
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Organization"
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Encounter",
            "id": "ENCOUNTERID",
            "meta": {
              "profile": ["http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-encounter"]
            },
            "status": "finished",
            "class": {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "AMB",
              "display": "ambulatory"
            },
            "type": [
              {
                "coding": [
                  {
                    "system": "http://snomed.info/sct",
                    "code": "390906007",
                    "display": "Follow-up encounter (procedure)"
                  }
                ]
              }
            ],
            "period": {
                "start": "TIMESTAMP",
                "end": "TIMESTAMP"
            },
            "subject": {
              "reference": "Patient/PATIENTID"
            },
            "location": [{
              "location": {
                  "reference": "Location/LOCATIONID"
              }
            }],
            "participant": [
              {
                "individual": {
                  "reference": "Practitioner/PRACTITIONERID"
                }
              }
            ],
            "serviceProvider": {
              "reference": "Organization/ORGANIZATIONID"
            }
        }
      },
      {
        "name": "resource",
        "resource": {
            "resourceType": "Coverage"
          }
      }
    ]
}

Config.postDischargeReconciliationCoding = {
  "system": "http://snomed.info/sct",
  "code": "430193006",
  "display": "Generic Medication Reconciliation"
}

export default Config;
