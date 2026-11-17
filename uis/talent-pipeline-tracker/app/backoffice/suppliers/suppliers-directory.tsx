"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../components/language-context";
import "../backoffice.css";
import "./suppliers.css";

type Supplier = {
  id: number;
  name: string;
  country: "USA" | "UK";
  categories: string[];
  monthly_rate: number;
  currency: "USD" | "GBP";
  compliance_agreement: "BAA" | "DPA" | "both" | null;
  status: "active" | "suspended";
  updated_at: string;
};

type DirectoryState = "loading" | "ready" | "error";
type SupplierFormValues = {
  name: string;
  country: "" | "USA" | "UK";
  categories: string[];
  monthly_rate: string;
  status: "active" | "suspended";
  compliance_agreement: "" | "BAA" | "DPA" | "both";
  contract_renewal_date: string;
  contact_email: string;
  notes: string;
};
type SupplierFormField = keyof SupplierFormValues;
type FormMessage = { field?: SupplierFormField; text: string };

const EMPTY_FORM: SupplierFormValues = {
  name: "",
  country: "",
  categories: [],
  monthly_rate: "",
  status: "active",
  compliance_agreement: "",
  contract_renewal_date: "",
  contact_email: "",
  notes: "",
};

const CATEGORIES = [
  "medical_supplies",
  "laboratory_services",
  "pharmaceutical",
  "clinical_software",
  "it_infrastructure",
  "hr_and_payroll_software",
  "cleaning_and_facilities",
  "patient_communication",
  "billing_and_coding_software",
  "training_platforms",
] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], { en: string; es: string }> = {
  medical_supplies: { en: "Medical supplies", es: "Suministros médicos" },
  laboratory_services: { en: "Laboratory services", es: "Servicios de laboratorio" },
  pharmaceutical: { en: "Pharmaceutical", es: "Farmacéutica" },
  clinical_software: { en: "Clinical software", es: "Software clínico" },
  it_infrastructure: { en: "IT infrastructure", es: "Infraestructura de TI" },
  hr_and_payroll_software: { en: "HR & payroll software", es: "Software de RR. HH. y nómina" },
  cleaning_and_facilities: { en: "Cleaning & facilities", es: "Limpieza e instalaciones" },
  patient_communication: { en: "Patient communication", es: "Comunicación con pacientes" },
  billing_and_coding_software: { en: "Billing & coding software", es: "Software de facturación y codificación" },
  training_platforms: { en: "Training platforms", es: "Plataformas de formación" },
};

