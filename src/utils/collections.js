(function (global) {
  function filterClaims(claims, filters) {
    const filterEntries = Object.entries(filters || {});

    return claims.filter((claim) =>
      filterEntries.every(([filterKey, filterValue]) => {
        if (filterValue === undefined) return true;
        return claim[filterKey] === filterValue;
      })
    );
  }

  function filterAppointmentsByStatus(appointments, status) {
    if (!status || status.length === 0) return [];
    return appointments.filter((appointment) => status.includes(appointment.status));
  }

  function sortClaimsById(claims, direction) {
    const sorted = [...claims];
    sorted.sort((left, right) => {
      const comparison = left.claimId.localeCompare(right.claimId, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return direction === "asc" ? comparison : comparison * -1;
    });
    return sorted;
  }

  function sortAppointmentsByDate(appointments, direction) {
    const sorted = [...appointments];
    sorted.sort((left, right) => {
      const leftDate = new Date(`${left.scheduledDate}T${left.scheduledTime}:00`).getTime();
      const rightDate = new Date(`${right.scheduledDate}T${right.scheduledTime}:00`).getTime();
      return direction === "asc" ? leftDate - rightDate : rightDate - leftDate;
    });
    return sorted;
  }

  function groupClaimsBy(claims, key) {
    if (!claims || claims.length === 0) return {};
    return claims.reduce((result, claim) => {
      const groupKey = String(claim[key]);
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(claim);
      return result;
    }, {});
  }

  global.HealthCoreCollections = {
    filterClaims,
    filterAppointmentsByStatus,
    sortClaimsById,
    sortAppointmentsByDate,
    groupClaimsBy,
  };
})(window);
