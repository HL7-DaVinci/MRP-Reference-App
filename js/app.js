// TODO: add transitions and other eye candy
// TODO: replace `document` with jQuery

var med_list = document.getElementById('lists1');
var client;
var mypatient;
var reconciled = [];

$('#chk-post-discharge').bootstrapToggle({
    on: 'Yes',
    off: 'No'
});

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function now() {
    var date = new Date();
    return date.toISOString();
}

function displayPatient (pt) {
    document.getElementById('name1').innerHTML = getPatientName(pt);
    document.getElementById('name2').innerHTML = getPatientName(pt);
}

function hideAll () {
    var screens = ['intro-screen','medrec-screen','review-screen','confirm-screen'];
    screens.forEach(screenID => $('#'+screenID).hide());
}

function display (screenID) {
    hideAll ();
    $('#'+screenID).show();
}

function displayIntroScreen () {
    display('intro-screen');
}

function displayMedRecScreen () {
    display('medrec-screen');
}

function displayReviewScreen () {
    reconciled.sort (function (a,b){return a.name >= b.name}).filter(function(a){a.status === "active"});
    var displayUL2 = document.getElementById("finallist");
    displayUL2.innerHTML = "";
    listresource.entry = [];
    reconciled.forEach (function (med) {
        if ($('#' + med.id).val() === "active") {
            listresource.entry.push ({
                "item": {
                    "reference": med.ref
                }
            });
            displayUL2.innerHTML +=  "<tr><td class='medtd'>" + med.name + "</td><td>" + med.dosage + "</td><td>" + 
                            med.route + "</td></tr>";
         }
    });

    display('review-screen');
}

function displayConfirmScreen () {
    display('confirm-screen');
}

function disable(id){
    $("#"+id).prop("disabled",true);
}

$('#btn-review').click(displayReviewScreen);
$('#btn-start').click(displayMedRecScreen);
$('#btn-edit').click(displayMedRecScreen);
$('#btn-submit').click(reconcile);

function getPatientName (pt) {
    if (pt.name) {
        var names = pt.name.map(function(name) {
            return name.given.join(" ") + " " + name.family;
        });
        return names.join(" / ");
    } else {
        return "anonymous";
    }
}

function getMedicationName (medCodings) {
    var coding = medCodings.find(function(c){
        return c.system == "http://www.nlm.nih.gov/research/umls/rxnorm";
    });
    return coding && coding.display || "Unnamed Medication(TM)";
}

FHIR.oauth2.ready(function(smart){
    client = smart;

    var pid = smart.patient.id;
    var slists = scenarios[pid].lists;
    $('#scenario-intro').html(scenarios[pid].description);
    displayIntroScreen ();
    // TODO: implement error handling for missing scenarios

    smart.patient.read().then(function(pt) {
        mypatient = pt;
        displayPatient (pt);
    });
    smart.patient.api.fetchAll(
        { type: "List" }
    ).then(function(lists) {
        var medPromises = [];
        lists.filter(function(list){
            return slists.find(l => l === list.id);
        }).forEach(function(l){
            med_list.innerHTML += "<h4>" + l.title + " - " + l.date + "</h4><p><div class='dvt'><table class='table'><thead><tr><th>Medication</th><th>Dosage</th><th>Route</th><th>Status</th></tr></thead><tbody id='" + l.id + "'></tbody></table></div></p>";
            if (l.entry) {
                    var promises = l.entry.map(function(e) {
                    var medID = e.item.reference.split("/")[1];
                    return smart.patient.api.read({
                        type: "MedicationRequest", 
                        id: medID
                    }).then(r => Promise.resolve({
                        res: r,
                        lid: l.id
                    }));
                })
                medPromises = medPromises.concat(promises);   
            }
        });

        Promise
            .all(medPromises)
            .then(function(res) {
                res.forEach(function(r){
                    var displayUL = document.getElementById(r.lid);
                    var med = r.res.data;
                    var medName = getMedicationName(med.medicationCodeableConcept.coding);
                    var dosage = med.dosageInstruction[0].text; // TODO: Construct dosage from structured SIG
                    var route = 'oral';  // TODO: Get route from Med resource
                    var status = med.status; // TODO: Make use of status
                    var medid = med.id;
                    reconciled.push ({name: medName, id:medid, dosage: dosage, route: route, status:"active"});
                    // TODO: medid for the purposes of the list should be listid+medid to avoid collisions
                    displayUL.innerHTML +=  "<tr><td class='medtd'>" + medName + "</td><td>" + dosage + "</td><td>" + 
                                            route + "</td><td><select class='custom-select' id='" + 
                                            medid + "'><option value='active'>Active</option><option value='stop'>Stop</option><option value='hold'>On-hold</option></select></td></tr>";
                });
                $("#spinner").hide();
                $("#meds").show();
            });
    });
});

