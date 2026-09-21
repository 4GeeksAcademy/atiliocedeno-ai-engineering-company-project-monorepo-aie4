"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../pipeline.module.css";
import { invalidateRecordsCache } from "../talent-pipeline";
import { STAGE_LABELS, STAGE_LABELS_EN, STATUS_LABELS, STATUS_LABELS_EN } from "../labels";
import GlobalNavbar from "../../components/global-navbar";
import { useLanguage } from "../../components/language-context";

type RecordValue = string | number | boolean | null;
type TalentRecord = Record<string, RecordValue>;
type Note = TalentRecord;
type TalentForm = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  status: string;
  stage: string;
  experience_years: string;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

function recordsFromPayload(payload: unknown, key: string): TalentRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is TalentRecord => typeof item === "object" && item !== null);
  }

  if (typeof payload === "object" && payload !== null && key in payload) {
    const values = (payload as Record<string, unknown>)[key];
    return Array.isArray(values)
      ? values.filter((item): item is TalentRecord => typeof item === "object" && item !== null)
      : [];
  }

  // The real API wraps collection responses in { data: [...] }.
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    const values = (payload as { data?: unknown }).data;
    return Array.isArray(values)
      ? values.filter((item): item is TalentRecord => typeof item === "object" && item !== null)
      : [];
  }

  return [];
}

