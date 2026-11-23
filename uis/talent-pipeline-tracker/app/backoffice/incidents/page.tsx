"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useLanguage } from "../../components/language-context";
import "../backoffice.css";

type Report = {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  average_satisfaction: number | null;
  categories: Record<string, number>;
  statuses: Record<string, number>;
  countries: Record<string, number>;
  satisfaction_distribution: Record<string, number>;
  closed_with_valid_satisfaction: number;
  invalid_breakdown: { by_rule: Record<string, number> };
};

type Message = { text: string; error?: boolean };

type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
};

type IncidentSummaryData = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

type DirectoryState = "loading" | "ready" | "error";

function IncidentSummary({ token, refreshKey }: { token: string; refreshKey: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [summary, setSummary] = useState<IncidentSummaryData | null>(null);
  const [state, setState] = useState<DirectoryState>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [showAllBranches, setShowAllBranches] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setState("loading");
    void (async () => {
      try {
        const response = await fetch("/api/healthcore/api/incidents/summary", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
          return;
        }
        if (!response.ok) throw new Error("summary_request_failed");
        const data = await response.json() as IncidentSummaryData;
        if (typeof data.total !== "number" || !data.by_status || !data.by_category || !data.by_origin || !data.by_branch) throw new Error("invalid_summary_response");
        setSummary(data);
        setState("ready");
      } catch {
        if (controller.signal.aborted) return;
        setSummary(null);
        setState("error");
      }
    })();
    return () => controller.abort();
  }, [refreshKey, retryKey, token]);

  const statusColors: Record<string, string> = { open: "#d97706", in_progress: "#2563eb", resolved: "#059669", discarded: "#64748b" };
  const originColors: Record<string, string> = { customer: "#2563eb", branch: "#0f766e", internal: "#7c3aed" };
  const statuses = INCIDENT_STATUSES.map((key) => ({ key, count: summary?.by_status[key] ?? 0 }));
  const categories = INCIDENT_CATEGORIES.map((key, index) => ({ key, count: summary?.by_category[key] ?? 0, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
  const origins = INCIDENT_ORIGINS.map((key) => ({ key, count: summary?.by_origin[key] ?? 0 }));
  const branches = INCIDENT_BRANCHES.map((key, index) => ({ key, count: summary?.by_branch[key] ?? 0, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
  const maxCategory = Math.max(1, ...categories.map(({ count }) => count));
  const maxBranch = Math.max(1, ...branches.map(({ count }) => count));
  const visibleBranches = showAllBranches ? branches : branches.slice(0, 6);
  const total = summary?.total ?? 0;
  const statusStops: string[] = [];
  let statusOffset = 0;
  for (const { key, count } of statuses) {
    const nextOffset = statusOffset + (total > 0 ? (count / total) * 100 : 0);
    statusStops.push(`${statusColors[key]} ${statusOffset}% ${nextOffset}%`);
    statusOffset = nextOffset;
  }
  const donutBackground = total > 0 ? `conic-gradient(${statusStops.join(", ")})` : "conic-gradient(#e2e8f0 0% 100%)";
  const percent = (count: number) => total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
  const kpis = [
    { key: "total", label: isEn ? "Total incidents" : "Total de incidencias", value: total, icon: "∑", tone: "total" },
    { key: "open", label: isEn ? "Open" : "Abiertas", value: summary?.by_status.open ?? 0, icon: "!", tone: "open" },
    { key: "in_progress", label: isEn ? "In progress" : "En curso", value: summary?.by_status.in_progress ?? 0, icon: "↻", tone: "progress" },
    { key: "resolved", label: isEn ? "Resolved" : "Resueltas", value: summary?.by_status.resolved ?? 0, icon: "✓", tone: "resolved" },
    { key: "discarded", label: isEn ? "Discarded" : "Descartadas", value: summary?.by_status.discarded ?? 0, icon: "—", tone: "discarded" },
  ];

  return <section className="panel incident-panel incident-summary" aria-labelledby="incident-summary-title" aria-busy={state === "loading"}>
    <div className="incident-summary-heading">
      <div><p className="eyebrow">{isEn ? "All records" : "Todos los registros"}</p><h2 id="incident-summary-title">{isEn ? "Incident summary" : "Resumen de incidencias"}</h2><p className="incident-summary-subtitle">{isEn ? "Overview and distribution of recorded incidents." : "Vista general y distribución de las incidencias registradas."}</p></div>
      {state === "ready" && summary && <span className="incident-summary-total">{isEn ? "All records" : "Todos los registros"}</span>}
    </div>
    {state === "loading" && <p className="incident-feedback" role="status">{isEn ? "Loading summary…" : "Cargando resumen…"}</p>}
    {state === "error" && <div className="incident-feedback incident-feedback-error" role="alert">
      <p>{isEn ? "We couldn’t load the incident summary. The directory and form are still available." : "No se pudo cargar el resumen de incidencias. El listado y el formulario siguen disponibles."}</p>
      <button type="button" className="button-primary" onClick={() => setRetryKey((value) => value + 1)}>{isEn ? "Retry" : "Reintentar"}</button>
    </div>}
    {state === "ready" && summary && <>
      <div className="incident-kpis" aria-label={isEn ? "Incident metrics" : "Indicadores de incidencias"}>
        {kpis.map((item) => <article className={`incident-kpi incident-kpi-${item.tone}`} key={item.key}>
          <span className="incident-kpi-icon" aria-hidden="true">{item.icon}</span>
          <div><span className="incident-kpi-label">{item.label}</span><strong>{item.value}</strong></div>
        </article>)}
      </div>
      <div className="incident-summary-grid incident-summary-general">
        <section className="incident-chart-card" aria-labelledby="incident-status-title">
          <div className="incident-chart-heading"><div><h3 id="incident-status-title">{isEn ? "By status" : "Distribución por estado"}</h3><p>{isEn ? "Current lifecycle of incidents" : "Estado actual de las incidencias"}</p></div></div>
          <div className="incident-status-chart">
            <div className="incident-donut" role="img" aria-label={isEn ? `Status distribution across ${total} incidents` : `Distribución por estado de ${total} incidencias`} style={{ background: donutBackground }}><div><strong>{total}</strong><span>total</span></div></div>
            <ul className="incident-legend">{statuses.map(({ key, count }) => <li key={key}>
              <span className="incident-legend-dot" style={{ backgroundColor: statusColors[key] }} aria-hidden="true" />
              <span className="incident-legend-label">{incidentLabel(key, language)}</span><strong>{count}</strong><small>{percent(count)}</small>
            </li>)}</ul>
          </div>
        </section>
        <section className="incident-chart-card" aria-labelledby="incident-category-title">
          <div className="incident-chart-heading"><div><h3 id="incident-category-title">{isEn ? "By category" : "Distribución por categoría"}</h3><p>{isEn ? "Incident volume by type" : "Volumen de incidencias por tipo"}</p></div></div>
          <ul className="incident-bar-list">{categories.map(({ key, count }) => <li className={count === 0 ? "is-zero" : ""} key={key}>
            <div className="incident-bar-label"><span title={incidentLabel(key, language)}>{incidentLabel(key, language)}</span><strong>{count}<small>{percent(count)}</small></strong></div>
            <div className="incident-bar-track" role="img" aria-label={`${incidentLabel(key, language)}: ${count}, ${percent(count)}`}><span style={{ width: `${(count / maxCategory) * 100}%` }} /></div>
          </li>)}</ul>
        </section>
      </div>
      <div className="incident-summary-grid incident-summary-operations">
        <section className="incident-chart-card" aria-labelledby="incident-origin-title">
          <div className="incident-chart-heading"><div><h3 id="incident-origin-title">{isEn ? "By origin" : "Distribución por origen"}</h3><p>{isEn ? "Who reported the incident — separate from its location" : "Quién reportó la incidencia, independiente de su sede"}</p></div></div>
          <ul className="incident-origin-list">{origins.map(({ key, count }) => <li key={key}>
            <div><span><i style={{ backgroundColor: originColors[key] }} aria-hidden="true" />{incidentLabel(key, language)}</span><strong>{count}<small>{percent(count)}</small></strong></div>
            <div className="incident-origin-track" role="img" aria-label={`${incidentLabel(key, language)}: ${count}, ${percent(count)}`}><span style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: originColors[key] }} /></div>
          </li>)}</ul>
        </section>
        <section className="incident-chart-card" aria-labelledby="incident-branch-title">
          <div className="incident-chart-heading"><div><h3 id="incident-branch-title">{isEn ? "By clinic" : "Incidencias por sede"}</h3><p>{isEn ? "Ranked by incident volume" : "Sedes ordenadas por volumen"}</p></div></div>
          <ol className="incident-branch-list">{visibleBranches.map(({ key, count }, index) => <li className={count === 0 ? "is-zero" : ""} key={key}>
            <span className="incident-branch-rank">{index + 1}</span><span className="incident-branch-name" title={incidentLabel(key, language)}>{incidentLabel(key, language)}</span><span className="incident-branch-track" role="img" aria-label={`${incidentLabel(key, language)}: ${count}`}><span style={{ width: `${(count / maxBranch) * 100}%` }} /></span><strong>{count}</strong>
          </li>)}</ol>
          {branches.length > 6 && <button type="button" className="incident-branches-toggle" aria-expanded={showAllBranches} onClick={() => setShowAllBranches((value) => !value)}>{showAllBranches ? (isEn ? "Show fewer clinics" : "Ver menos sedes") : (isEn ? "View all clinics" : "Ver todas las sedes")}</button>}
        </section>
      </div>
    </>}
  </section>;
}

const INCIDENT_STATUSES = ["open", "in_progress", "resolved", "discarded"] as const;
const INCIDENT_ORIGINS = ["customer", "branch", "internal"] as const;
const INCIDENT_CATEGORIES = ["clinical_equipment", "it_system", "billing_error", "compliance_breach", "patient_experience", "staff_issue", "facility_issue", "referral_issue", "other"] as const;
const INCIDENT_BRANCHES = [
  "central", "austin_north", "dallas_uptown", "houston_med_center",
  "san_antonio_west", "miami_brickell", "miami_doral", "orlando_east",
  "tampa_bay", "atlanta_midtown", "savannah", "london_city", "london_west",
  "manchester_central",
] as const;

const INCIDENT_LABELS: Record<string, { en: string; es: string }> = {
  open: { en: "Open", es: "Abierta" },
  in_progress: { en: "In progress", es: "En curso" },
  resolved: { en: "Resolved", es: "Resuelta" },
  discarded: { en: "Discarded", es: "Descartada" },
  customer: { en: "Customer", es: "Cliente" },
  branch: { en: "Branch", es: "Sede" },
  internal: { en: "Internal", es: "Interna" },
  central: { en: "Central - Austin Main Clinic", es: "Central - Austin Main Clinic" },
  austin_north: { en: "Austin - North", es: "Austin - North" },
  dallas_uptown: { en: "Dallas Uptown", es: "Dallas Uptown" },
  houston_med_center: { en: "Houston Medical Center", es: "Houston Medical Center" },
  san_antonio_west: { en: "San Antonio West", es: "San Antonio West" },
  miami_brickell: { en: "Miami Brickell", es: "Miami Brickell" },
  miami_doral: { en: "Miami Doral", es: "Miami Doral" },
  orlando_east: { en: "Orlando East", es: "Orlando East" },
  tampa_bay: { en: "Tampa Bay", es: "Tampa Bay" },
  atlanta_midtown: { en: "Atlanta Midtown", es: "Atlanta Midtown" },
  savannah: { en: "Savannah", es: "Savannah" },
  london_city: { en: "London City", es: "London City" },
  london_west: { en: "London West End", es: "London West End" },
  manchester_central: { en: "Manchester Central", es: "Manchester Central" },
  clinical_equipment: { en: "Clinical equipment", es: "Equipamiento clínico" },
  it_system: { en: "IT system", es: "Sistema informático" },
  billing_error: { en: "Billing error", es: "Error de facturación" },
  compliance_breach: { en: "Compliance breach", es: "Incumplimiento de normativa" },
  patient_experience: { en: "Patient experience", es: "Experiencia del paciente" },
  staff_issue: { en: "Staff issue", es: "Problema de personal" },
  facility_issue: { en: "Facility issue", es: "Problema de instalaciones" },
  referral_issue: { en: "Referral issue", es: "Problema de derivación" },
  other: { en: "Other", es: "Otro" },
};

function incidentLabel(value: string, language: "en" | "es") {
  return INCIDENT_LABELS[value]?.[language] ?? value.replace(/_/g, " ");
}

function incidentDate(value: string, language: "en" | "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

function IncidentDirectory({ token, isEn, refreshKey, onStatusUpdated }: { token: string; isEn: boolean; refreshKey: number; onStatusUpdated: () => void }) {
  const { language } = useLanguage();
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [branch, setBranch] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [directoryState, setDirectoryState] = useState<DirectoryState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [statusErrors, setStatusErrors] = useState<Record<string, boolean>>({});
  const [retryStatuses, setRetryStatuses] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const savingIdsRef = useRef(new Set<string>());
  const requestSequence = useRef(0);
  const incidentOpenerRef = useRef<HTMLElement | null>(null);
  const hasFilters = Boolean(status || origin || branch);
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (origin) params.set("origin", origin);
    if (branch) params.set("branch", branch);
    const query = params.size ? `?${params.toString()}` : "";

    setDirectoryState("loading");
    setErrorMessage("");
    void (async () => {
      try {
        const response = await fetch(`/api/healthcore/api/incidents${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
          return;
        }
        if (!response.ok) throw new Error("request_failed");
        const data = await response.json() as unknown;
        if (!Array.isArray(data)) throw new Error("invalid_response");
        if (requestSequence.current !== requestId) return;
        setIncidents(data as Incident[]);
        setDirectoryState("ready");
      } catch {
        if (controller.signal.aborted || requestSequence.current !== requestId) return;
        setIncidents([]);
        setErrorMessage(isEn
          ? "We couldn’t load incidents. Check your connection and try again."
          : "No se pudieron cargar las incidencias. Comprueba la conexión e inténtalo de nuevo.");
        setDirectoryState("error");
      }
    })();

    return () => controller.abort();
  }, [branch, isEn, origin, retryKey, status, token, refreshKey]);

  useEffect(() => {
    if (!selectedIncident) return;
    const previousOverflow = document.body.style.overflow;
    const closeButton = document.getElementById("incident-detail-close");
    closeButton?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetails();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("incident-detail-dialog");
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedIncident]);

  function closeDetails() {
    setSelectedIncidentId(null);
    incidentOpenerRef.current?.focus();
  }

  function openDetails(incident: Incident, opener: HTMLElement) {
    incidentOpenerRef.current = opener;
    setSelectedIncidentId(incident.id);
  }

  function onIncidentRowClick(event: ReactMouseEvent<HTMLTableRowElement>, incident: Incident) {
    const target = event.target as HTMLElement;
    if (target.closest("button, select, input, a, [role='button']")) return;
    openDetails(incident, event.currentTarget);
  }

  function onIncidentRowKeyDown(event: ReactKeyboardEvent<HTMLTableRowElement>, incident: Incident) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openDetails(incident, event.currentTarget);
  }

  function clearFilters() {
    setStatus("");
    setOrigin("");
    setBranch("");
  }

  async function saveStatus(incident: Incident, nextStatus: string) {
    if (savingIdsRef.current.has(incident.id)) return;
    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
      return;
    }
    savingIdsRef.current.add(incident.id);
    setSavingIds((current) => [...current, incident.id]);
    setStatusErrors((current) => ({ ...current, [incident.id]: false }));
    setRetryStatuses((current) => ({ ...current, [incident.id]: nextStatus }));
    try {
      const response = await fetch(`/api/healthcore/api/incidents/${incident.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
        return;
      }
      if (!response.ok) throw new Error("status_update_failed");
      setIncidents((current) => current.map((item) => item.id === incident.id ? { ...item, status: nextStatus } : item)
        .filter((item) => !status || item.status === status));
      setStatusDrafts((current) => ({ ...current, [incident.id]: nextStatus }));
      setStatusErrors((current) => ({ ...current, [incident.id]: false }));
      onStatusUpdated();
    } catch {
      setStatusDrafts((current) => ({ ...current, [incident.id]: incident.status }));
      setStatusErrors((current) => ({ ...current, [incident.id]: true }));
    } finally {
      savingIdsRef.current.delete(incident.id);
      setSavingIds((current) => current.filter((id) => id !== incident.id));
    }
  }

  return (
    <section className="panel incident-panel incident-directory" aria-labelledby="incident-list-title" aria-busy={directoryState === "loading"}>
      <div className="panel-heading">
        <div><p className="eyebrow">{isEn ? "Clinical operations" : "Operaciones clínicas"}</p><h2 id="incident-list-title">{isEn ? "Incident list" : "Listado de incidencias"}</h2></div>
        <span className="panel-status">{isEn ? "Live records" : "Registros actuales"}</span>
      </div>
      <div className="incident-filters">
        <label htmlFor="incident-filter-status">{isEn ? "Status" : "Estado"}
          <select id="incident-filter-status" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
            <option value="">{isEn ? "All statuses" : "Todos los estados"}</option>
            {INCIDENT_STATUSES.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}
          </select>
        </label>
        <label htmlFor="incident-filter-origin">{isEn ? "Origin" : "Origen"}
          <select id="incident-filter-origin" value={origin} onChange={(event) => setOrigin(event.currentTarget.value)}>
            <option value="">{isEn ? "All origins" : "Todos los orígenes"}</option>
            {INCIDENT_ORIGINS.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}
          </select>
        </label>
        <label htmlFor="incident-filter-branch">{isEn ? "Clinic" : "Sede"}
          <select id="incident-filter-branch" value={branch} onChange={(event) => setBranch(event.currentTarget.value)}>
            <option value="">{isEn ? "All clinics" : "Todas las sedes"}</option>
            {INCIDENT_BRANCHES.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}
          </select>
        </label>
        <button type="button" className="button-secondary incident-clear" onClick={clearFilters} disabled={!hasFilters}>
          {isEn ? "Clear filters" : "Limpiar filtros"}
        </button>
      </div>

      {directoryState === "loading" && <p className="incident-feedback" role="status">{isEn ? "Loading incidents…" : "Cargando incidencias…"}</p>}
      {directoryState === "error" && <div className="incident-feedback incident-feedback-error" role="alert">
        <p>{errorMessage}</p>
        <button type="button" className="button-primary" onClick={() => setRetryKey((value) => value + 1)}>{isEn ? "Retry" : "Reintentar"}</button>
      </div>}
      {directoryState === "ready" && incidents.length === 0 && <div className="incident-feedback" role="status">
        <p>{hasFilters
          ? (isEn ? "No incidents match these filters." : "Ninguna incidencia coincide con estos filtros.")
          : (isEn ? "There are no incidents yet." : "Todavía no hay incidencias.")}</p>
        {hasFilters && <button type="button" className="button-secondary" onClick={clearFilters}>{isEn ? "Clear filters" : "Limpiar filtros"}</button>}
      </div>}
      {directoryState === "ready" && incidents.length > 0 && <div className="incident-table-wrap">
        <table className="incident-table">
          <thead><tr>
            <th scope="col">{isEn ? "Title" : "Título"}</th>
            <th scope="col">{isEn ? "Status" : "Estado"}</th>
            <th scope="col">{isEn ? "Category" : "Categoría"}</th>
            <th scope="col">{isEn ? "Origin" : "Origen"}</th>
            <th scope="col">{isEn ? "Clinic" : "Sede"}</th>
            <th scope="col">{isEn ? "Update status" : "Cambiar estado"}</th>
          </tr></thead>
          <tbody>{incidents.map((incident) => <tr key={incident.id} className="incident-row" tabIndex={0} aria-label={isEn ? `View details for ${incident.title}` : `Ver detalle de ${incident.title}`} onClick={(event) => onIncidentRowClick(event, incident)} onKeyDown={(event) => onIncidentRowKeyDown(event, incident)}>
            <th scope="row" className="incident-title-cell"><button type="button" className="incident-detail-trigger" aria-label={isEn ? `View detail: ${incident.title}` : `Ver detalle: ${incident.title}`} onClick={(event) => openDetails(incident, event.currentTarget)}>{incident.title}<span aria-hidden="true"> ↗</span></button></th>
            <td><span className={`incident-status incident-status-${incident.status}`}>{incidentLabel(incident.status, language)}</span></td>
            <td>{incidentLabel(incident.category, language)}</td>
            <td>{incidentLabel(incident.origin, language)}</td>
            <td>{incidentLabel(incident.branch, language)}</td>
            <td className="incident-status-actions">
              {STATUS_TRANSITIONS[incident.status]?.length > 0 ? <>
                <label className="sr-only" htmlFor={`incident-status-${incident.id}`}>{isEn ? `New status for ${incident.title}` : `Nuevo estado para ${incident.title}`}</label>
                <select id={`incident-status-${incident.id}`} value={statusDrafts[incident.id] ?? incident.status} disabled={savingIds.includes(incident.id)} onChange={(event) => {
                  const value = event.currentTarget.value;
                  setStatusDrafts((current) => ({ ...current, [incident.id]: value }));
                }}>
                  <option value={incident.status}>{incidentLabel(incident.status, language)}</option>
                  {STATUS_TRANSITIONS[incident.status].map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}
                </select>
                <button type="button" className="button-secondary incident-status-save" disabled={savingIds.includes(incident.id) || (statusDrafts[incident.id] ?? incident.status) === incident.status} onClick={() => void saveStatus(incident, statusDrafts[incident.id] ?? incident.status)}>
                  {savingIds.includes(incident.id) ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Save" : "Guardar")}
                </button>
                {statusErrors[incident.id] && <div className="incident-status-error" role="alert">
                  <span>{isEn ? "Couldn’t update the status. Try again." : "No se pudo cambiar el estado. Inténtalo de nuevo."}</span>
                  <button type="button" className="incident-status-retry" disabled={savingIds.includes(incident.id)} onClick={() => void saveStatus(incident, retryStatuses[incident.id])}>{isEn ? "Retry" : "Reintentar"}</button>
                </div>}
              </> : <span aria-label={isEn ? "Final status" : "Estado final"}>—</span>}
            </td>
          </tr>)}</tbody>
        </table>
      </div>}
      {selectedIncident && <div className="incident-detail-backdrop" onClick={(event) => {
        if (event.target === event.currentTarget) closeDetails();
      }}>
        <section id="incident-detail-dialog" className="incident-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="incident-detail-title" aria-describedby="incident-detail-description">
          <header className="incident-detail-header">
            <div><p className="eyebrow">{isEn ? "Incident detail" : "Detalle de incidencia"}</p><span className="incident-detail-id">{isEn ? "ID" : "ID"}: {selectedIncident.id}</span></div>
            <button id="incident-detail-close" className="incident-detail-close" type="button" aria-label={isEn ? "Close incident details" : "Cerrar detalle de incidencia"} onClick={closeDetails}>×</button>
          </header>
          <div className="incident-detail-content">
            <span className={`incident-status incident-status-${selectedIncident.status}`}>{incidentLabel(selectedIncident.status, language)}</span>
            <h2 id="incident-detail-title">{selectedIncident.title}</h2>
            <section className="incident-detail-description-section" aria-labelledby="incident-detail-description-heading">
              <h3 id="incident-detail-description-heading">{isEn ? "Full description" : "Descripción completa"}</h3>
              <p id="incident-detail-description" className="incident-detail-description">{selectedIncident.description}</p>
            </section>
            <dl className="incident-detail-fields">
              <div><dt>{isEn ? "Category" : "Categoría"}</dt><dd>{incidentLabel(selectedIncident.category, language)}</dd></div>
              <div><dt>{isEn ? "Origin" : "Origen"}</dt><dd>{incidentLabel(selectedIncident.origin, language)}</dd></div>
              <div><dt>{isEn ? "Clinic" : "Sede"}</dt><dd>{incidentLabel(selectedIncident.branch, language)}</dd></div>
              <div><dt>{isEn ? "Created" : "Creada"}</dt><dd>{incidentDate(selectedIncident.created_at, language)}</dd></div>
              <div><dt>{isEn ? "Last updated" : "Última actualización"}</dt><dd>{incidentDate(selectedIncident.updated_at, language)}</dd></div>
            </dl>
          </div>
        </section>
      </div>}
    </section>
  );
}

const EMPTY_INCIDENT = { title: "", description: "", category: "", origin: "", branch: "" };
type IncidentField = keyof typeof EMPTY_INCIDENT;

function IncidentCreateForm({ token, onCreated }: { token: string; onCreated: () => void }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [values, setValues] = useState(EMPTY_INCIDENT);
  const [errors, setErrors] = useState<Partial<Record<IncidentField, string>>>({});
  const [message, setMessage] = useState<"success" | "error" | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => {
    if (saving) return;
    const firstInvalid = (Object.keys(EMPTY_INCIDENT) as IncidentField[]).find((field) => errors[field]);
    if (firstInvalid) document.getElementById(`incident-create-${firstInvalid}`)?.focus();
  }, [errors, saving]);
  const labels: Record<IncidentField, string> = {
    title: isEn ? "Title" : "Título", description: isEn ? "Description" : "Descripción",
    category: isEn ? "Category" : "Categoría", origin: isEn ? "Origin" : "Origen", branch: isEn ? "Clinic" : "Sede",
  };
  const missing: Record<IncidentField, string> = {
    title: isEn ? "Enter a title." : "Introduce un título.",
    description: isEn ? "Enter a description." : "Introduce una descripción.",
    category: isEn ? "Select a category." : "Selecciona una categoría.",
    origin: isEn ? "Select an origin." : "Selecciona un origen.",
    branch: isEn ? "Select a clinic." : "Selecciona una sede",
  };

  function update(field: IncidentField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const invalid = (Object.keys(EMPTY_INCIDENT) as IncidentField[]).filter((field) => !values[field].trim());
    if (invalid.length) {
      setErrors(Object.fromEntries(invalid.map((field) => [field, missing[field]])));
      return;
    }
    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken) {
      window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    setErrors({});
    try {
      const response = await fetch("/api/healthcore/api/incidents", {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(values), cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
        return;
      }
      if (response.status === 400) {
        const payload = await response.json().catch(() => ({})) as { detail?: { field?: string } };
        const field = payload.detail?.field;
        if (field && field in EMPTY_INCIDENT) {
          const invalidField = field as IncidentField;
          setErrors({ [invalidField]: invalidField === "title" && values.title.length > 120
            ? (isEn ? "Use at most 120 characters." : "Usa como máximo 120 caracteres.")
            : missing[invalidField] });
        } else setMessage("error");
        return;
      }
      if (response.status !== 201) throw new Error("create_failed");
      setValues(EMPTY_INCIDENT);
      setMessage("success");
      onCreated();
    } catch {
      setMessage("error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const fieldProps = (field: IncidentField) => ({
    id: `incident-create-${field}`, value: values[field],
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": [field === "title" || field === "description" ? "incident-privacy" : "", errors[field] ? `incident-error-${field}` : ""].filter(Boolean).join(" ") || undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(field, event.currentTarget.value),
  });
  const error = (field: IncidentField) => errors[field] && <span id={`incident-error-${field}`} className="incident-field-error" role="alert">{errors[field]}</span>;

  return <section className="panel incident-panel incident-create" id="incident-create" aria-labelledby="incident-create-heading">
    <div className="panel-heading"><h2 id="incident-create-heading">{isEn ? "Register an incident" : "Registrar una incidencia"}</h2></div>
    {message === "success" && <p className="incident-create-success" role="status">{isEn ? "Incident registered." : "Incidencia registrada."}</p>}
    {message === "error" && <p className="incident-create-error" role="alert">{isEn ? "Unable to save the incident. Please try again." : "No se pudo guardar la incidencia. Inténtalo de nuevo."}</p>}
    <form className="incident-create-form" onSubmit={(event) => void save(event)} noValidate>
      <fieldset disabled={saving}>
        <p id="incident-privacy" className="privacy-note">{isEn ? "Do not enter identifying patient information in the title or description." : "No introduzcas datos identificativos de pacientes en el título ni en la descripción."}</p>
        <label htmlFor="incident-create-title">{labels.title}</label>
        <input {...fieldProps("title")} maxLength={120} />
        {error("title")}
        <label htmlFor="incident-create-description">{labels.description}</label>
        <textarea {...fieldProps("description")} rows={4} />
        {error("description")}
        <label htmlFor="incident-create-category">{labels.category}</label>
        <select {...fieldProps("category")}><option value="">{isEn ? "Select a category" : "Selecciona una categoría"}</option>{INCIDENT_CATEGORIES.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}</select>
        {error("category")}
        <label htmlFor="incident-create-origin">{labels.origin}</label>
        <select {...fieldProps("origin")}><option value="">{isEn ? "Select an origin" : "Selecciona un origen"}</option>{INCIDENT_ORIGINS.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}</select>
        {error("origin")}
        <label htmlFor="incident-create-branch">{labels.branch}</label>
        <select {...fieldProps("branch")} className={values.origin === "branch" ? "incident-branch-highlight" : undefined}><option value="">{isEn ? "Select a clinic" : "Selecciona una sede"}</option>{INCIDENT_BRANCHES.map((value) => <option key={value} value={value}>{incidentLabel(value, language)}</option>)}</select>
        {error("branch")}
      </fieldset>
      <button type="submit" className="button-primary" disabled={saving}>{saving ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Save incident" : "Guardar incidencia")}</button>
    </form>
  </section>;
}

const ERROR_MESSAGES: Record<string, { en: string; es: string }> = {
  invalid_file_type: { en: "Select a CSV file.", es: "Selecciona un archivo CSV." },
  file_too_large: { en: "The CSV exceeds the 25 MB limit.", es: "El CSV supera el límite de 25 MB." },
  invalid_encoding: { en: "The CSV must use UTF-8 encoding.", es: "El CSV debe utilizar codificación UTF-8." },
  invalid_csv: { en: "The CSV structure is invalid.", es: "La estructura del CSV no es válida." },
  invalid_headers: { en: "The CSV headers do not match the nine required columns.", es: "Los encabezados del CSV no coinciden con las nueve columnas requeridas." },
  empty_file: { en: "The file is empty.", es: "El archivo está vacío." },
  analysis_not_found: { en: "No saved analysis is available for this account. Upload a CSV first.", es: "No hay análisis guardados para esta cuenta. Primero carga un CSV." },
  analysis_failed: { en: "Analysis failed. Please try again.", es: "El análisis falló. Inténtalo de nuevo." },
  export_failed: { en: "Export failed. Please try again.", es: "La exportación falló. Inténtalo de nuevo." },
};

const RULE_LABELS: Record<string, { en: string; es: string }> = {
  invalid_or_missing_incident_id: { en: "Invalid or missing incident ID", es: "ID de incidente inválido o ausente" },
  duplicate_incident_id: { en: "Duplicate incident ID", es: "ID de incidente duplicado" },
  invalid_date: { en: "Invalid date", es: "Fecha inválida" },
  invalid_or_missing_clinic: { en: "Invalid or missing clinic", es: "Clínica inválida o ausente" },
  country_clinic_mismatch: { en: "Country/clinic mismatch", es: "El país y la clínica no coinciden" },
  invalid_country: { en: "Invalid country", es: "País inválido" },
  invalid_or_missing_category: { en: "Invalid or missing category", es: "Categoría inválida o ausente" },
  invalid_description: { en: "Missing or short description", es: "Descripción ausente o demasiado breve" },
  invalid_status: { en: "Invalid status", es: "Estado inválido" },
  invalid_or_missing_patient_id: { en: "Invalid or missing patient ID", es: "ID de paciente inválido o ausente" },
  closed_without_satisfaction_score: { en: "Closed incident without a score", es: "Incidente cerrado sin puntuación" },
  invalid_satisfaction_score: { en: "Invalid satisfaction score", es: "Puntuación de satisfacción inválida" },
  invalid_record_structure: { en: "Invalid row structure", es: "Estructura de fila inválida" },
};

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <article className="incident-stat"><span>{label}</span><strong>{value}</strong></article>;
}

function IncidentResults({ report, onExport }: { report: Report; onExport: () => void }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const breakdowns = [
    { title: isEn ? "By category" : "Por categoría", key: "categories" },
    { title: isEn ? "By status" : "Por estado", key: "statuses" },
    { title: isEn ? "By country" : "Por país", key: "countries" },
    { title: isEn ? "Satisfaction" : "Satisfacción", key: "satisfaction_distribution" },
    { title: isEn ? "Validation reasons" : "Motivos de validación", key: "by_rule" },
  ] as const;
  const groups: Record<string, Record<string, number>> = {
    categories: report.categories,
    statuses: report.statuses,
    countries: report.countries,
    satisfaction_distribution: report.satisfaction_distribution,
    by_rule: report.invalid_breakdown.by_rule,
  };

  return (
    <div className="incident-results">
      <p className="incident-message" role="status">{isEn ? "Analysis complete. Only aggregate results are stored for your account." : "Análisis completado. Solo se guardan resultados agregados en tu cuenta."}</p>
      <div className="incident-stats">
        <Stat label={isEn ? "Total records" : "Registros totales"} value={report.total_records} />
        <Stat label={isEn ? "Valid records" : "Registros válidos"} value={report.valid_records} />
        <Stat label={isEn ? "Invalid records" : "Registros inválidos"} value={report.invalid_records} />
        <Stat label={isEn ? "Average satisfaction" : "Satisfacción promedio"} value={report.average_satisfaction?.toFixed(2) ?? "N/A"} />
      </div>
      {report.invalid_records > 0 && <p className="incident-warning" role="status">
        {isEn ? `${report.invalid_records} invalid records excluded from business metrics. Validation rules may overlap.` : `${report.invalid_records} registros inválidos excluidos de las métricas. Las reglas de validación pueden superponerse.`}
      </p>}
      <div className="incident-breakdowns">
        {breakdowns.map(({ title, key }) => (
          <section key={key}>
            <h3>{key === "satisfaction_distribution" ? `${isEn ? "Satisfaction" : "Satisfacción"} (${report.closed_with_valid_satisfaction} ${isEn ? "closed cases" : "casos cerrados"})` : title}</h3>
            <ul>{Object.entries(groups[key]).map(([name, count]) => (
              <li key={name}>{RULE_LABELS[name]?.[language] ?? name}: {count}</li>
            ))}</ul>
          </section>
        ))}
      </div>
      <button type="button" className="button-secondary" onClick={onExport}>{isEn ? "Download Results CSV" : "Descargar resultados CSV"}</button>
    </div>
  );
}

export default function IncidentAnalysis() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [token, setToken] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    setToken(window.localStorage.getItem("healthcore_access_token") ?? "");
  }, []);

  async function submit(event?: FormEvent<HTMLFormElement>, download = false) {
    event?.preventDefault();
    if (busy) return;
    const accessToken = token || window.localStorage.getItem("healthcore_access_token") || "";
    if (!accessToken || (!download && !file)) {
      setReport(null);
      setMessage({ text: accessToken ? (isEn ? "Select a CSV file." : "Selecciona un archivo CSV.") : (isEn ? "Sign in again to continue." : "Inicia sesión nuevamente para continuar."), error: true });
      if (!accessToken) window.location.assign("/login?next=%2Fbackoffice%2Fincidents");
      return;
    }
    if (!download && file && (!file.name.toLowerCase().endsWith(".csv") || file.size > 25_000_000)) {
      setReport(null);
      setMessage({ text: isEn ? "Select a CSV file no larger than 25 MB." : "Selecciona un archivo CSV de hasta 25 MB.", error: true });
      return;
    }

    setBusy(true);
    if (!download) setReport(null);
    setMessage({ text: download ? (isEn ? "Preparing results…" : "Preparando resultados…") : (isEn ? "Analyzing file…" : "Analizando archivo…") });
    try {
      const response = await fetch(`/api/healthcore/api/incidents/${download ? "results/export" : "analyze"}`, {
        method: download ? "GET" : "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        ...(download || !file ? {} : { body: (() => { const data = new FormData(); data.append("file", file, "incident-upload.csv"); return data; })() }),
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setMessage({ text: isEn ? "Your access token is invalid or expired. Sign in again." : "Tu token de acceso no es válido o ha caducado. Inicia sesión nuevamente.", error: true });
          return;
        }
        const errorCode = payload?.detail?.code;
        setMessage({ text: ERROR_MESSAGES[errorCode]?.[language] ?? (isEn ? "Request failed. Check authorization and file format." : "La solicitud falló. Comprueba la autorización y el formato del archivo."), error: true });
        return;
      }
      if (download) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "results.csv";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage({ text: isEn ? "Results downloaded. Only aggregate metrics are included." : "Resultados descargados. Solo se incluyen métricas agregadas." });
      } else {
        setReport(await response.json() as Report);
        setMessage(null);
      }
    } catch {
      setMessage({ text: isEn ? "Unable to reach the analysis service. Please try again." : "No se pudo conectar con el servicio de análisis. Inténtalo de nuevo.", error: true });
    } finally {
      setBusy(false);
    }
  }

    return <main className="backoffice-shell"><div className="content-wrap">
      <IncidentSummary token={token} refreshKey={refreshKey} />
      <IncidentDirectory token={token} isEn={isEn} refreshKey={refreshKey} onStatusUpdated={() => setRefreshKey((value) => value + 1)} />
      <IncidentCreateForm token={token} onCreated={() => setRefreshKey((value) => value + 1)} />
          <section className="panel incident-panel" id="incident-analysis" aria-labelledby="incident-title">
            <div className="panel-heading"><div><p className="eyebrow">{isEn ? "Clinical operations" : "Operaciones clínicas"}</p><h1 id="incident-title">{isEn ? "Incident analysis" : "Análisis de incidentes"}</h1></div><span className="panel-status">{isEn ? "Transient processing" : "Procesamiento temporal"}</span></div>
            <p className="incident-intro">{isEn ? "Upload a de-identified incident CSV to validate rows and review aggregate trends. Required columns: incident_id, date, clinic_id, country, category, description, status, patient_id, satisfaction_score." : "Carga un CSV de incidentes sin datos identificables para validar filas y revisar tendencias agregadas. Columnas requeridas: incident_id, date, clinic_id, country, category, description, status, patient_id, satisfaction_score."}</p>
            <form className="incident-form" onSubmit={(event) => void submit(event)} aria-busy={busy}>
              <label htmlFor="incident-file">{isEn ? "De-identified CSV file" : "Archivo CSV sin datos identificables"}</label>
              <input id="incident-file" type="file" accept=".csv,text/csv" required disabled={busy} onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setReport(null); setMessage(null); }} />
              <p className="privacy-note">{isEn ? "Use synthetic or de-identified data only. Raw uploads are discarded after analysis; only aggregate results are saved for your account. This prototype is not approved for real patient data." : "Utiliza únicamente datos sintéticos o desidentificados. Los archivos originales se descartan tras el análisis; solo se guardan resultados agregados. Este prototipo no está aprobado para datos reales de pacientes."}</p>
              <button className="button-primary" type="submit" disabled={busy}>{busy ? (isEn ? "Analyzing…" : "Analizando…") : (isEn ? "Analyze incidents" : "Analizar incidentes")}</button>
            </form>
            <div className="incident-results" aria-live="polite">
              {message && <p className={message.error ? "incident-error" : "incident-message"} role="status">{message.text}</p>}
              {report && <IncidentResults report={report} onExport={() => void submit(undefined, true)} />}
            </div>
          </section>
  </div></main>;
}
