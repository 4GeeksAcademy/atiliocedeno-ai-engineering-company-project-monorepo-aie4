"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
