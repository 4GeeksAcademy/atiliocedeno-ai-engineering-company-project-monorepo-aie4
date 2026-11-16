"""Supplier directory read endpoint."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from app.db.tinydb import get_db, get_db_lock
from app.models.supplier import Supplier, SupplierCreate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("", response_model=Supplier, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> Supplier:
    """Create a supplier with server-generated persistence metadata."""
    data = payload.model_dump(mode="json", exclude_unset=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    with get_db_lock():
        document_id = get_db().table("suppliers").insert(data)

    return Supplier.model_validate({**data, "id": document_id})


@router.get("", response_model=list[Supplier])
def list_suppliers(
    country: Literal["USA", "UK"] | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[Supplier]:
    """Return all suppliers, optionally filtered by country and category."""
    with get_db_lock():
        documents = get_db().table("suppliers").all()

    suppliers = [
        Supplier.model_validate({**document, "id": document.doc_id})
        for document in documents
    ]
    if country is not None:
        suppliers = [supplier for supplier in suppliers if supplier.country == country]
    if category is not None:
        suppliers = [supplier for supplier in suppliers if category in supplier.categories]
    return suppliers


@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: int) -> Supplier:
    """Return a supplier by its TinyDB document ID, including suspended records."""
    with get_db_lock():
        document = get_db().table("suppliers").get(doc_id=supplier_id)

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    return Supplier.model_validate({**document, "id": document.doc_id})
