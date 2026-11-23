"""Public API errors with a stable, input-free representation."""

import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

VALIDATION_LOCATIONS = {
    "body", "query", "path", "header", "cookie",
    "email", "password", "current_password", "new_password", "token", "profile",
    "name", "phone", "address", "role", "is_active", "user_id",
    "supplier_id", "country", "categories", "category", "currency", "monthly_rate",
    "status", "compliance_agreement", "contract_renewal_date", "contact_email", "notes",
}
VALIDATION_MESSAGES = {
    "missing": "This field is required.",
    "json_invalid": "Send a valid JSON request.",
    "extra_forbidden": "Remove unexpected fields.",
    "password_too_long": "Use a password of at most 72 UTF-8 bytes.",
    "country_currency_mismatch": "Use the currency for the selected country.",
    "invalid_phone": "Enter a valid US or UK phone number.",
}


async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        code = error["type"]
        location = error["loc"]
        if code == "extra_forbidden":
            location = location[:-1]
        public_location = [
            part for part in location
            if isinstance(part, int) or part in VALIDATION_LOCATIONS
        ]
        if code == "country_currency_mismatch":
            public_location.append("currency")
        details.append({
            "loc": public_location,
            "type": code,
            "msg": VALIDATION_MESSAGES.get(code, "Enter a valid value."),
        })
    return JSONResponse(status_code=422, content={"detail": details})


async def unexpected_request_error(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        # Exception strings and tracebacks can include stored records or configuration.
        logger.error("HealthCore request failed unexpectedly")
        return JSONResponse(status_code=500, content={"detail": "Unable to complete the request."})
