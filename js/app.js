var MRP;
if (!MRP) {
    MRP = {};
}

(function () {

    MRP.client = null;
    MRP.patient = null;
    MRP.reconciledMeds = [];

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
        $('#config-screen').hide();
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

    MRP.displayConfigScreen = () => {
        if (MRP.configSetting === "custom") {
            $('#config-select').val("custom");
        } else {
            $('#config-select').val(MRP.configSetting);
        }
        $('#config-text').val(JSON.stringify(MRP.payerEndpoint, null, 2));
        MRP.displayScreen('config-screen');
    };

    MRP.displayReviewScreen = () => {
        $("#finallist").empty();
        MRP.newListResource.entry = [];
        MRP.reconciledMeds
                    .sort((a,b) => a.name >= b.name)
                    .filter((a) => a.status === "active")
                    .forEach((med) => {
                        if ($('#' + med.id).val() === "active") {
                            MRP.newListResource.entry.push ({
                                "item": {
                                    "reference": "MedicationRequest/" + med.id
                                }
                            });
                            $("#finallist").append("<tr><td class='medtd'>" + med.name + 
                                                "</td><td>" + med.dosage +
                                                "</td><td>" + med.route + "</td></tr>");
                        }
                    });

        MRP.displayScreen('review-screen');
    }

    MRP.displayErrorScreen = (title, message) => {
        $('#error-title').html(title);
        $('#error-message').html(message);
        MRP.displayScreen('error-screen');
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
        try {
            MRP.client = client;
            let pid = MRP.client.patient.id;
            let slists = MRP.scenarios[pid].lists;

            $('#scenario-intro').html(MRP.scenarios[pid].description);
            MRP.displayIntroScreen();

            MRP.client.patient.read().then((pt) => {
                MRP.patient = pt;
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
                            MRP.reconciledMeds.push ({name: medName, id:medid, dosage: dosage, route: route, status:"active"});
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
        } catch (err) {
            MRP.displayErrorScreen("Failed to initialize scenario", "Please make sure to launch the app with one of the following sample patients: " + Object.keys(MRP.scenarios).join(", "));
        }
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
        MRP.newListResource.id = "list-" + MRP.getRandomInt (1000,9999);
        MRP.newListResource.date = timestamp;
        MRP.newListResource.subject.reference = "Patient/" + MRP.client.patient.id;
        let listCreatePromise = MRP.client.patient.api.update({resource: MRP.newListResource});

        let orgID = MRP.patient.managingOrganization.reference.split('/')[1];
        let locID = MRP.scenarios[MRP.client.patient.id].location;

        Promise.all([
            MRP.client.user.read(),
            MRP.client.patient.api.read({type: "Organization", id: orgID}),
            MRP.client.patient.api.read({type: "Location", id: locID}),
            MRP.client.patient.api.search({type: "Coverage", query: {subscriber: MRP.client.patient.id}})
        ]).then((res) => {
            console.assert (res[3].data.total <= 1, "No more than 1 Coverage resources found");
            console.assert (res[3].data.total === 1, "Matching Coverage resource found");

            var coverageResource = res[3].data.entry[0].resource;
            var payorOrgID = coverageResource.payor[0].reference.split('/')[1];

            MRP.client.patient.api.read({type: "Organization", id: payorOrgID}).then(function(payorOrganization) {
                let measurereport = MRP.operationPayload.parameter.find(e => e.name === "measure-report");

                // TODO: consider generating from a template instead of extracting from sample
                let task = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Task");
                let patient = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Patient");
                let location = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Location");
                let practitioner = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Practitioner");
                let organization = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Organization");
                let encounter = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Encounter");
                let coverage = MRP.operationPayload.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Coverage");
                let payor = {
                    "name": "resource",
                    "resource": payorOrganization.data
                };
    
                MRP.operationPayload.id = MRP.getGUID();
                measurereport.resource.id = MRP.getGUID();
                task.resource.id = MRP.getGUID();
                encounter.resource.id = MRP.getGUID();
    
                patient.resource = MRP.patient;
                practitioner.resource = res[0];
                organization.resource = res[1].data;
                location.resource = res[2].data;
                coverage.resource = coverageResource;
    
                // TODO: look into a nicer resource generation lib
                measurereport.resource.patient.reference = "Patient/" + patient.resource.id;
                measurereport.resource.date = timestamp;
                measurereport.resource.period.start = timestamp;
                measurereport.resource.period.end = timestamp;
                measurereport.resource.reportingOrganization = "Organization/" + organization.resource.id;
                measurereport.resource.evaluatedResource[0].reference = "Task/" + task.resource.id;
                task.resource.for.reference = "Patient/" + patient.resource.id;
                task.resource.context.reference = "Encounter/" + encounter.resource.id;
                task.resource.authoredOn = timestamp;
                task.resource.executionPeriod.start = timestamp;
                task.resource.executionPeriod.end = timestamp;
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
                // coverage.resource.payor[0].reference = "Organization/organization04";
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
            
                MRP.operationPayload.parameter = [measurereport, task, patient, location, practitioner, organization, encounter, coverage, payor];
    
                $('#confirm-screen p').append(" (" + MRP.newListResource.id + ")")
    
                Promise.all([listCreatePromise]).then(() => {
                    if (MRP.payerEndpoint.type === "secure-smart") {
                        sessionStorage.operationPayload = JSON.stringify(MRP.operationPayload);
                        if (localStorage.tokenResponse) {
                            let state = JSON.parse(localStorage.tokenResponse).state;
                            sessionStorage.tokenResponse = localStorage.tokenResponse;
                            sessionStorage[state] = localStorage[state];
                            FHIR.oauth2.ready(MRP.initialize);
                        } else {
                            FHIR.oauth2.authorize({
                                "client": {
                                    "client_id": MRP.payerEndpoint.clientID,
                                    "scope":  MRP.payerEndpoint.scope
                                },
                                "server": MRP.payerEndpoint.url
                            });
                        }
                    } else {
                        MRP.finalize();
                    }

                });
            });
        });
    };

    MRP.initialize = (client) => {
        MRP.loadConfig();
        if (sessionStorage.operationPayload) {
            if (JSON.parse(sessionStorage.tokenResponse).refresh_token) {
                let state = JSON.parse(sessionStorage.tokenResponse).state;
                localStorage.tokenResponse = sessionStorage.tokenResponse;
                localStorage[state] = sessionStorage[state];
            }
            MRP.operationPayload = JSON.parse(sessionStorage.operationPayload);
            MRP.payerEndpoint.accessToken = JSON.parse(sessionStorage.tokenResponse).access_token;
            MRP.finalize();
        } else {
            MRP.loadData(client);
        }
    };

    MRP.loadConfig = () => {
        let configText = window.localStorage.getItem("mrp-app-config");
        if (configText) {
            let conf = JSON.parse (configText);
            if (conf['custom']) {
                MRP.payerEndpoint = conf['custom'];
                MRP.configSetting = "custom";
            } else {
                MRP.payerEndpoint = MRP.payerEndpoints[conf['selection']];
                MRP.configSetting = conf['selection'];
            }
        }
    }

    MRP.finalize = () => {
        let promise;

        var config = {
            type: 'POST',
            url: MRP.payerEndpoint.url + MRP.submitEndpoint,
            data: JSON.stringify(MRP.operationPayload),
            contentType: "application/fhir+json"
        };

        if (MRP.payerEndpoint.type !== "open") {
            config['beforeSend'] = function (xhr) {
                xhr.setRequestHeader ("Authorization", "Bearer " + MRP.payerEndpoint.accessToken);
            };
        }

        promise = $.ajax(config);

        promise.then(() => {
            console.log (JSON.stringify(MRP.operationPayload, null, 2));
            MRP.displayConfirmScreen();
        }, () => MRP.displayErrorScreen("Measure report submission failed", "Please check the submit endpoint configuration"));
    }

    $('#chk-post-discharge').bootstrapToggle({
        on: 'Yes',
        off: 'No'
    });

    $('#btn-review').click(MRP.displayReviewScreen);
    $('#btn-start').click(MRP.displayMedRecScreen);
    $('#btn-edit').click(MRP.displayMedRecScreen);
    $('#btn-submit').click(MRP.reconcile);
    $('#btn-configuration').click(MRP.displayConfigScreen);
    $('#btn-config').click(function () {
        let selection = $('#config-select').val();
        if (selection !== 'custom') {
            window.localStorage.setItem("mrp-app-config", JSON.stringify({'selection': parseInt(selection)}));
        } else {
            let configtext = $('#config-text').val();
            let myconf;
            try {
                myconf = JSON.parse(configtext);
            } catch {
                alert ("Huston, we have a problem!");
            }
            window.localStorage.setItem("mrp-app-config", JSON.stringify({'custom': myconf}));
        }
        MRP.loadConfig();
        MRP.displayReviewScreen();
    });

    MRP.payerEndpoints.forEach((e, id) => {
        $('#config-select').append("<option value='" + id + "'>" + e.name + "</option>");
    });

    $('#config-select').append("<option value='custom'>Custom</option>");
    $('#config-text').val(JSON.stringify(MRP.payerEndpoints[0],null,"   "));

    $('#config-select').on('change', function() {
        if (this.value !== "custom") {
            $('#config-text').val(JSON.stringify(MRP.payerEndpoints[parseInt(this.value)],null,2));
        }
    });

    $('#config-text').bind('input propertychange', () => {
        $('#config-select').val('custom');
    });

    FHIR.oauth2.ready(MRP.initialize);

}());