export default function SuppliersDirectory() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [state, setState] = useState<DirectoryState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState("");
  const [rateError, setRateError] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const savingRateRef = useRef(false);
  const [savingStatusIds, setSavingStatusIds] = useState<Set<number>>(() => new Set());
  const savingStatusIdsRef = useRef<Set<number>>(new Set());
  const [statusErrors, setStatusErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    setToken(window.localStorage.getItem("healthcore_access_token") ?? "");
    setTokenReady(true);
  }, []);

  const loadSuppliers = useCallback(async (signal: AbortSignal) => {
    if (!tokenReady) return;
    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      setState("error");
      window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
      return;
    }

    setState("loading");
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    const query = params.size ? `?${params.toString()}` : "";

    try {
      const response = await fetch(`/api/healthcore/suppliers${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal,
      });
      if (response.status === 401 || response.status === 403) {
        setState("error");
        window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
        return;
      }
      if (!response.ok) throw new Error(`Supplier request failed (${response.status})`);
      const data = await response.json() as Supplier[];
      if (!Array.isArray(data)) throw new Error("Unexpected supplier response");
      setSuppliers(data);
      setState("ready");
    } catch {
      if (signal.aborted) return;
      setSuppliers([]);
      setState("error");
    }
  }, [category, country, token, tokenReady]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSuppliers(controller.signal);
    return () => controller.abort();
  }, [loadSuppliers, reloadKey]);

  const categoryName = useMemo(() => (value: string) => {
    const label = CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS];
    return label?.[language] ?? value;
  }, [language]);

  function clearFilters() {
    setCountry("");
    setCategory("");
    setSupplierName("");
  }

  function updateForm<K extends SupplierFormField>(field: K, value: SupplierFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setFormSuccess("");
  }

  function cancelSupplierCreate() {
    if (submittingRef.current) return;
    setIsCreateFormOpen(false);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormSuccess("");
  }

  function toggleFormCategory(value: string) {
    const categories = form.categories.includes(value)
      ? form.categories.filter((categoryValue) => categoryValue !== value)
      : [...form.categories, value];
    updateForm("categories", categories);
  }

  function formFieldLabel(field: SupplierFormField, english: boolean): string {
    const labels: Record<SupplierFormField, { en: string; es: string }> = {
      name: { en: "name", es: "nombre" },
      country: { en: "country", es: "país" },
      categories: { en: "categories", es: "categorías" },
      monthly_rate: { en: "monthly rate", es: "tarifa mensual" },
      status: { en: "status", es: "estado" },
      compliance_agreement: { en: "compliance agreement", es: "acuerdo de cumplimiento" },
      contract_renewal_date: { en: "contract renewal date", es: "fecha de renovación" },
      contact_email: { en: "contact email", es: "correo de contacto" },
      notes: { en: "notes", es: "notas" },
    };
    return labels[field][english ? "en" : "es"];
  }

  function validateForm(): FormMessage | null {
    if (!form.name.trim()) return { field: "name", text: isEn ? "Enter a supplier name." : "Introduce el nombre del proveedor." };
    if (!form.country) return { field: "country", text: isEn ? "Select a country." : "Selecciona un país." };
    if (form.categories.length === 0) return { field: "categories", text: isEn ? "Select at least one category." : "Selecciona al menos una categoría." };
    const rate = Number(form.monthly_rate);
    if (!form.monthly_rate.trim() || !Number.isFinite(rate) || rate <= 0) {
      return { field: "monthly_rate", text: isEn ? "Enter a monthly rate greater than zero." : "Introduce una tarifa mensual mayor que cero." };
    }
    if (form.contact_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      return { field: "contact_email", text: isEn ? "Enter a valid contact email." : "Introduce un correo de contacto válido." };
    }
    return null;
  }

  async function submitSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      setFormSuccess("");
      return;
    }

    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      country: form.country,
      categories: form.categories,
      monthly_rate: Number(form.monthly_rate),
      currency: form.country === "USA" ? "USD" : "GBP",
      status: form.status,
    };
    if (form.compliance_agreement) payload.compliance_agreement = form.compliance_agreement;
    if (form.contract_renewal_date.trim()) payload.contract_renewal_date = form.contract_renewal_date;
    if (form.contact_email.trim()) payload.contact_email = form.contact_email.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setFormSuccess("");
    try {
      const response = await fetch("/api/healthcore/suppliers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
        return;
      }
      if (response.status === 422) {
        const result = await response.json().catch(() => ({})) as { detail?: unknown };
        const errors = Array.isArray(result.detail) ? result.detail as Array<{ loc?: unknown }> : [];
        const field = errors
          .map((item) => Array.isArray(item.loc) ? item.loc.find((part) => typeof part === "string" && part !== "body") : undefined)
          .find((candidate): candidate is SupplierFormField => typeof candidate === "string" && candidate in EMPTY_FORM);
        const fieldLabel = field ? formFieldLabel(field, isEn) : "";
        setFormError({
          field,
          text: fieldLabel
            ? (isEn ? `The server rejected the ${fieldLabel} field. Check its value and try again.` : `El servidor rechazó el campo ${fieldLabel}. Revisa su valor e inténtalo de nuevo.`)
            : (isEn ? "The server rejected the supplier details. Review the form and try again." : "El servidor rechazó los datos del proveedor. Revisa el formulario e inténtalo de nuevo."),
        });
        return;
      }
      if (response.status !== 201 || !response.ok) {
        setFormError({ text: isEn ? "The supplier could not be saved. Try again." : "No se pudo guardar el proveedor. Inténtalo de nuevo." });
        return;
      }

      setFormSuccess(isEn ? `${form.name.trim()} was added successfully.` : `${form.name.trim()} se añadió correctamente.`);
      setForm(EMPTY_FORM);
      setIsCreateFormOpen(false);
      setReloadKey((value) => value + 1);
    } catch {
      setFormError({ text: isEn ? "Unable to connect to HealthCore. Check your connection and try again." : "No se pudo conectar con HealthCore. Comprueba la conexión e inténtalo de nuevo." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function beginRateEdit(supplier: Supplier) {
    setEditingRateId(supplier.id);
    setRateDraft(String(supplier.monthly_rate));
    setRateError("");
  }

  function cancelRateEdit() {
    if (savingRateRef.current) return;
    setEditingRateId(null);
    setRateDraft("");
    setRateError("");
  }

  async function saveRate(supplier: Supplier) {
    if (savingRateRef.current) return;
    const rate = Number(rateDraft);
    if (!rateDraft.trim() || !Number.isFinite(rate) || rate <= 0) {
      setRateError(isEn ? "Enter a finite monthly rate greater than zero." : "Introduce una tarifa mensual finita mayor que cero.");
      return;
    }

    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
      return;
    }

    savingRateRef.current = true;
    setSavingRate(true);
    setRateError("");
    try {
      const response = await fetch(`/api/healthcore/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monthly_rate: rate }),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
        return;
      }
      if (response.status === 422) {
        setRateError(isEn ? "The server rejected this monthly rate. Correct it and try again." : "El servidor rechazó esta tarifa mensual. Corrígela e inténtalo de nuevo.");
        return;
      }
      if (response.status !== 200 || !response.ok) {
        setRateError(isEn ? "The monthly rate could not be updated. Try again." : "No se pudo actualizar la tarifa mensual. Inténtalo de nuevo.");
        return;
      }
      const updated = await response.json() as Supplier;
      if (updated.id !== supplier.id || !Number.isFinite(updated.monthly_rate) || updated.monthly_rate <= 0) {
        setRateError(isEn ? "The server returned an unexpected supplier record." : "El servidor devolvió un registro de proveedor inesperado.");
        return;
      }
      setSuppliers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingRateId(null);
      setRateDraft("");
    } catch {
      setRateError(isEn ? "Unable to connect to HealthCore. Check your connection and try again." : "No se pudo conectar con HealthCore. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      savingRateRef.current = false;
      setSavingRate(false);
    }
  }

  async function toggleSupplierStatus(supplier: Supplier) {
    if (savingStatusIdsRef.current.has(supplier.id)) return;

    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
      return;
    }

    const nextStatus: Supplier["status"] = supplier.status === "active" ? "suspended" : "active";
    savingStatusIdsRef.current = new Set(savingStatusIdsRef.current).add(supplier.id);
    setSavingStatusIds(new Set(savingStatusIdsRef.current));
    setStatusErrors((current) => ({ ...current, [supplier.id]: "" }));
    try {
      const response = await fetch(`/api/healthcore/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login?next=%2Fbackoffice%2Fsuppliers");
        return;
      }
      if (response.status !== 200 || !response.ok) {
        setStatusErrors((current) => ({
          ...current,
          [supplier.id]: isEn
            ? "The supplier status could not be updated. Try again."
            : "No se pudo actualizar el estado del proveedor. Inténtalo de nuevo.",
        }));
        return;
      }

      const updated = await response.json() as Supplier;
      if (updated.id !== supplier.id || updated.status !== nextStatus) {
        setStatusErrors((current) => ({
          ...current,
          [supplier.id]: isEn
            ? "The server returned an unexpected supplier record."
            : "El servidor devolvió un registro de proveedor inesperado.",
        }));
        return;
      }
      setSuppliers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      setStatusErrors((current) => ({
        ...current,
        [supplier.id]: isEn
          ? "Unable to connect to HealthCore. Check your connection and try again."
          : "No se pudo conectar con HealthCore. Comprueba la conexión e inténtalo de nuevo.",
      }));
    } finally {
      const nextSavingIds = new Set(savingStatusIdsRef.current);
      nextSavingIds.delete(supplier.id);
      savingStatusIdsRef.current = nextSavingIds;
      setSavingStatusIds(nextSavingIds);
    }
  }

  const visibleSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLocaleLowerCase().includes(supplierName.trim().toLocaleLowerCase()),
  );

  return (
    <div className="backoffice-shell supplier-shell">
      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">HealthCore Digital</span><span className="breadcrumb"> / {isEn ? "Supplier directory" : "Directorio de proveedores"}</span></div>
          <div className="topbar-actions"><span className="secure-label">◈ {isEn ? "Secure internal view" : "Vista interna segura"}</span><span className="avatar">HC</span></div>
        </header>
        <div className="content-wrap supplier-content">
          <section className="welcome supplier-welcome" aria-labelledby="supplier-title">
            <div><p className="eyebrow accent">{isEn ? "Shared vendor records" : "Registros compartidos de proveedores"}</p><h1 id="supplier-title">{isEn ? "Supplier directory" : "Directorio de proveedores"}</h1><p className="intro">{isEn ? "Review suppliers supporting HealthCore operations across the USA and UK." : "Consulta los proveedores que apoyan las operaciones de HealthCore en EE. UU. y Reino Unido."}</p></div>
            <div className="welcome-badge"><span className="pulse" /><span>{isEn ? "Audit-ready" : "Listo para auditoría"}<br /><strong>{isEn ? "Shared directory" : "Directorio compartido"}</strong></span></div>
          </section>

          <section className="panel supplier-panel" aria-labelledby="supplier-list-title">
            <div className="panel-heading supplier-list-heading"><div><p className="eyebrow">{isEn ? "Procurement & compliance" : "Compras y cumplimiento"}</p><h2 id="supplier-list-title">{isEn ? "Suppliers" : "Proveedores"}</h2></div><div className="supplier-list-actions"><span className="panel-status">{state === "ready" ? `${visibleSuppliers.length} ${isEn ? "records" : "registros"}` : (isEn ? "Live directory" : "Directorio actualizado")}</span><button type="button" className="button-primary supplier-add-button" aria-expanded={isCreateFormOpen} aria-controls={isCreateFormOpen ? "supplier-create-panel" : undefined} onClick={() => { setFormError(null); setFormSuccess(""); setIsCreateFormOpen(true); }}>{isEn ? "Add supplier" : "Añadir proveedor"}</button></div></div>
            {formError && !isCreateFormOpen && <p className="supplier-form-error" role="alert">{formError.text}</p>}
            {formSuccess && <p className="supplier-form-success supplier-list-success" role="status" aria-live="polite">{formSuccess}</p>}
            <div className="supplier-filters" aria-label={isEn ? "Supplier filters" : "Filtros de proveedores"}>
              <label>{isEn ? "Country" : "País"}
                <select value={country} onChange={(event) => setCountry(event.currentTarget.value)}>
                  <option value="">{isEn ? "All countries" : "Todos los países"}</option>
                  <option value="USA">{isEn ? "United States" : "Estados Unidos"}</option>
                  <option value="UK">{isEn ? "United Kingdom" : "Reino Unido"}</option>
                </select>
              </label>
              <label>{isEn ? "Category" : "Categoría"}
                <select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>
                  <option value="">{isEn ? "All categories" : "Todas las categorías"}</option>
                  {CATEGORIES.map((item) => <option key={item} value={item}>{categoryName(item)}</option>)}
                </select>
              </label>
              <label>{isEn ? "Supplier name" : "Nombre del proveedor"}
                <input type="search" list="supplier-name-options" value={supplierName} onChange={(event) => setSupplierName(event.currentTarget.value)} placeholder={isEn ? "Search suppliers" : "Buscar proveedores"} />
              </label>
              <datalist id="supplier-name-options">{Array.from(new Set(suppliers.map((supplier) => supplier.name))).map((name) => <option key={name} value={name} />)}</datalist>
              <button type="button" className="button-secondary supplier-clear" onClick={clearFilters} disabled={!country && !category && !supplierName}>{isEn ? "Clear filters" : "Limpiar filtros"}</button>
            </div>

            {state === "loading" && <p className="supplier-feedback" role="status" aria-live="polite">{isEn ? "Loading suppliers…" : "Cargando proveedores…"}</p>}
            {state === "error" && <div className="supplier-feedback supplier-error" role="alert"><p>{isEn ? "Unable to load suppliers. Check the HealthCore API connection and try again." : "No se pudieron cargar los proveedores. Comprueba la conexión con la API de HealthCore e inténtalo de nuevo."}</p><button type="button" className="button-secondary" onClick={() => setReloadKey((value) => value + 1)}>{isEn ? "Retry" : "Reintentar"}</button></div>}
            {state === "ready" && visibleSuppliers.length === 0 && <p className="supplier-feedback" role="status">{isEn ? "No suppliers match these filters." : "No hay proveedores que coincidan con estos filtros."}</p>}
            {state === "ready" && visibleSuppliers.length > 0 && <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr>
              <th scope="col">{isEn ? "Supplier" : "Proveedor"}</th>
              <th scope="col">{isEn ? "Country" : "País"}</th>
              <th scope="col">{isEn ? "Categories" : "Categorías"}</th>
              <th scope="col">{isEn ? "Monthly rate" : "Tarifa mensual"}</th>
              <th scope="col">{isEn ? "Rate actions" : "Acciones de tarifa"}</th>
              <th scope="col">{isEn ? "Compliance agreement" : "Acuerdo de cumplimiento"}</th>
              <th scope="col">{isEn ? "Status" : "Estado"}</th>
              <th scope="col">{isEn ? "Status actions" : "Acciones de estado"}</th>
            </tr></thead><tbody>{visibleSuppliers.map((supplier) => <tr key={supplier.id}>
              <th scope="row" className="supplier-name">{supplier.name}</th>
              <td>{supplier.country === "UK" ? (isEn ? "United Kingdom" : "Reino Unido") : (isEn ? "United States" : "Estados Unidos")}</td>
              <td><div className="supplier-tags">{supplier.categories.map((item) => <span className="supplier-category" key={item}>{categoryName(item)}</span>)}</div></td>
              <td className="supplier-rate" data-testid={`supplier-rate-${supplier.id}`}>{new Intl.NumberFormat(isEn ? "en-GB" : "es-ES", { style: "currency", currency: supplier.currency, maximumFractionDigits: 2 }).format(supplier.monthly_rate)}</td>
              <td className="supplier-rate-actions">
                {editingRateId === supplier.id ? <div className="supplier-rate-editor">
                  <label htmlFor={`supplier-rate-edit-${supplier.id}`}>{isEn ? "New monthly rate" : "Nueva tarifa mensual"} ({supplier.currency})</label>
                  <input id={`supplier-rate-edit-${supplier.id}`} data-testid={`supplier-rate-input-${supplier.id}`} type="number" min="0" step="0.01" inputMode="decimal" value={rateDraft} onChange={(event) => { setRateDraft(event.currentTarget.value); setRateError(""); }} aria-invalid={Boolean(rateError)} disabled={savingRate} />
                  {rateError && <p className="supplier-form-error" role="alert">{rateError}</p>}
                  <div className="supplier-rate-buttons"><button type="button" className="button-primary" onClick={() => void saveRate(supplier)} disabled={savingRate}>{savingRate ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Save" : "Guardar")}</button><button type="button" className="button-secondary" onClick={cancelRateEdit} disabled={savingRate}>{isEn ? "Cancel" : "Cancelar"}</button></div>
                </div> : <button type="button" className="button-secondary supplier-edit-rate" onClick={() => beginRateEdit(supplier)}>{isEn ? "Edit rate" : "Editar tarifa"}</button>}
              </td>
              <td>{supplier.compliance_agreement ? <span className="agreement-tag">{supplier.compliance_agreement === "both" ? "BAA + DPA" : supplier.compliance_agreement}</span> : <span className="supplier-muted">{isEn ? "Not specified" : "No especificado"}</span>}</td>
              <td><span data-testid={`supplier-status-${supplier.id}`} className={`supplier-status ${supplier.status}`}><span className="status-mark" aria-hidden="true">{supplier.status === "active" ? "✓" : "!"}</span>{supplier.status === "active" ? (isEn ? "Active" : "Activo") : (isEn ? "Suspended" : "Suspendido")}</span></td>
              <td className="supplier-status-actions">
                {statusErrors[supplier.id] && <p className="supplier-form-error" role="alert">{statusErrors[supplier.id]}</p>}
                <button type="button" className="button-secondary supplier-toggle-status" data-testid={`supplier-status-action-${supplier.id}`} onClick={() => void toggleSupplierStatus(supplier)} disabled={savingStatusIds.has(supplier.id)}>
                  {savingStatusIds.has(supplier.id)
                    ? (isEn ? "Updating…" : "Actualizando…")
                    : supplier.status === "active"
                      ? (isEn ? "Suspend" : "Suspender")
                      : (isEn ? "Activate" : "Activar")}
                </button>
              </td>
            </tr>)}</tbody></table></div>}
          </section>

          {isCreateFormOpen && <section className="panel supplier-panel supplier-create-panel" id="supplier-create-panel" aria-labelledby="supplier-create-title">
            <div className="panel-heading"><div><p className="eyebrow">{isEn ? "Procurement & compliance" : "Compras y cumplimiento"}</p><h2 id="supplier-create-title">{isEn ? "Add a supplier" : "Añadir proveedor"}</h2></div><span className="panel-status">{isEn ? "New record" : "Nuevo registro"}</span></div>
            <form className="supplier-create-form" onSubmit={submitSupplier} noValidate>
              <div className="supplier-form-grid">
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-name">{isEn ? "Supplier name" : "Nombre del proveedor"}<span className="supplier-required">*</span></label>
                  <input id="supplier-create-name" name="name" value={form.name} onChange={(event) => updateForm("name", event.currentTarget.value)} autoComplete="organization" aria-required="true" aria-invalid={formError?.field === "name"} />
                </div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-country">{isEn ? "Country" : "País"}<span className="supplier-required">*</span></label>
                  <select id="supplier-create-country" name="country" value={form.country} onChange={(event) => updateForm("country", event.currentTarget.value as SupplierFormValues["country"])} aria-required="true" aria-invalid={formError?.field === "country"}>
                    <option value="">{isEn ? "Select a country" : "Selecciona un país"}</option>
                    <option value="USA">{isEn ? "United States" : "Estados Unidos"}</option>
                    <option value="UK">{isEn ? "United Kingdom" : "Reino Unido"}</option>
                  </select>
                </div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-currency">{isEn ? "Currency" : "Moneda"}</label><output id="supplier-create-currency" className="supplier-currency" aria-live="polite">{form.country === "USA" ? "USD" : form.country === "UK" ? "GBP" : (isEn ? "Set automatically when you choose a country" : "Se completa al elegir el país")}</output></div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-rate">{isEn ? "Monthly rate" : "Tarifa mensual"}<span className="supplier-required">*</span></label>
                  <input id="supplier-create-rate" name="monthly_rate" type="number" min="0" step="0.01" inputMode="decimal" value={form.monthly_rate} onChange={(event) => updateForm("monthly_rate", event.currentTarget.value)} aria-required="true" aria-invalid={formError?.field === "monthly_rate"} />
                </div>
                <fieldset className="supplier-form-field supplier-category-fieldset" aria-invalid={formError?.field === "categories"}>
                  <legend>{isEn ? "Categories" : "Categorías"}<span className="supplier-required">*</span><small>{isEn ? "Choose one or more" : "Elige una o más"}</small></legend>
                  <div className="supplier-category-options">{CATEGORIES.map((item) => <label className="supplier-checkbox" key={item}><input type="checkbox" name="categories" value={item} checked={form.categories.includes(item)} onChange={() => toggleFormCategory(item)} /><span>{categoryName(item)}</span></label>)}</div>
                </fieldset>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-status">{isEn ? "Status" : "Estado"}<span className="supplier-required">*</span></label>
                  <select id="supplier-create-status" name="status" value={form.status} onChange={(event) => updateForm("status", event.currentTarget.value as SupplierFormValues["status"])}>
                    <option value="active">{isEn ? "Active" : "Activo"}</option>
                    <option value="suspended">{isEn ? "Suspended" : "Suspendido"}</option>
                  </select>
                </div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-agreement">{isEn ? "Compliance agreement (optional)" : "Acuerdo de cumplimiento (opcional)"}</label>
                  <select id="supplier-create-agreement" name="compliance_agreement" value={form.compliance_agreement} onChange={(event) => updateForm("compliance_agreement", event.currentTarget.value as SupplierFormValues["compliance_agreement"])}>
                    <option value="">{isEn ? "Not specified" : "No especificado"}</option><option value="BAA">BAA</option><option value="DPA">DPA</option><option value="both">BAA + DPA</option>
                  </select>
                </div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-renewal">{isEn ? "Contract renewal date (optional)" : "Fecha de renovación del contrato (opcional)"}</label>
                  <input id="supplier-create-renewal" name="contract_renewal_date" type="date" value={form.contract_renewal_date} onChange={(event) => updateForm("contract_renewal_date", event.currentTarget.value)} aria-invalid={formError?.field === "contract_renewal_date"} />
                </div>
                <div className="supplier-form-field"><label className="supplier-field-label" htmlFor="supplier-create-email">{isEn ? "Contact email (optional)" : "Correo de contacto (opcional)"}</label>
                  <input id="supplier-create-email" name="contact_email" type="email" autoComplete="email" value={form.contact_email} onChange={(event) => updateForm("contact_email", event.currentTarget.value)} aria-invalid={formError?.field === "contact_email"} />
                </div>
                <div className="supplier-form-field supplier-notes-field"><label className="supplier-field-label" htmlFor="supplier-create-notes">{isEn ? "Internal notes (optional)" : "Notas internas (opcional)"}</label>
                  <textarea id="supplier-create-notes" name="notes" rows={3} value={form.notes} onChange={(event) => updateForm("notes", event.currentTarget.value)} />
                </div>
              </div>
              {formError && <p className="supplier-form-error" role="alert" aria-live="assertive">{formError.text}</p>}
              <div className="supplier-form-actions"><span>{isEn ? "* Required fields" : "* Campos obligatorios"}</span><div><button className="button-secondary supplier-cancel-create" type="button" onClick={cancelSupplierCreate} disabled={submitting}>{isEn ? "Cancel" : "Cancelar"}</button><button className="button-primary" type="submit" disabled={submitting}>{submitting ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Add supplier" : "Añadir proveedor")}</button></div></div>
            </form>
          </section>
          }
        </div>
        <footer>{isEn ? "HealthCore Digital · Internal operations workspace" : "HealthCore Digital · Espacio interno de operaciones"}<span>{isEn ? "Built for secure, human-centered healthcare operations" : "Diseñado para operaciones sanitarias seguras y centradas en las personas"}</span></footer>
      </main>
    </div>
  );
}
