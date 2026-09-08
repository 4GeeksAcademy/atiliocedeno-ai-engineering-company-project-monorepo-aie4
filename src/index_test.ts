import {
  filterAppointmentsByStatus,
  filterClaims,
  groupClaimsBy,
  sortAppointmentsByDate,
  sortClaimsById,
} from "./utils/collections";
import {
  binarySearchClaimById as binarySearchClaimByIdFromSearch,
  findClaimById,
  findClinicianById,
} from "./utils/search";
import {
  calculateDenialRate,
  calculateNoShowCost,
  denialRateByLocation,
  denialRateByPayer,
  flagHighDenialPayers,
  flagHighNoShowLocations,
  generateCMEReport,
  getCliniciansAtRisk,
  getCliniciansWithExpiringLicences,
  noShowRateByLocation,
} from "./utils/transformations";
import {
  isDenialRateAboveThreshold,
  isNoShowRateAboveThreshold,
  validateClaim,
  validateClinician,
} from "./utils/validations";
import type { Claim } from "./types/models";
import {
  sampleAppointments,
  sampleClaims,
  sampleClinicians,
  sampleLocations,
} from "./utils/dummyData";

const outputEl = document.getElementById("output");

type ActionResult = { label: string; data: unknown };

function logResult(label: string, data: unknown): void {
  if (!outputEl) {
    return;
  }

  const entry: ActionResult = { label, data };
  const previous = outputEl.textContent ? `${outputEl.textContent}\n\n` : "";
  outputEl.textContent = `${previous}${JSON.stringify(entry, null, 2)}`;
}

function setExampleValues(): void {
  const thresholdInput = document.getElementById("threshold") as HTMLInputElement | null;
  if (thresholdInput) {
    thresholdInput.value = "8";
  }

  const weekEndingDate = document.getElementById("weekEndingDate") as HTMLInputElement | null;
  if (weekEndingDate) {
    weekEndingDate.value = "2026-09-12";
  }

  const asOfDate = document.getElementById("asOfDate") as HTMLInputElement | null;
  if (asOfDate) {
    asOfDate.value = "2026-09-08";
  }
}

function runAction(action: string): void {
  if (!outputEl) {
    return;
  }

  outputEl.textContent = "";

  if (action === "filterClaims") {
    const filtered = filterClaims(sampleClaims, {
      locationId: "loc-001",
      payerName: "Aetna",
    });
    logResult("filterClaims", filtered);
  }

  if (action === "filterAppointments") {
    const status = ["scheduled", "confirmed"] as const;
    logResult("filterAppointmentsByStatus", filterAppointmentsByStatus(sampleAppointments, [...status]));
  }

  if (action === "sortClaims") {
    logResult("sortClaimsById asc", sortClaimsById(sampleClaims, "asc"));
    logResult("sortClaimsById desc", sortClaimsById(sampleClaims, "desc"));
  }

  if (action === "sortAppointments") {
    logResult("sortAppointmentsByDate asc", sortAppointmentsByDate(sampleAppointments, "asc"));
    logResult("sortAppointmentsByDate desc", sortAppointmentsByDate(sampleAppointments, "desc"));
  }

  if (action === "groupClaims") {
    logResult("groupClaimsBy payerName", groupClaimsBy(sampleClaims, "payerName"));
  }

  if (action === "search") {
    logResult("findClaimById", findClaimById(sampleClaims, "CLM-1002"));
    logResult("findClinicianById", findClinicianById(sampleClinicians, "CLN-002"));
  }

  if (action === "binarySearch") {
    const sortedClaims = sortClaimsById(sampleClaims, "asc");
    logResult("binarySearchClaimById found", binarySearchClaimByIdFromSearch(sortedClaims, "CLM-1004"));
    logResult("binarySearchClaimById missing", binarySearchClaimByIdFromSearch(sortedClaims, "CLM-9999"));
  }

  if (action === "denialRate") {
    logResult("calculateDenialRate", calculateDenialRate(sampleClaims));
    logResult("denialRateByPayer", denialRateByPayer(sampleClaims));
    logResult("denialRateByLocation", denialRateByLocation(sampleClaims));
    logResult("flagHighDenialPayers", flagHighDenialPayers(sampleClaims, 8));
  }

  if (action === "noShow") {
    const location = sampleLocations[0];
    const weekEndingDate = (document.getElementById("weekEndingDate") as HTMLInputElement | null)?.value ?? "2026-09-12";
    logResult("calculateNoShowCost", calculateNoShowCost(sampleAppointments, location, weekEndingDate));
    logResult("noShowRateByLocation", noShowRateByLocation(sampleAppointments));
    logResult("flagHighNoShowLocations", flagHighNoShowLocations(sampleAppointments, 20));
  }

  if (action === "cme") {
    const asOfDate = (document.getElementById("asOfDate") as HTMLInputElement | null)?.value ?? "2026-09-08";
    logResult("generateCMEReport", generateCMEReport(sampleClinicians, asOfDate));
    logResult("getCliniciansAtRisk", getCliniciansAtRisk(sampleClinicians, asOfDate));
    logResult("getCliniciansWithExpiringLicences", getCliniciansWithExpiringLicences(sampleClinicians, asOfDate, 90));
  }

  if (action === "validate") {
    const knownIds = sampleLocations.map((location) => location.locationId);
    const invalidClaim: Claim = {
      ...sampleClaims[1],
      claimAmount: 0,
      patientId: "INVALID",
      status: "denied",
      denialReason: "coding_error",
    };
    logResult("validateClaim valid", validateClaim(sampleClaims[0], knownIds));
    logResult("validateClaim invalid", validateClaim(invalidClaim, knownIds));
    logResult("validateClinician", validateClinician(sampleClinicians[0]));
  }

  if (action === "thresholds") {
    logResult("isDenialRateAboveThreshold", isDenialRateAboveThreshold(12, 8));
    logResult("isNoShowRateAboveThreshold", isNoShowRateAboveThreshold(25, 20));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setExampleValues();

  const buttons = document.querySelectorAll<HTMLButtonElement>("button[data-action]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action ?? "";
      runAction(action);
    });
  });
});
