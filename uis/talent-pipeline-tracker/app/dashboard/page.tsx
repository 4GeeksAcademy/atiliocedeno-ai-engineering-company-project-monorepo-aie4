"use client";
import { PhoneInput } from "../components/phone-input";
import { phoneError, normalizePhone } from "../auth/phone";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Activity, ArrowUpRight, BriefcaseMedical, CircleUserRound, LogOut, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { apiRequest, clearAccessToken, getAccessToken, isUnauthorized, hasStatus } from "../auth/session";

type Profile = { id: number; user_id: number; name: string | null; phone: string | null; address: string | null };
type UserInfo = { email: string; role: string; profile: Profile | null };
type UserRecord = { id: number; email: string; is_active: boolean; role: string; created_at: string; profile: Profile | null };
type LoadState = "loading" | "ready" | "error";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo conectar con HealthCore API.";
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserInfo | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", address: "" });
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function loadDashboard(signal?: AbortSignal) {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setState("loading");
    setError("");
    try {
      const userInfo = await apiRequest<UserInfo>("/auth/me", { signal });
      if (!userInfo.profile) { router.replace("/account/profile"); return; }
      setMe(userInfo);
      setProfileForm({ name: userInfo.profile?.name ?? "", phone: userInfo.profile?.phone ?? "", address: userInfo.profile?.address ?? "" });
      setState("ready");
      if (userInfo.role === "admin") {
        try {
          const userList = await apiRequest<UserRecord[]>("/users", { signal });
          setUsers(userList);
        } catch (listError) {
          if (signal?.aborted) return;
          setError(`No se pudo cargar el directorio de usuarios: ${errorText(listError)}`);
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (requestError) {
      if (signal?.aborted) return;
      const message = errorText(requestError);
      if (isUnauthorized(requestError)) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setError(message);
      setState("error");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
    // Initial auth verification only; loadDashboard is intentionally invoked on refresh too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut() {
    clearAccessToken();
    router.replace("/login");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me || savingProfile || phoneError(profileForm.phone)) return;
    setSavingProfile(true);
    setProfileError("");
    setProfileNotice("");
    const body = {
      name: profileForm.name.trim() || null,
      phone: normalizePhone(profileForm.phone),
      address: profileForm.address.trim() || null,
    };
    try {
      const profile = await apiRequest<Profile>("/profiles/me", {
        method: me.profile ? "PUT" : "POST",
        body,
      });
      setMe((current) => current ? { ...current, profile } : current);
      setProfileForm({ name: profile.name ?? "", phone: profile.phone ?? "", address: profile.address ?? "" });
      setEditingProfile(false);
      setProfileNotice("Tu información se guardó correctamente.");
    } catch (cause) {
      const message = errorText(cause);
      if (isUnauthorized(cause)) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setProfileError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  const profileName = me?.profile?.name?.trim();
  const displayName = profileName || me?.email || "tu cuenta";

  return (
    <main className="min-h-screen bg-[#f4f8fc] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-[#2563EB]" aria-label="HealthCore dashboard">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">✚</span>
            <span>Health<span className="text-teal-500">Core</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/account/change-password" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:inline-flex">Cambiar contraseña</Link>
            <Link href="/account/profile" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Mi perfil</Link>
            {me?.role === "admin" && <Link href="/admin/users" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:inline-flex">Usuarios</Link>}
            <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><LogOut size={16} />Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1558c0] via-[#176bc9] to-[#13a994] px-6 py-8 text-white shadow-lg shadow-blue-900/10 sm:px-10 sm:py-10">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/15" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-100">Panel de control</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hola, {displayName}</h1>
              <p className="mt-3 max-w-2xl text-blue-50/90">Tu espacio seguro para consultar tu cuenta y administrar la información de HealthCore.</p>
            </div>
            <button type="button" disabled={state === "loading"} onClick={() => void loadDashboard()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"><RefreshCw size={16} className={state === "loading" ? "animate-spin" : ""} />Actualizar</button>
          </div>
        </section>

        {state === "error" && <section role="alert" className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center"><div><h2 className="font-bold">No se pudo cargar el panel</h2><p className="mt-1 break-words text-sm">{error}</p></div><button type="button" onClick={() => void loadDashboard()} className="shrink-0 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">Reintentar</button></section>}

        {state === "loading" && <div role="status" className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Verificando tu sesión y cargando información…</div>}

        {state === "ready" && me && <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><CircleUserRound size={22} /></span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{me.role}</span></div>
              <p className="mt-5 text-sm font-medium text-slate-500">Cuenta activa</p><p className="mt-1 break-all text-lg font-bold text-slate-900">{me.email}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><ShieldCheck size={22} /></div>
              <p className="mt-5 text-sm font-medium text-slate-500">Sesión segura</p><p className="mt-1 text-lg font-bold text-slate-900">Autenticado</p><p className="mt-1 text-sm text-slate-500">Tu cuenta está protegida.</p>
            </article>
            {me.role === "admin" && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Users size={22} /></div>
              <p className="mt-5 text-sm font-medium text-slate-500">Usuarios registrados</p><p className="mt-1 text-2xl font-bold text-slate-900">{users.length}</p><p className="mt-1 text-sm text-slate-500">Cuentas en HealthCore.</p>
            </article>}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Activity size={23} /></span><div><h2 className="text-xl font-bold text-slate-900">Tu perfil</h2><p className="mt-1 text-sm text-slate-500">Información personal asociada a tu cuenta.</p></div></div>
              {!editingProfile && me.profile ? <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Nombre</dt><dd className="mt-1 font-semibold text-slate-800">{me.profile.name || "Aún no agregado"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Teléfono</dt><dd className="mt-1 font-semibold text-slate-800">{me.profile.phone || "Aún no agregado"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Dirección</dt><dd className="mt-1 font-semibold text-slate-800">{me.profile.address || "Aún no agregada"}</dd></div>
              </dl> : !editingProfile && <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay un perfil asociado a tu cuenta.</div>}
              {editingProfile ? <form onSubmit={saveProfile} className="mt-6 grid gap-4 border-t border-slate-100 pt-5">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">Nombre<input maxLength={200} autoComplete="name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">Teléfono<PhoneInput maxLength={40} type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">Dirección<input maxLength={500} autoComplete="street-address" value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>
                {profileError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}
                <div className="flex flex-wrap gap-3"><button disabled={savingProfile} className="rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{savingProfile ? "Guardando…" : "Guardar información"}</button><button type="button" disabled={savingProfile} onClick={() => { setEditingProfile(false); setProfileError(""); setProfileForm({ name: me.profile?.name ?? "", phone: me.profile?.phone ?? "", address: me.profile?.address ?? "" }); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button></div>
              </form> : <button type="button" onClick={() => { setProfileForm({ name: me.profile?.name ?? "", phone: me.profile?.phone ?? "", address: me.profile?.address ?? "" }); setEditingProfile(true); setProfileError(""); }} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">{me.profile ? "Editar mi perfil" : "Crear mi perfil"} <ArrowUpRight size={15} /></button>}
              {profileNotice && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{profileNotice}</p>}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><BriefcaseMedical size={23} /></div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Herramientas de cuenta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Administra el acceso a tu cuenta y mantén tus credenciales al día.</p>
              <Link href="/account/change-password" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700">Cambiar contraseña <ArrowUpRight size={16} /></Link>
            </article>
          </section>

          {me.role === "admin" && <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5"><div><h2 className="font-bold text-slate-900">Administración de cuentas</h2><p className="mt-1 text-sm text-slate-600">Editar usuarios y sus perfiles con permisos de administrador.</p></div><Link href="/admin/users" className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Gestionar usuarios</Link></div>}

        </>}
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>HealthCore Digital · Portal seguro</span><span>Los datos del panel se cargan directamente desde HealthCore API.</span></footer>
      </div>
    </main>
  );
}
