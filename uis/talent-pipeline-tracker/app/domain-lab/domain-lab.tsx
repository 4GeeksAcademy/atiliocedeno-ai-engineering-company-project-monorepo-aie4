"use client";

import { useState } from "react";
import {
  filterAppointmentsByStatus,
  filterClaims,
  groupClaimsBy,
  sortAppointmentsByDate,
  sortClaimsById,
} from "../../../../src/utils/collections";
import {
  binarySearchClaimById as binarySearchClaimByIdFromSearch,
  findClaimById,
  findClinicianById,
} from "../../../../src/utils/search";
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
} from "../../../../src/utils/transformations";
import {
  isDenialRateAboveThreshold,
  isNoShowRateAboveThreshold,
  validateClaim,
  validateClinician,
} from "../../../../src/utils/validations";
import type { Claim } from "../../../../src/types/models";
import {
  sampleAppointments,
  sampleClaims,
  sampleClinicians,
  sampleLocations,
} from "../../../../src/data dummy/dummyData";
import "./domain-lab.css";

const ACTIONS = [
  ["filterClaims", "Filter claims"], ["filterAppointments", "Filter appointments"],
  ["sortClaims", "Sort claims"], ["sortAppointments", "Sort appointments"],
  ["groupClaims", "Group claims"], ["search", "Search claims and clinicians"],
  ["binarySearch", "Binary search"], ["denialRate", "Denial rate"],
  ["noShow", "No-show metrics"], ["cme", "CME reports"],
  ["validate", "Validations"], ["thresholds", "Thresholds"],
] as const;

export default function DomainLab() {
  const [output, setOutput] = useState<Array<{ label: string; data: unknown }>>([]);
  const [threshold, setThreshold] = useState("8");
  const [weekEndingDate, setWeekEndingDate] = useState("2026-09-12");
  const [asOfDate, setAsOfDate] = useState("2026-09-08");

  function runAction(action: string) {
    const result: Array<{ label: string; data: unknown }> = [];
    const log = (label: string, data: unknown) => result.push({ label, data });
    if (action === "filterClaims") log("filterClaims", filterClaims(sampleClaims, { locationId: "us-fl-001", payerName: "Aetna" }));
    if (action === "filterAppointments") log("filterAppointmentsByStatus", filterAppointmentsByStatus(sampleAppointments, ["scheduled", "confirmed"]));
    if (action === "sortClaims") { log("sortClaimsById asc", sortClaimsById(sampleClaims, "asc")); log("sortClaimsById desc", sortClaimsById(sampleClaims, "desc")); }
    if (action === "sortAppointments") { log("sortAppointmentsByDate asc", sortAppointmentsByDate(sampleAppointments, "asc")); log("sortAppointmentsByDate desc", sortAppointmentsByDate(sampleAppointments, "desc")); }
    if (action === "groupClaims") log("groupClaimsBy payerName", groupClaimsBy(sampleClaims, "payerName"));
    if (action === "search") { log("findClaimById", findClaimById(sampleClaims, "CLM-000002")); log("findClinicianById", findClinicianById(sampleClinicians, "CLN-000002")); }
    if (action === "binarySearch") log("binarySearchClaimById found", binarySearchClaimByIdFromSearch(sortClaimsById(sampleClaims, "asc"), "CLM-000004"));
    if (action === "denialRate") { log("calculateDenialRate", calculateDenialRate(sampleClaims)); log("denialRateByPayer", denialRateByPayer(sampleClaims)); log("denialRateByLocation", denialRateByLocation(sampleClaims)); log("flagHighDenialPayers", flagHighDenialPayers(sampleClaims, Number(threshold))); }
    if (action === "noShow") { log("calculateNoShowCost", calculateNoShowCost(sampleAppointments, sampleLocations[0], weekEndingDate)); log("noShowRateByLocation", noShowRateByLocation(sampleAppointments)); log("flagHighNoShowLocations", flagHighNoShowLocations(sampleAppointments, 20)); }
    if (action === "cme") { log("generateCMEReport", generateCMEReport(sampleClinicians, asOfDate)); log("getCliniciansAtRisk", getCliniciansAtRisk(sampleClinicians, asOfDate)); log("getCliniciansWithExpiringLicences", getCliniciansWithExpiringLicences(sampleClinicians, asOfDate, 90)); }
    if (action === "validate") {
      const knownIds = sampleLocations.map((location) => location.locationId);
      const invalidClaim: Claim = { ...sampleClaims[1], claimAmount: 0, patientId: "INVALID", status: "denied", denialReason: "coding_error" };
      log("validateClaim valid", validateClaim(sampleClaims[0], knownIds)); log("validateClaim invalid", validateClaim(invalidClaim, knownIds)); log("validateClinician", validateClinician(sampleClinicians[0]));
    }
    if (action === "thresholds") { log("isDenialRateAboveThreshold", isDenialRateAboveThreshold(12, Number(threshold))); log("isNoShowRateAboveThreshold", isNoShowRateAboveThreshold(25, 20)); }
    setOutput(result);
  }

  return (
    <main className="domain-lab">
      <header><div><p className="lab-eyebrow">HealthCore · Domain core</p><h1>Domain test panel</h1><p>Run representative examples for the shared claims, appointments, search, transformation, and validation utilities.</p></div><a href="/dashboard">Back to dashboard</a></header>
      <section aria-label="Domain actions" className="lab-actions">{ACTIONS.map(([action, label]) => <button key={action} onClick={() => runAction(action)}>{label}</button>)}</section>
      <section className="lab-controls" aria-label="Example parameters">
        <label>Threshold<input type="number" value={threshold} onChange={(event) => setThreshold(event.currentTarget.value)} /></label>
        <label>Week ending date<input type="date" value={weekEndingDate} onChange={(event) => setWeekEndingDate(event.currentTarget.value)} /></label>
        <label>Reference date<input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.currentTarget.value)} /></label>
      </section>
      <pre aria-live="polite">{output.length ? JSON.stringify(output, null, 2) : "Choose an action to run HealthCore domain examples."}</pre>
    </main>
  );
}
