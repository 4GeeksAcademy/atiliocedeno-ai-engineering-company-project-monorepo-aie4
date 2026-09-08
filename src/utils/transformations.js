(function (global) {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function parseCalendarDate(value) {
    return new Date(`${value}T00:00:00`);
  }

  function diffInDays(fromDate, toDate) {
    return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_IN_MS);
  }

  function addYears(date, yearsToAdd) {
    const nextDate = new Date(date.getTime());
    nextDate.setFullYear(nextDate.getFullYear() + yearsToAdd);
    return nextDate;
  }

  function getStatus(clinician, percentComplete, percentOfCycleElapsed, isCycleActive) {
    if (clinician.cmeHoursLogged >= clinician.cmeHoursRequired) return "complete";
    if (!isCycleActive && clinician.cmeHoursLogged < clinician.cmeHoursRequired) return "overdue";
    if (isCycleActive && percentComplete < percentOfCycleElapsed - 15) return "at_risk";
    return "on_track";
  }

  function calculateDenialRate(claims) {
    if (claims.length === 0) throw new Error("Claims array cannot be empty when calculating denial rate.");
    const denied = claims.filter((claim) => claim.status === "denied").length;
    const rate = (denied / claims.length) * 100;
    return Number.isFinite(rate) ? roundTo(rate, 2) : 0;
  }

  function denialRateByPayer(claims) {
    const grouped = claims.reduce((result, claim) => {
      if (!result[claim.payerName]) result[claim.payerName] = [];
      result[claim.payerName].push(claim);
      return result;
    }, {});

    return Object.entries(grouped).reduce((result, [payerName, payerClaims]) => {
      const denied = payerClaims.filter((claim) => claim.status === "denied").length;
      result[payerName] = roundTo((denied / payerClaims.length) * 100, 2);
      return result;
    }, {});
  }

  function denialRateByLocation(claims) {
    const grouped = claims.reduce((result, claim) => {
      if (!result[claim.locationId]) result[claim.locationId] = [];
      result[claim.locationId].push(claim);
      return result;
    }, {});

    return Object.entries(grouped).reduce((result, [locationId, locationClaims]) => {
      const denied = locationClaims.filter((claim) => claim.status === "denied").length;
      result[locationId] = roundTo((denied / locationClaims.length) * 100, 2);
      return result;
    }, {});
  }

  function flagHighDenialPayers(claims, threshold = 8) {
    return Object.entries(denialRateByPayer(claims))
      .filter(([, rate]) => rate > threshold)
      .map(([payerName]) => payerName);
  }

  function calculateNoShowCost(appointments, location, weekEndingDate) {
    const endDate = parseCalendarDate(weekEndingDate);
    const startDate = new Date(endDate.getTime() - 6 * DAY_IN_MS);

    const noShows = appointments.filter((appointment) => {
      if (appointment.locationId !== location.locationId || appointment.status !== "no_show") return false;
      const appointmentDate = parseCalendarDate(appointment.scheduledDate);
      return appointmentDate >= startDate && appointmentDate <= endDate;
    });

    if (noShows.length === 0) return 0;

    const totalCost = noShows.reduce((sum, appointment) => {
      const fee = location.averageConsultationFee[appointment.serviceType] ?? 0;
      return sum + fee;
    }, 0);

    return roundTo(totalCost, 2);
  }

  function noShowRateByLocation(appointments) {
    const totals = appointments.reduce((result, appointment) => {
      if (!result[appointment.locationId]) result[appointment.locationId] = { total: 0, noShows: 0 };
      result[appointment.locationId].total += 1;
      if (appointment.status === "no_show") result[appointment.locationId].noShows += 1;
      return result;
    }, {});

    return Object.entries(totals).reduce((result, [locationId, metrics]) => {
      if (metrics.total === 0) return result;
      result[locationId] = roundTo((metrics.noShows / metrics.total) * 100, 2);
      return result;
    }, {});
  }

  function flagHighNoShowLocations(appointments, threshold = 20) {
    return Object.entries(noShowRateByLocation(appointments))
      .filter(([, rate]) => rate > threshold)
      .map(([locationId]) => locationId);
  }

  function generateCMEReport(clinicians, asOfDate) {
    const asOf = parseCalendarDate(asOfDate);

    return clinicians.map((clinician) => {
      const hoursRequired = clinician.cmeHoursRequired;
      const hoursLogged = clinician.cmeHoursLogged;
      const hoursRemaining = Math.max(0, hoursRequired - hoursLogged);
      const percentComplete = hoursRequired === 0 ? 100 : (hoursLogged / hoursRequired) * 100;
      const cycleStart = parseCalendarDate(clinician.cmeYearStartDate);
      const cycleEnd = addYears(cycleStart, 1);
      const cycleLengthDays = Math.max(1, diffInDays(cycleStart, cycleEnd));
      const daysElapsedInCycle = Math.max(0, diffInDays(cycleStart, asOf));
      const percentOfCycleElapsed = (daysElapsedInCycle / cycleLengthDays) * 100;
      const isCycleActive = asOf <= cycleEnd;
      const daysRemainingInCycle = isCycleActive ? Math.max(0, diffInDays(asOf, cycleEnd)) : 0;
      const complianceStatus = getStatus(clinician, percentComplete, percentOfCycleElapsed, isCycleActive);
      const licenceExpiry = parseCalendarDate(clinician.licenceExpiryDate);
      const licenceDaysRemaining = diffInDays(asOf, licenceExpiry);

      return {
        clinicianId: clinician.clinicianId,
        fullName: `${clinician.firstName} ${clinician.lastName}`,
        role: clinician.role,
        locationId: clinician.locationId,
        hoursRequired,
        hoursLogged,
        hoursRemaining,
        percentComplete: roundTo(percentComplete, 1),
        daysRemainingInCycle,
        complianceStatus,
        licenceExpiryDate: clinician.licenceExpiryDate,
        licenceDaysRemaining,
      };
    });
  }

  function getCliniciansAtRisk(clinicians, asOfDate) {
    return clinicians.filter((clinician) => {
      const report = generateCMEReport([clinician], asOfDate)[0];
      return report.complianceStatus === "at_risk" || report.complianceStatus === "overdue";
    });
  }

  function getCliniciansWithExpiringLicences(clinicians, asOfDate, daysThreshold) {
    const asOf = parseCalendarDate(asOfDate);

    return clinicians.filter((clinician) => {
      const expiry = parseCalendarDate(clinician.licenceExpiryDate);
      const remainingDays = diffInDays(asOf, expiry);
      return remainingDays >= 0 && remainingDays <= daysThreshold;
    });
  }

  global.HealthCoreTransformations = {
    calculateDenialRate,
    denialRateByPayer,
    denialRateByLocation,
    flagHighDenialPayers,
    calculateNoShowCost,
    noShowRateByLocation,
    flagHighNoShowLocations,
    generateCMEReport,
    getCliniciansAtRisk,
    getCliniciansWithExpiringLicences,
  };
})(window);