export default function TalentDetail({ id, languageHref }: { id: string; languageHref?: string }) {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const statusLabels = isEnglish ? STATUS_LABELS_EN : STATUS_LABELS;
  const stageLabels = isEnglish ? STAGE_LABELS_EN : STAGE_LABELS;
  const router = useRouter();
  const [record, setRecord] = useState<TalentRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [form, setForm] = useState<TalentForm>({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    linkedin_url: "",
    cv_url: "",
    status: "",
    stage: "",
    experience_years: "",
  });
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDetail(signal?: AbortSignal) {
    const [recordResponse, notesResponse] = await Promise.all([
      fetch(`${API_URL}/records/${encodeURIComponent(id)}`, { signal }),
      fetch(`${API_URL}/records/${encodeURIComponent(id)}/notes`, { signal }),
    ]);

    if (!recordResponse.ok || !notesResponse.ok) {
      throw new Error("No se pudo cargar el talento o sus notas.");
    }

    const nextRecord = (await recordResponse.json()) as TalentRecord;
    const nextNotes = recordsFromPayload(await notesResponse.json(), "notes");
    setRecord(nextRecord);
    setForm({
      full_name: String(nextRecord.full_name ?? ""),
      email: String(nextRecord.email ?? ""),
      phone: String(nextRecord.phone ?? ""),
      position: String(nextRecord.position ?? ""),
      linkedin_url: String(nextRecord.linkedin_url ?? ""),
      cv_url: String(nextRecord.cv_url ?? ""),
      status: String(nextRecord.status ?? ""),
      stage: String(nextRecord.stage ?? ""),
      experience_years: String(nextRecord.experience_years ?? ""),
    });
    setNotes(nextNotes);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setRecord(null);
    setError("");

    void loadDetail(controller.signal)
      .catch((requestError) => {
        if (!active || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The talent details could not be loaded." : "No se pudo cargar el detalle."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        ...form,
        experience_years: Number(form.experience_years),
      };
      const response = await fetch(`${API_URL}/records/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(isEnglish ? `The API returned status ${response.status}.` : `La API respondió con estado ${response.status}.`);
      const updated = (await response.json()) as TalentRecord;
      setRecord(updated);
      setForm((currentForm) => ({
        ...currentForm,
        experience_years: String(updated.experience_years ?? currentForm.experience_years),
      }));
      setMessage(isEnglish ? "Talent updated." : "Talento actualizado.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The talent could not be updated." : "No se pudo actualizar el talento."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    const talentName = String(record?.full_name ?? record?.name ?? "este talento");
    if (!window.confirm(isEnglish ? `Are you sure you want to delete ${talentName}?` : `¿Seguro que deseas eliminar a ${talentName}?`)) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await fetch(`${API_URL}/records/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(isEnglish ? `The API returned status ${response.status}.` : `La API respondió con estado ${response.status}.`);

      invalidateRecordsCache();
      router.push("/talents");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The talent could not be deleted." : "No se pudo eliminar el talento."));
      setSaving(false);
    }
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSaving(true);
      setError("");
      const response = await fetch(`${API_URL}/records/${encodeURIComponent(id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (!response.ok) throw new Error(isEnglish ? `The API returned status ${response.status}.` : `La API respondió con estado ${response.status}.`);
      setNoteText("");
      await loadDetail();
      setMessage(isEnglish ? "Note added." : "Nota añadida.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The note could not be added." : "No se pudo añadir la nota."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: Note) {
    const noteId = note.id ?? note.note_id;
    if (noteId === undefined || noteId === null) return;

    try {
      setSaving(true);
      setError("");
      const response = await fetch(`${API_URL}/records/${encodeURIComponent(id)}/notes/${encodeURIComponent(String(noteId))}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(isEnglish ? `The API returned status ${response.status}.` : `La API respondió con estado ${response.status}.`);
      setNotes((currentNotes) => currentNotes.filter((currentNote) => String(currentNote.id ?? currentNote.note_id) !== String(noteId)));
      setMessage(isEnglish ? "Note deleted." : "Nota eliminada.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The note could not be deleted." : "No se pudo eliminar la nota."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className={styles.detailPage}><p className={styles.message}>{isEnglish ? "Loading details..." : "Cargando detalle..."}</p></main>;
  if (!record) return <main className={styles.detailPage}><p className={styles.error} role="alert">{error || (isEnglish ? "Talent not found." : "Talento no encontrado.")}</p></main>;

  return (
    <main className={styles.detailPage}>
      <GlobalNavbar backLabel languageHref={languageHref} />
      <header className={styles.detailHeader}>
        <Link
          href={isEnglish ? "/talents/en" : "/talents"}
          aria-label={isEnglish ? "Back to Talent Pipeline" : "Volver al Talent Pipeline"}
          title={isEnglish ? "Back to Talent Pipeline" : "Volver al Talent Pipeline"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <span className={styles.eyebrow}>{isEnglish ? "Talent detail" : "Detalle del talento"}</span>
        <h1>{String(record.name ?? record.full_name ?? record.fullName ?? `Registro ${id}`)}</h1>
        <p>{String(record.email ?? (isEnglish ? "No email available" : "Sin email disponible"))}</p>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <section className={styles.detailGrid}>
        <form className={styles.panel} onSubmit={saveRecord}>
          <h2>{isEnglish ? "Talent information" : "Datos del talento"}</h2>
          <p>{isEnglish ? "Update the talent information." : "Actualiza la información del talento."}</p>
          <div className={styles.fieldGrid}>
            <label>{isEnglish ? "Record ID" : "ID del registro"}<input value={String(record.id ?? id)} readOnly /></label>
            <label>{isEnglish ? "Full name" : "Nombre completo"}<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>{isEnglish ? "Phone" : "Teléfono"}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>{isEnglish ? "Position" : "Cargo"}<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
            <label>{isEnglish ? "Experience (years)" : "Experiencia (años)"}<input type="number" min="0" value={form.experience_years} onChange={(event) => setForm({ ...form, experience_years: event.target.value })} /></label>
            <label>{isEnglish ? "Status" : "Estado"}<select className={styles.fieldSelect} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} disabled={saving}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>{isEnglish ? "Stage" : "Etapa"}<select className={styles.fieldSelect} value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })} disabled={saving}>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>LinkedIn<input type="url" value={form.linkedin_url} onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })} /></label>
            <label>{isEnglish ? "Resume URL" : "URL del CV"}<input type="url" value={form.cv_url} onChange={(event) => setForm({ ...form, cv_url: event.target.value })} /></label>
          </div>
          <div className={styles.actionRow}>
            <button disabled={saving} type="submit">{saving ? (isEnglish ? "Saving..." : "Guardando...") : (isEnglish ? "Save changes" : "Guardar cambios")}</button>
            <button className={styles.deleteButton} disabled={saving} onClick={deleteRecord} type="button">
              {saving ? (isEnglish ? "Processing..." : "Procesando...") : (isEnglish ? "Delete record" : "Eliminar registro")}
            </button>
          </div>
        </form>

        <section className={styles.panel}>
          <h2>{isEnglish ? "Notes" : "Notas"}</h2>
          <form onSubmit={addNote} className={styles.noteForm}>
            <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={4} placeholder={isEnglish ? "Add a note" : "Añadir una nota"} aria-label={isEnglish ? "New note" : "Nueva nota"} />
            <button disabled={saving || !noteText.trim()} type="submit">{isEnglish ? "Add note" : "Añadir nota"}</button>
          </form>
          <div className={styles.notes}>
            {notes.length === 0 && <p className={styles.message}>{isEnglish ? "There are no notes." : "No hay notas."}</p>}
            {notes.map((note, index) => (
              <article className={styles.note} key={String(note.id ?? note.note_id ?? index)}>
                <p>{String(note.content ?? note.text ?? note.note ?? "Sin contenido")}</p>
                {(note.id ?? note.note_id) !== undefined && <button type="button" onClick={() => deleteNote(note)} disabled={saving}>{isEnglish ? "Delete" : "Eliminar"}</button>}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
