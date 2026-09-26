"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { invalidateRecordsCache } from "../talent-pipeline";
import { STAGE_LABELS, STAGE_LABELS_EN, STATUS_LABELS, STATUS_LABELS_EN } from "../labels";
import GlobalNavbar from "../../components/global-navbar";
import { useLanguage } from "../../components/language-context";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

type TalentForm = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
  status: string;
  stage: string;
};

function createdRecordFromPayload(payload: unknown): { id?: string | number; _id?: string | number } {
  if (typeof payload !== "object" || payload === null) return {};
  if ("data" in payload && typeof payload.data === "object" && payload.data !== null) {
    return payload.data as { id?: string | number; _id?: string | number };
  }
  return payload as { id?: string | number; _id?: string | number };
}

const initialForm: TalentForm = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: "",
  status: "received",
  stage: "pending",
};

export default function NewTalent({ languageHref }: { languageHref?: string }) {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const statusLabels = isEnglish ? STATUS_LABELS_EN : STATUS_LABELS;
  const stageLabels = isEnglish ? STAGE_LABELS_EN : STAGE_LABELS;
  const router = useRouter();
  const [form, setForm] = useState<TalentForm>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        experience_years: form.experience_years.trim() === "" ? null : Number(form.experience_years),
      };
      if (payload.experience_years !== null && !Number.isFinite(payload.experience_years)) {
        throw new Error(isEnglish ? "Experience must be a valid number." : "Los años de experiencia deben ser un número válido.");
      }

      const response = await fetch(`${API_URL}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(isEnglish ? `The API returned status ${response.status}.` : `La API respondió con estado ${response.status}.`);
      const created = createdRecordFromPayload(await response.json());
      const createdId = created.id ?? created._id;
      if (createdId === undefined) throw new Error(isEnglish ? "The API did not return the talent identifier." : "La API no devolvió el identificador del talento.");
      invalidateRecordsCache();
      router.push(`${isEnglish ? "/talents/en" : "/talents"}/${createdId}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isEnglish ? "The talent could not be created." : "No se pudo crear el talento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-8 pt-24 text-slate-800 sm:px-8 sm:pt-24 lg:px-12">
      <GlobalNavbar backLabel languageHref={languageHref} />
      <header className="mx-auto mb-8 w-full max-w-5xl">
        <Link
          href={isEnglish ? "/talents/en" : "/talents"}
          aria-label={isEnglish ? "Back to Talent Pipeline" : "Volver al Talent Pipeline"}
          title={isEnglish ? "Back to Talent Pipeline" : "Volver al Talent Pipeline"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-800 sm:text-5xl">{isEnglish ? "Create record" : "Crear registro"}</h1>
        <p className="mt-3 max-w-2xl text-slate-500">{isEnglish ? "Complete the talent information. The application will send the record to the API automatically." : "Completa los datos del talento. La aplicación enviará el registro a la API automáticamente."}</p>
      </header>
      {error && <p className="mx-auto mb-4 w-full max-w-5xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">{error}</p>}
      <form className="mx-auto grid w-full max-w-5xl gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8" onSubmit={createRecord}>
        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="full_name">
          {isEnglish ? "Full name" : "Nombre completo"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="full_name"
          name="full_name"
          type="text"
          value={form.full_name}
          onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="status">
          {isEnglish ? "Status" : "Estado"}
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            id="status"
            name="status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
            required
          >
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="stage">
          {isEnglish ? "Stage" : "Etapa"}
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            id="stage"
            name="stage"
            value={form.stage}
            onChange={(event) => setForm({ ...form, stage: event.target.value })}
            required
          >
            {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="email">
          {isEnglish ? "Email" : "Correo electrónico"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="phone">
          {isEnglish ? "Phone" : "Teléfono"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="position">
          {isEnglish ? "Position" : "Cargo o posición"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="position"
          name="position"
          type="text"
          value={form.position}
          onChange={(event) => setForm({ ...form, position: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="linkedin_url">
          LinkedIn URL
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          placeholder="https://www.linkedin.com/in/usuario"
          value={form.linkedin_url}
          onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="cv_url">
          {isEnglish ? "Resume URL" : "URL del CV"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="cv_url"
          name="cv_url"
          type="url"
          placeholder="https://..."
          value={form.cv_url}
          onChange={(event) => setForm({ ...form, cv_url: event.target.value })}
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="experience_years">
          {isEnglish ? "Years of experience" : "Años de experiencia"}
        <input
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          id="experience_years"
          name="experience_years"
          type="number"
          min="0"
          step="1"
          value={form.experience_years}
          onChange={(event) => setForm({ ...form, experience_years: event.target.value })}
          required
        />
        </label>

        <button className="mt-2 min-h-11 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 sm:justify-self-start" disabled={saving} type="submit">
          {saving ? (isEnglish ? "Creating..." : "Creando...") : (isEnglish ? "Create talent" : "Crear talento")}
        </button>
      </form>
    </main>
  );
}
