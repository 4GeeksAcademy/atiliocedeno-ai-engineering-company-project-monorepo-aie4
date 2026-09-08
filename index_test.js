(function () {
  const collections = window.HealthCoreCollections;
  const search = window.HealthCoreSearch;
  const validations = window.HealthCoreValidations;
  const transformations = window.HealthCoreTransformations;
  const data = window.HealthCoreDummyData;
  const outputEl = document.getElementById("output");

  function logResult(label, dataValue) {
    const entry = { label, data: dataValue };
    const previous = outputEl.textContent ? `${outputEl.textContent}\n\n` : "";
    outputEl.textContent = `${previous}${JSON.stringify(entry, null, 2)}`;
  }

  function setExampleValues() {
    const thresholdInput = document.getElementById("threshold");
    if (thresholdInput) thresholdInput.value = "8";

    const weekEndingDate = document.getElementById("weekEndingDate");
    if (weekEndingDate) weekEndingDate.value = "2026-09-12";

    const asOfDate = document.getElementById("asOfDate");
    if (asOfDate) asOfDate.value = "2026-09-08";
  }

  function runAction(action) {
    if (!outputEl) return;
    outputEl.textContent = "";

    switch (action) {
      case "filterClaims":
        logResult("filterClaims", collections.filterClaims(data.sampleClaims, { locationId: "loc-001", payerName: "Aetna" }));
        break;
      case "filterAppointments":
        logResult("filterAppointmentsByStatus", collections.filterAppointmentsByStatus(data.sampleAppointments, ["scheduled", "confirmed"]));
        break;
      case "sortClaims":
        logResult("sortClaimsById asc", collections.sortClaimsById(data.sampleClaims, "asc"));
        logResult("sortClaimsById desc", collections.sortClaimsById(data.sampleClaims, "desc"));
        break;
      case "sortAppointments":
        logResult("sortAppointmentsByDate asc", collections.sortAppointmentsByDate(data.sampleAppointments, "asc"));
        logResult("sortAppointmentsByDate desc", collections.sortAppointmentsByDate(data.sampleAppointments, "desc"));
        break;
      case "groupClaims":
        logResult("groupClaimsBy payerName", collections.groupClaimsBy(data.sampleClaims, "payerName"));
        break;
      case "search":
        logResult("findClaimById", search.findClaimById(data.sampleClaims, "CLM-1002"));
        logResult("findClinicianById", search.findClinicianById(data.sampleClinicians, "CLN-002"));
        break;
      case "binarySearch": {
        const sortedClaims = collections.sortClaimsById(data.sampleClaims, "asc");
        logResult("binarySearchClaimById found", search.binarySearchClaimById(sortedClaims, "CLM-1004"));
        logResult("binarySearchClaimById missing", search.binarySearchClaimById(sortedClaims, "CLM-9999"));
        break;
      }
      case "denialRate":
        logResult("calculateDenialRate", transformations.calculateDenialRate(data.sampleClaims));
        logResult("denialRateByPayer", transformations.denialRateByPayer(data.sampleClaims));
        logResult("denialRateByLocation", transformations.denialRateByLocation(data.sampleClaims));
        logResult("flagHighDenialPayers", transformations.flagHighDenialPayers(data.sampleClaims, 8));
        break;
      case "noShow": {
        const location = data.sampleLocations[0];
        const weekEndingDate = document.getElementById("weekEndingDate").value || "2026-09-12";
        logResult("calculateNoShowCost", transformations.calculateNoShowCost(data.sampleAppointments, location, weekEndingDate));
        logResult("noShowRateByLocation", transformations.noShowRateByLocation(data.sampleAppointments));
        logResult("flagHighNoShowLocations", transformations.flagHighNoShowLocations(data.sampleAppointments, 20));
        break;
      }
      case "cme": {
        const asOfDate = document.getElementById("asOfDate").value || "2026-09-08";
        logResult("generateCMEReport", transformations.generateCMEReport(data.sampleClinicians, asOfDate));
        logResult("getCliniciansAtRisk", transformations.getCliniciansAtRisk(data.sampleClinicians, asOfDate));
        logResult("getCliniciansWithExpiringLicences", transformations.getCliniciansWithExpiringLicences(data.sampleClinicians, asOfDate, 90));
        break;
      }
      case "validate": {
        const knownIds = data.sampleLocations.map((location) => location.locationId);
        const invalidClaim = {
          ...data.sampleClaims[1],
          claimAmount: 0,
          patientId: "INVALID",
          status: "denied",
          denialReason: "coding_error",
        };
        logResult("validateClaim valid", validations.validateClaim(data.sampleClaims[0], knownIds));
        logResult("validateClaim invalid", validations.validateClaim(invalidClaim, knownIds));
        logResult("validateClinician", validations.validateClinician(data.sampleClinicians[0]));
        break;
      }
      case "thresholds":
        logResult("isDenialRateAboveThreshold", validations.isDenialRateAboveThreshold(12, 8));
        logResult("isNoShowRateAboveThreshold", validations.isNoShowRateAboveThreshold(25, 20));
        break;
      default:
        logResult("info", "Sin acción seleccionada");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setExampleValues();

    document.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        runAction(button.dataset.action);
      });
    });
  });
})();