function reconcile () {
    $('#btn-submit').html("<i class='fa fa-circle-o-notch fa-spin'></i> Submit reconciled medications");
    disable('btn-submit');
    disable('btn-edit');
    $('#discharge-selection').hide();

    var timestamp = now();

    // TODO: Generate new MedicationRequests etc
    // TODO: Disable/deprecate source lists and MedicationRequests-s
    // TODO: Review list ID generation scheme
    listresource.id = "list-" + getRandomInt (1000,9999);
    listresource.date = timestamp;
    listresource.subject.reference = "Patient/" + client.patient.id;
    var listCreatePromise = client.patient.api.update({resource: listresource});

    var orgID = mypatient.managingOrganization.reference.split('/')[1];
    var locID;
    // TODO: implement error handling for missing scenarios
    locID = scenarios[client.patient.id].location;

    Promise.all([
        client.user.read(),
        client.patient.api.read({type: "Organization", id: orgID}),
        client.patient.api.read({type: "Location", id: locID}),
        client.patient.api.search({type: "Coverage", query: {subscriber: client.patient.id}})
    ]).then(function(res) {
        var mypractitioner = res[0];
        var myorg = res[1].data;
        var myloc = res[2].data;
        var mycoverage = res[3].data.entry[0].resource;

        console.assert (res[3].data.total <= 1, "No more than 1 Coverage resources found");
        console.assert (res[3].data.total === 1, "Matching Coverage resource found");

        var measurereport = operationdata.parameter.find(e => e.name === "measure-report");

        // TODO: These could be generated froma a singular template instead of being extracted from the sample
        var task = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Task");
        var patient = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Patient");
        var location = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Location");
        var practitioner = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Practitioner");
        var organization = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Organization");
        var encounter = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Encounter");
        var coverage = operationdata.parameter.find(e => e.name === "resource" && e.resource.resourceType === "Coverage");

        patient.resource = mypatient;
        location.resource = myloc;
        practitioner.resource = mypractitioner;
        organization.resource = myorg;
        coverage.resource = mycoverage;
    
        operationdata.id = guid();
        measurereport.resource.id = guid();
        task.resource.id = guid();
        encounter.resource.id = guid();

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
    
        operationdata.parameter = [measurereport, task, patient, location, practitioner, organization, encounter, coverage];
    
        Promise.all([
            listCreatePromise,
            $.ajax({
                type: 'POST',
                url: "https://api-v5-stu3.hspconsortium.org/DaVinciPayerDemo2/open/MeasureReport/measure-mrp/$submit-data",
                data: JSON.stringify(operationdata),
                contentType: "application/fhir+json"
                //TODO: Add error handling
            })
        ]).then(function() {
            $('#confirm-screen p').text("Reconciled list written to paitent record. MRP report sent to payer. (" + listresource.id + ")");
            console.log (JSON.stringify(operationdata, null, 2));
            displayConfirmScreen();
        });
    });
}