var MRP;
if (!MRP) {
    MRP = {};
}

(function () {

    MRP.client = null;
    MRP.mypatient = null;
    MRP.reconciled = [];

    MRP.getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    MRP.getGUID = () => {
        let s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    MRP.now = () => {
        let date = new Date();
        return date.toISOString();
    };

    MRP.displayPatient = (pt) => {
        $('#name1, #name2').html(MRP.getPatientName(pt));
    };

    MRP.displayScreen = (screenID) => {
        // TODO: add transitions and other eye candy
        $('#intro-screen').hide();
        $('#medrec-screen').hide();
        $('#review-screen').hide();
        $('#confirm-screen').hide();
        $('#'+screenID).show();
    };

    MRP.displayIntroScreen = () => {
        MRP.displayScreen('intro-screen');
    };

    MRP.displayMedRecScreen = () => {
        MRP.displayScreen('medrec-screen');
    };

    MRP.displayConfirmScreen = () => {
        MRP.displayScreen('confirm-screen');
    };

    MRP.displayReviewScreen = () => {
        $("#finallist").empty();
        MRP.listResource.entry = [];
        MRP.reconciled.sort((a,b) => a.name >= b.name)
                    .filter((a) => a.status === "active")
                    .forEach((med) => {
                        if ($('#' + med.id).val() === "active") {
                            MRP.listResource.entry.push ({
                                "item": {
                                    "reference": med.ref
                                }
                            });
                            $("#finallist").append("<tr><td class='medtd'>" + med.name + 
                                                "</td><td>" + med.dosage +
                                                "</td><td>" + med.route + "</td></tr>");
                        }
                    });

        MRP.displayScreen('review-screen');
    }

    MRP.disable = (id) => {
        $("#"+id).prop("disabled",true);
    };

    MRP.getPatientName = (pt) => {
        if (pt.name) {
            let names = pt.name.map((n) => n.given.join(" ") + " " + n.family);
            return names.join(" / ");
        } else {
            return "anonymous";
        }
    };

    MRP.getMedicationName = (medCodings) => {
        let coding = medCodings.find((c) => c.system == "http://www.nlm.nih.gov/research/umls/rxnorm");
        return coding && coding.display || "Unnamed Medication(TM)";
    };

    MRP.loadData = (client) => {
        MRP.client = client;
        let pid = MRP.client.patient.id;
        let slists = MRP.scenarios[pid].lists;

        $('#scenario-intro').html(MRP.scenarios[pid].description);
        MRP.displayIntroScreen();
        // TODO: implement error handling for missing scenarios

        MRP.client.patient.read().then((pt) => {
            MRP.mypatient = pt;
            MRP.displayPatient (pt);
        });

        MRP.client.patient.api.fetchAll(
            { type: "List" }
        ).then((lists) => {
            let medPromises = [];
            lists.filter((list) => slists.find(l => l === list.id))
                .forEach((l) => {
                    $('#lists1').append("<h4>" + l.title + " - " + l.date + "</h4>" +
                                        "<p><div class='dvt'><table class='table'><thead><tr>" +
                                        "<th>Medication</th><th>Dosage</th><th>Route</th><th>Status</th>" +
                                        "</tr></thead><tbody id='" + l.id + "'></tbody></table></div></p>");
                    if (l.entry) {
                            let promises = l.entry.map((e) => {
                                let medID = e.item.reference.split("/")[1];
                                return MRP.client.patient.api.read({
                                    type: "MedicationRequest", 
                                    id: medID
                                }).then(r => Promise.resolve({
                                    res: r,
                                    lid: l.id
                                }));
                            });
                        medPromises = medPromises.concat(promises);   
                    }
                });

            Promise
                .all(medPromises)
                .then((res) => {
                    res.forEach((r) => {
                        let med = r.res.data;
                        let medName = MRP.getMedicationName(med.medicationCodeableConcept.coding);
                        let dosage = med.dosageInstruction[0].text; // TODO: Construct dosage from structured SIG
                        let route = 'oral';  // TODO: Get route from Med resource
                        let status = med.status; // TODO: Make use of status
                        let medid = med.id;
                        MRP.reconciled.push ({name: medName, id:medid, dosage: dosage, route: route, status:"active"});
                        // TODO: medid for the purposes of the list should be listid+medid to avoid collisions
                        $('#' + r.lid).append("<tr><td class='medtd'>" + medName + "</td><td>" + dosage + "</td><td>" + 
                                            route + "</td><td><select class='custom-select' id='" + 
                                            medid + "'><option value='active'>Active</option>" +
                                            "<option value='stop'>Stop</option><option value='hold'>On-hold</option>" +
                                            "</select></td></tr>");
                    });
                    $("#spinner").hide();
                    $("#meds").show();
                });
        });
    };

    MRP.reconcile = () => {
        let timestamp = MRP.now();

        $('#discharge-selection').hide();
        MRP.disable('btn-submit');
        MRP.disable('btn-edit');
        $('#btn-submit').html("<i class='fa fa-circle-o-notch fa-spin'></i> Submit reconciled medications");

        // TODO: Generate new MedicationRequests etc
        // TODO: Disable/deprecate source lists and MedicationRequest-s
        // TODO: Review list ID generation scheme
        MRP.listResource.id = "list-" + MRP.getRandomInt (1000,9999);
        MRP.listResource.date = timestamp;
        MRP.listResource.subject.reference = "Patient/" + MRP.client.patient.id;
        let listCreatePromise = MRP.client.patient.api.update({resource: MRP.listResource});

        let orgID = MRP.mypatient.managingOrganization.reference.split('/')[1];
        let locID = MRP.scenarios[MRP.client.patient.id].location;
        // TODO: handle missing scenarios

        Promise.all([
            MRP.client.user.read(),
            MRP.client.patient.api.read({type: "Organization", id: orgID}),
            MRP.client.patient.api.read({type: "Location", id: locID}),
            MRP.client.patient.api.search({type: "Coverage", query: {subscriber: MRP.client.patient.id}})
        ]).then((res) => {
            console.assert (res[3].data.total <= 1, "No more than 1 Coverage resources found");
            console.assert (res[3].data.total === 1, "Matching Coverage resource found");

            let measurereport = MRP.operationPayload.parameter.find(e => e.name === "measure-report");

            // TODO: consider generating from a template instead of extracting from sample
            let task = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Task");
            let patient = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Patient");
            let location = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Location");
            let practitioner = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Practitioner");
            let organization = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Organization");
            let encounter = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Encounter");
            let coverage = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Coverage");

            patient.resource = MRP.mypatient;
            practitioner.resource = res[0];
            organization.resource = res[1].data;
            location.resource = res[2].data;
            coverage.resource = res[3].data.entry[0].resource;
        
            MRP.operationPayload.id = MRP.getGUID();
            measurereport.resource.id = MRP.getGUID();
            task.resource.id = MRP.getGUID();
            encounter.resource.id = MRP.getGUID();

            // TODO: Consider a more sophisticated resource generation model
            measurereport.resource.patient.reference = "Patient/" + patient.resource.id;
            measurereport.resource.date = timestamp;
            measurereport.resource.reportingOrganization = "Organization/" + organization.resource.id;
            measurereport.resource.evaluatedResources.extension[0].valueReference.reference = "Task/" + task.resource.id;
            task.resource.for.reference = "Patient/" + patient.resource.id;
            task.resource.context.reference = "Encounter/" + encounter.resource.id;
            task.resource.authoredOn = timestamp;
            task.resource.owner.reference = "Practitioner/" + practitioner.resource.id;
            encounter.resource.period.start = timestamp;
            encounter.resource.period.end = timestamp;
            encounter.resource.subject.reference = "Patient/" + patient.resource.id;
            encounter.resource.location.reference = "Location/" + location.resource.id;
            encounter.resource.participant[0].individual.reference = "Practitioner/" + practitioner.resource.id;
            encounter.resource.serviceProvider.reference = "Organization/" + organization.resource.id;

            patient.resource.managingOrganization = "Organization/" + organization.resource.id;
            coverage.resource.policyHolder.reference = "Patient/" + patient.resource.id;
            coverage.resource.subscriber.reference = "Patient/" + patient.resource.id;
            coverage.resource.beneficiary.reference = "Patient/" + patient.resource.id;

            // TODO: Fix "Resource Organization/organization04 not found, specified in path: Coverage.payor" error. For now:
            coverage.resource.payor[0].reference = "Organization/" + organization.resource.id;
            // Question: Should payor even be submitted here explicitly? If yes, then how would it get into the Payer sandbox?
        
            if (! $('#chk-post-discharge').is(':checked')) {
                task.resource.code.coding = [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "430193006",
                        "display": "Generic Medication Reconciliation"
                    }
                ];
            }
        
            MRP.operationPayload.parameter = [measurereport, task, patient, location, practitioner, organization, encounter, coverage];
        
            Promise.all([
                listCreatePromise,
                $.ajax({
                    type: 'POST',
                    url: "https://api-v5-stu3.hspconsortium.org/DaVinciPayerDemo2/open/MeasureReport/measure-mrp/$submit-data",
                    data: JSON.stringify(MRP.operationPayload),
                    contentType: "application/fhir+json"
                    //TODO: add error handling
                })
            ]).then(() => {
                $('#confirm-screen p').append(" (" + MRP.listResource.id + ")");
                console.log (JSON.stringify(MRP.operationPayload, null, 2));
                MRP.displayConfirmScreen();
            });
        });
    };

    $('#chk-post-discharge').bootstrapToggle({
        on: 'Yes',
        off: 'No'
    });

    $('#btn-review').click(MRP.displayReviewScreen);
    $('#btn-start').click(MRP.displayMedRecScreen);
    $('#btn-edit').click(MRP.displayMedRecScreen);
    $('#btn-submit').click(MRP.reconcile);

    FHIR.oauth2.ready(MRP.loadData);

}());