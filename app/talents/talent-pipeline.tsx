"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import styles from "./pipeline.module.css";
import { labelForValue, STAGE_LABELS, STAGE_LABELS_EN, STATUS_LABELS, STATUS_LABELS_EN } from "./labels";
import GlobalNavbar from "../components/global-navbar";
import { useLanguage } from "../components/language-context";

type RecordValue = string | number | boolean | null;
type TalentRecord = Record<string, RecordValue>;

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const RECORDS_PAGE_SIZE = 1000;
const DISPLAY_PAGE_SIZE = 20;

let recordsCache: TalentRecord[] | null = null;
let recordsRequest: Promise<TalentRecord[]> | null = null;
let recordsCacheVersion = 0;

function parseRecords(payload: unknown): TalentRecord[] {
  if (Array.isArray(payload)) return payload;

  if (typeof payload === "object" && payload !== null) {
    const collection = payload as { data?: unknown; records?: unknown };
    const values = collection.data ?? collection.records;
    return Array.isArray(values) ? values : [];
  }

  return [];
}

export function invalidateRecordsCache(): void {
  recordsCacheVersion += 1;
  recordsCache = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("talent-records-invalidated"));
  }
}

async function fetchAllRecords(signal: AbortSignal): Promise<TalentRecord[]> {
  const allRecords: TalentRecord[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(RECORDS_PAGE_SIZE),
    });
    const response = await fetch(`${API_URL}/records?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error(`La API respondió con estado ${response.status}.`);
    }

    const pageRecords = parseRecords(await response.json());
    allRecords.push(...pageRecords);

    // A full page means there may be more records. An incomplete page is the
    // end of the collection, so no unnecessary request is made.
    if (pageRecords.length < RECORDS_PAGE_SIZE) break;
    page += 1;
  }

  return allRecords;
}

function fetchRecords(): Promise<TalentRecord[]> {
  if (recordsCache) return Promise.resolve(recordsCache);
  if (recordsRequest) return recordsRequest;

  const controller = new AbortController();
  const requestVersion = recordsCacheVersion;
  recordsRequest = fetchAllRecords(controller.signal)
    .then((records) => {
      if (requestVersion === recordsCacheVersion) recordsCache = records;
      return records;
    })
    .finally(() => {
      recordsRequest = null;
    });

  return recordsRequest;
}

function displayValue(record: TalentRecord, keys: string[], fallback = "Sin información"): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return fallback;
}

function displayLabeledValue(record: TalentRecord, keys: string[], labels: Record<string, string>): string {
  return labelForValue(displayValue(record, keys), labels);
}

function optionValues(records: TalentRecord[], keys: string[], fallback: string): string[] {
  return Array.from(
    new Set(
      records
        .map((record) => displayValue(record, keys, fallback))
        .filter((value) => value !== fallback),
    ),
  ).sort();
}

function recordId(record: TalentRecord, fallback: number): string {
  return String(record.id ?? record._id ?? fallback);
}

export default function TalentPipeline() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const statusLabels = isEnglish ? STATUS_LABELS_EN : STATUS_LABELS;
  const stageLabels = isEnglish ? STAGE_LABELS_EN : STAGE_LABELS;
  const missingValue = isEnglish ? "No information" : "Sin información";
  const [records, setRecords] = useState<TalentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecords() {
      try {
        setLoading(true);
        setError("");
        const nextRecords = await fetchRecords();
        if (!controller.signal.aborted) setRecords(nextRecords);
      } catch (requestError) {
        if (controller.signal.aborted || (requestError instanceof DOMException && requestError.name === "AbortError")) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : (isEnglish ? "Talents could not be loaded." : "No se pudieron cargar los talentos."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    function refreshRecords() {
      void loadRecords();
    }

    window.addEventListener("talent-records-invalidated", refreshRecords);
    void loadRecords();
    // The controller cancels state updates for an unmounted instance. The shared
    // collection request intentionally remains alive for the next Strict Mode
    // mount instead of being canceled by the first instance's cleanup.
    return () => {
      controller.abort();
      window.removeEventListener("talent-records-invalidated", refreshRecords);
    };
  }, [isEnglish]);

  const statusOptions = useMemo(() => optionValues(records, ["status"], missingValue), [missingValue, records]);
  const stageOptions = useMemo(() => optionValues(records, ["stage"], missingValue), [missingValue, records]);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const name = displayValue(record, ["name", "full_name", "fullName"], missingValue).toLowerCase();
      const email = displayValue(record, ["email"], missingValue).toLowerCase();
      const recordStatus = displayValue(record, ["status"], missingValue);
      const recordStage = displayValue(record, ["stage"], missingValue);

      return (
        (!normalizedQuery || name.includes(normalizedQuery) || email.includes(normalizedQuery)) &&
        (!status || recordStatus === status) &&
        (!stage || recordStage === stage)
      );
    });
  }, [missingValue, query, records, stage, status]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / DISPLAY_PAGE_SIZE));
  const visibleRecords = useMemo(() => {
    const start = (currentPage - 1) * DISPLAY_PAGE_SIZE;
    return filteredRecords.slice(start, start + DISPLAY_PAGE_SIZE);
  }, [currentPage, filteredRecords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, status, stage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <main className={styles.page}>
      <GlobalNavbar />
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1>Talent Pipeline Tracker</h1>
        </div>
      </header>

      <Link
        className={styles.floatingAddButton}
        href={isEnglish ? "/talents/en/new" : "/talents/new"}
        aria-label={isEnglish ? "Add a new talent" : "Agregar un nuevo talento"}
      >
        <Plus className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
        <span className={styles.floatingTooltip} role="tooltip">
          {isEnglish ? "Do you want to add a new talent?" : "¿Quieres agregar un nuevo talento?"}
        </span>
      </Link>

      <section className={styles.toolbar} aria-label={isEnglish ? "Talent filters" : "Filtros de talentos"}>
        <label>
          {isEnglish ? "Search" : "Buscar"}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isEnglish ? "Name or email" : "Nombre o email"}
            type="search"
          />
        </label>
        <label>
          {isEnglish ? "Status" : "Estado"}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{isEnglish ? "All" : "Todos"}</option>
            {statusOptions.map((value) => <option key={value} value={value}>{labelForValue(value, statusLabels)}</option>)}
          </select>
        </label>
        <label>
          {isEnglish ? "Stage" : "Etapa"}
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="">{isEnglish ? "All" : "Todas"}</option>
            {stageOptions.map((value) => <option key={value} value={value}>{labelForValue(value, stageLabels)}</option>)}
          </select>
        </label>
      </section>

      {loading && <p className={styles.message}>{isEnglish ? "Loading talents..." : "Cargando talentos..."}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && filteredRecords.length === 0 && (
        <p className={styles.message}>{isEnglish ? "No talents match the current filters." : "No hay talentos que coincidan con los filtros actuales."}</p>
      )}
      {!loading && !error && filteredRecords.length > 0 && (
        <section className={styles.list} aria-label={isEnglish ? "Talent list" : "Listado de talentos"}>
          {visibleRecords.map((record, index) => (
            <article className={styles.card} key={recordId(record, index)}>
              <div>
                <h2>{displayValue(record, ["name", "full_name", "fullName"], missingValue)}</h2>
                <p>{displayValue(record, ["email"], missingValue)}</p>
              </div>
              <dl className={styles.cardMeta}>
                <div><dt>{isEnglish ? "Status" : "Estado"}</dt><dd>{displayLabeledValue(record, ["status"], statusLabels)}</dd></div>
                <div><dt>{isEnglish ? "Stage" : "Etapa"}</dt><dd>{displayLabeledValue(record, ["stage"], stageLabels)}</dd></div>
              </dl>
              <Link className={styles.detailLink} href={`${isEnglish ? "/talents/en" : "/talents"}/${recordId(record, (currentPage - 1) * DISPLAY_PAGE_SIZE + index)}`}>
                {isEnglish ? "View details" : "Ver detalle"}
              </Link>
            </article>
          ))}
        </section>
      )}
      {!loading && !error && filteredRecords.length > 0 && (
        <nav className={styles.pagination} aria-label={isEnglish ? "Talent pagination" : "Paginación de talentos"}>
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
            {isEnglish ? "Previous" : "Anterior"}
          </button>
          <label>
            {isEnglish ? "Page" : "Página"}
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(event) => {
                const nextPage = Number(event.target.value);
                if (Number.isFinite(nextPage)) setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
              }}
              aria-label={isEnglish ? "Current page" : "Página actual"}
            />
            <span>{isEnglish ? `of ${totalPages}` : `de ${totalPages}`}</span>
          </label>
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
            {isEnglish ? "Next" : "Siguiente"}
          </button>
        </nav>
      )}
    </main>
  );
}
