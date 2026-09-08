(function (global) {
  const VALID_CLINICIAN_ROLES = [
    "physician",
    "nurse_practitioner",
    "nurse",
    "medical_assistant",
  ];

  function validateClaim(claim, knownLocationIds) {
    const errors = [];

    if (claim.claimAmount <= 0) errors.push("claimAmount must be greater than 0.");

    const submissionDate = new Date(`${claim.submissionDate}T00:00:00`);
    if (!Number.isNaN(submissionDate.getTime()) && submissionDate > new Date()) {
      errors.push("submissionDate cannot be in the future.");
    }

    if (!knownLocationIds.includes(claim.locationId)) {
      errors.push("locationId must exist in knownLocationIds.");
    }

    if (claim.status === "denied" && (!claim.denialReason || claim.denialReason.trim() === "")) {
      errors.push("denialReason is required when status is denied.");
    }

    const patientIdPattern = /^HC-[A-Za-z0-9]{6}$/;
    if (!patientIdPattern.test(claim.patientId)) {
      errors.push("patientId must match HC- followed by 6 alphanumeric characters.");
    }

    return { valid: errors.length === 0, errors };
  }

  function validateClinician(clinician) {
    const errors = [];

    if (clinician.cmeHoursRequired < 0) {
      errors.push("cmeHoursRequired must be greater than or equal to 0.");
    }

    if (clinician.cmeHoursLogged < 0) {
      errors.push("cmeHoursLogged must be greater than or equal to 0.");
    }

    const expiryDate = new Date(`${clinician.licenceExpiryDate}T00:00:00`);
    if (Number.isNaN(expiryDate.getTime())) {
      errors.push("licenceExpiryDate must be a valid date.");
    }

    if (!Number.isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
      errors.push("licenceExpiryDate has passed and the licence is expired.");
    }

    if (!VALID_CLINICIAN_ROLES.includes(clinician.role)) {
      errors.push("role must be one of the allowed clinician roles.");
    }

    return { valid: errors.length === 0, errors };
  }

  function isDenialRateAboveThreshold(rate, threshold = 8) {
    return rate > threshold;
  }

  function isNoShowRateAboveThreshold(rate, threshold = 20) {
    return rate > threshold;
  }

  global.HealthCoreValidations = {
    validateClaim,
    validateClinician,
    isDenialRateAboveThreshold,
    isNoShowRateAboveThreshold,
  };
})(window);
