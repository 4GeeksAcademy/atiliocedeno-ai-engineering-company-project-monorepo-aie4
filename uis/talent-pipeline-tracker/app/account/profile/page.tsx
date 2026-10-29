"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { apiRequest, clearAccessToken, getAccessToken } from "../../auth/session";

type Profile = { id: number; user_id: number; name: string | null; phone: string | null; address: string | null };
type ProfileForm = { name: string; phone: string; address: string };
const emptyForm: ProfileForm = { name: "", phone: "", address: "" };

export default function AccountProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [hasProfile, setHasProfile] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    if (!getAccessToken()) {
      router.replace("/login");
      return () => controller.abort();
    }
    apiRequest<Profile>("/profiles/me", { signal: controller.signal })
      .then((profile) => {
        setForm({ name: profile.name ?? "", phone: profile.phone ?? "", address: profile.address ?? "" });
        setUserId(profile.user_id);
        setHasProfile(true);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const text = cause instanceof Error ? cause.message : "No se pudo cargar el perfil.";
        if (text.includes("HTTP 401") || text.includes("HTTP 403")) {
          clearAccessToken();
          router.replace("/login");
          return;
        }
        if (text.includes("HTTP 404")) {
          setHasProfile(false);
          return;
        }
        setError(text);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const body = { name: form.name.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null };
    try {
      const profile = await apiRequest<Profile>("/profiles/me", {
        method: hasProfile ? "PUT" : "POST",
        body,
      });
      setForm({ name: profile.name ?? "", phone: profile.phone ?? "", address: profile.address ?? "" });
      setUserId(profile.user_id);
      setHasProfile(true);
      setMessage("Perfil guardado correctamente.");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No se pudo guardar el perfil.";
      if (text.includes("HTTP 401") || text.includes("HTTP 403")) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile() {
    if (!window.confirm("¿Eliminar los datos de tu perfil? Esta acción no elimina tu cuenta.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (userId === null) throw new Error("No se pudo determinar la cuenta del perfil.");
      await apiRequest<void>(`/profiles/${userId}`, { method: "DELETE" });
      setForm(emptyForm);
      setUserId(null);
      setHasProfile(false);
      setMessage("Perfil eliminado. Puedes crear uno nuevo cuando quieras.");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No se pudo eliminar el perfil.";
      if (text.includes("HTTP 401") || text.includes("HTTP 403")) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
  return <main className="min-h-screen bg-[#f4f8fc] px-5 py-10 text-slate-800 sm:px-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">← Volver al panel</Link>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Mi cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Mi perfil</h1>
        <p className="mt-2 text-slate-500">Mantén actualizados tus datos de contacto.</p>
        {loading ? <p role="status" className="mt-8 text-slate-500">Cargando perfil…</p> : <form onSubmit={saveProfile} className="mt-8 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="profile-name">Nombre<input id="profile-name" autoComplete="name" maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="profile-phone">Teléfono<input id="profile-phone" type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="profile-address">Dirección<input id="profile-address" autoComplete="street-address" maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={inputClass} /></label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="rounded-xl bg-[#2563EB] px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Guardando…" : hasProfile ? "Guardar cambios" : "Crear perfil"}</button>
            {hasProfile && <button type="button" disabled={busy} onClick={() => void deleteProfile()} className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Eliminar perfil</button>}
          </div>
        </form>}
      </section>
    </div>
  </main>;
}
