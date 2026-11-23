"""Idempotently seed the HealthCore supplier directory."""

from datetime import datetime, timezone
import sys

from tinydb import Query

from app.models.supplier import Supplier, SupplierCreate

SUPPLIERS_SEED: tuple[dict, ...] = (
    {
        "name": "McKesson Medical Supplies",
        "country": "USA",
        "categories": ["medical_supplies"],
        "monthly_rate": 4200.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-06-30",
        "contact_email": "accounts@mckesson.com",
        "notes": "Proveedor principal de material clínico para las 9 clínicas de USA.",
    },
    {
        "name": "NHS Supply Chain",
        "country": "UK",
        "categories": ["medical_supplies"],
        "monthly_rate": 2800.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enquiries@supplychain.nhs.uk",
    },
    {
        "name": "Quest Diagnostics",
        "country": "USA",
        "categories": ["laboratory_services"],
        "monthly_rate": 3100.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-12-15",
        "contact_email": "business@questdiagnostics.com",
        "notes": "Procesamiento de laboratorio para clínicas de Texas y Florida.",
    },
    {
        "name": "Synnovis UK",
        "country": "UK",
        "categories": ["laboratory_services"],
        "monthly_rate": 1950.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "contracts@synnovis.co.uk",
    },
    {
        "name": "Epic Systems",
        "country": "USA",
        "categories": ["clinical_software"],
        "monthly_rate": 8500.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2026-01-01",
        "contact_email": "enterprise@epic.com",
        "notes": "EHR principal para las clínicas de USA. Contrato de largo plazo.",
    },
    {
        "name": "EMIS Health",
        "country": "UK",
        "categories": ["clinical_software"],
        "monthly_rate": 3400.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contract_renewal_date": "2025-09-01",
        "contact_email": "accounts@emishealth.com",
        "notes": "EHR para las clínicas de Londres y Manchester.",
    },
    {
        "name": "Availity",
        "country": "USA",
        "categories": ["billing_and_coding_software"],
        "monthly_rate": 1200.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contact_email": "enterprise@availity.com",
        "notes": "Plataforma de verificación de elegibilidad y envío de claims.",
    },
    {
        "name": "Twilio",
        "country": "USA",
        "categories": ["patient_communication"],
        "monthly_rate": 680.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contract_renewal_date": "2025-10-31",
        "contact_email": "healthcare@twilio.com",
        "notes": "SMS y email automatizados para recordatorios de citas.",
    },
    {
        "name": "AWS Healthcare",
        "country": "USA",
        "categories": ["it_infrastructure"],
        "monthly_rate": 5600.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": "BAA",
        "contact_email": "aws-health@amazon.com",
        "notes": "Infraestructura cloud principal. BAA firmado y auditado anualmente.",
    },
    {
        "name": "Microsoft Azure UK",
        "country": "UK",
        "categories": ["it_infrastructure"],
        "monthly_rate": 2100.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "enterprise@microsoft.com",
    },
    {
        "name": "Workday",
        "country": "USA",
        "categories": ["hr_and_payroll_software"],
        "monthly_rate": 2400.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": None,
        "contract_renewal_date": "2025-08-15",
        "contact_email": "enterprise@workday.com",
        "notes": "HRIS para toda la plantilla de USA. No maneja PHI.",
    },
    {
        "name": "Sage Payroll UK",
        "country": "UK",
        "categories": ["hr_and_payroll_software"],
        "monthly_rate": 890.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "business@sage.co.uk",
    },
    {
        "name": "ServiceMaster Clean",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "monthly_rate": 3800.0,
        "currency": "USD",
        "status": "active",
        "compliance_agreement": None,
        "contact_email": "healthcare@servicemaster.com",
        "notes": "Limpieza clínica para las 9 ubicaciones de USA.",
    },
    {
        "name": "Healthstream LMS",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 1100.0,
        "currency": "USD",
        "status": "suspended",
        "compliance_agreement": "BAA",
        "contact_email": "enterprise@healthstream.com",
        "notes": "Suspendido. Diane está evaluando reemplazarlo por una solución interna.",
    },
    {
        "name": "Nuffield Health Supplies",
        "country": "UK",
        "categories": ["medical_supplies", "cleaning_and_facilities"],
        "monthly_rate": 1650.0,
        "currency": "GBP",
        "status": "active",
        "compliance_agreement": "DPA",
        "contact_email": "procurement@nuffieldhealth.com",
    },
)


def seed_suppliers() -> int:
    """Insert missing briefing suppliers and return the number inserted.

    Identity is the exact supplier name; existing records are left untouched,
    preserving any rates or other fields edited after the initial seed.
    """
    # Validate the entire source block before opening the table or writing data.
    suppliers = [SupplierCreate.model_validate(record) for record in SUPPLIERS_SEED]
    from app.db.tinydb import get_db, get_db_lock

    db = get_db()
    table = db.table("suppliers")
    query = Query()
    inserted = 0

    with get_db_lock():
        for supplier in suppliers:
            if table.contains(query.name == supplier.name):
                continue

            data = supplier.model_dump(mode="json", exclude_unset=True)
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            document_id = table.insert(data)
            # Confirm the persisted representation is accepted by the full model.
            Supplier.model_validate({**data, "id": document_id})
            inserted += 1

    return inserted


def main() -> int:
    try:
        inserted = seed_suppliers()
    except (OSError, ValueError, TypeError):
        print("Supplier seed failed: check the supplier data and the HealthCore database.", file=sys.stderr)
        return 2
    print(f"Inserted {inserted} suppliers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
