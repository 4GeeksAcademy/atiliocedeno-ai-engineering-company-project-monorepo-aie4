(function (global) {
  function findClaimById(claims, claimId) {
    for (const claim of claims) {
      if (claim.claimId === claimId) return claim;
    }
    return null;
  }

  function findClinicianById(clinicians, clinicianId) {
    for (const clinician of clinicians) {
      if (clinician.clinicianId === clinicianId) return clinician;
    }
    return null;
  }

  function binarySearchClaimById(sortedClaims, targetId) {
    let left = 0;
    let right = sortedClaims.length - 1;

    while (left <= right) {
      const middle = Math.floor((left + right) / 2);
      const current = sortedClaims[middle];

      if (current.claimId === targetId) return middle;
      if (current.claimId < targetId) left = middle + 1;
      else right = middle - 1;
    }

    return -1;
  }

  global.HealthCoreSearch = {
    findClaimById,
    findClinicianById,
    binarySearchClaimById,
  };
})(window);
