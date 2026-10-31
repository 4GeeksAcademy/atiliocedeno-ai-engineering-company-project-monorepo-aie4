"use client";
import { PhoneInput } from "../../components/phone-input";
import { phoneError, normalizePhone } from "../../auth/phone";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest, clearAccessToken, getAccessToken, isUnauthorized, hasStatus } from "../../auth/session";

type Profile = { id: number; user_id: number; name: string | null; phone: string | null; address: string | null };
type UserRecord = { id: number; email: string; is_active: boolean; role: "admin" | "manager" | "user"; created_at: string; profile: Profile | null };
type ProfileForm = { name: string; phone: string; address: string };
type AccountForm = { email: string; role: UserRecord["role"]; is_active: boolean };
const emptyProfile: ProfileForm = { name: "", phone: "", address: "" };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [account, setAccount] = useState<AccountForm>({ email: "", role: "user", is_active: true });
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      setUsers(await apiRequest<UserRecord[]>("/users", { signal }));
    } catch (cause) {
      if (signal?.aborted) return;
      const text = cause instanceof Error ? cause.message : "No se pudo cargar usuarios.";
      if (isUnauthorized(cause)) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setError(text);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function selectUser(user: UserRecord) {
    setSelected(user);
    setNotice("");
    setError("");
    setAccount({ email: user.email, role: user.role, is_active: user.is_active });
    setProfile({ name: user.profile?.name ?? "", phone: user.profile?.phone ?? "", address: user.profile?.address ?? "" });
    setHasProfile(Boolean(user.profile));
    try {
      const current = await apiRequest<UserRecord>(`/users/${user.id}`);
      setSelected(current);
      setAccount({ email: current.email, role: current.role, is_active: current.is_active });
      if (current.profile) {
        setProfile({ name: current.profile.name ?? "", phone: current.profile.phone ?? "", address: current.profile.address ?? "" });
        setHasProfile(true);
      } else {
        setProfile(emptyProfile);
        setHasProfile(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el usuario.");
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<UserRecord>(`/users/${selected.id}`, {
        method: "PUT",
        body: { email: account.email, role: account.role, is_active: account.is_active },
      });
      setSelected(updated);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice("Cuenta actualizada correctamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phoneError(profile.phone)) return;
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = { name: profile.name.trim() || null, phone: normalizePhone(profile.phone), address: profile.address.trim() || null };
      const saved = await apiRequest<Profile>(`/profiles/${selected.id}`, { method: hasProfile ? "PUT" : "POST", body });
      setHasProfile(true);
      setProfile({ name: saved.name ?? "", phone: saved.phone ?? "", address: saved.address ?? "" });
      setUsers((current) => current.map((item) => item.id === selected.id ? { ...item, profile: saved } : item));
      setSelected({ ...selected, profile: saved });
      setNotice(hasProfile ? "Perfil actualizado correctamente." : "Perfil creado correctamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile() {
    if (!selected?.profile || !window.confirm("¿Eliminar el perfil de esta cuenta?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`/profiles/${selected.id}`, { method: "DELETE" });
      setHasProfile(false);
      setProfile(emptyProfile);
      setSelected({ ...selected, profile: null });
      setUsers((current) => current.map((item) => item.id === selected.id ? { ...item, profile: null } : item));
      setNotice("Perfil eliminado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el perfil.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!selected || !window.confirm(`¿Eliminar la cuenta ${selected.email} y su perfil? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`/users/${selected.id}`, { method: "DELETE" });
      setUsers((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      setNotice("Cuenta eliminada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  const input = "min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10";
  return <main className="min-h-screen bg-[#f4f8fc] px-5 py-9 text-slate-800 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">← Volver al panel</Link>
      <header className="mb-7 mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Administración</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Usuarios y perfiles</h1><p className="mt-2 text-slate-500">Gestiona las cuentas y los perfiles de HealthCore.</p></div>
        <button type="button" onClick={() => void loadUsers()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50">Actualizar lista</button>
      </header>
      {error && <p role="alert" className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Directorio <span className="ml-2 text-sm font-normal text-slate-400">{users.length}</span></h2><p className="mt-1 text-xs text-slate-500">Selecciona una cuenta para ver y administrar su información.</p></div>
          {loading ? <p role="status" className="p-6 text-sm text-slate-500">Cargando usuarios…</p> : users.length ? <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">{users.map((user) => <li key={user.id}><button type="button" onClick={() => void selectUser(user)} className={`w-full px-5 py-4 text-left transition hover:bg-blue-50 ${selected?.id === user.id ? "bg-blue-50" : ""}`}><span className="flex items-center justify-between gap-3"><span className="truncate font-semibold text-slate-800">{user.email}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold capitalize ${user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.is_active ? user.role : "inactivo"}</span></span><span className="mt-1 block text-xs text-slate-400">ID {user.id} · {user.profile?.name || "Sin perfil"}</span></button></li>)}</ul> : <p className="p-6 text-sm text-slate-500">No hay usuarios.</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {!selected ? <div className="py-10 text-center"><p className="font-semibold text-slate-700">Selecciona una cuenta</p><p className="mt-2 text-sm text-slate-500">Aquí podrás editar la cuenta y crear o actualizar su perfil.</p></div> : <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-600">Cuenta #{selected.id}</p><h2 className="mt-1 break-all text-xl font-bold text-slate-900">{selected.email}</h2></div><button type="button" disabled={busy} onClick={() => void deleteUser()} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Eliminar cuenta</button></div>
            <form onSubmit={saveUser} className="grid gap-3 border-b border-slate-100 pb-6">
              <h3 className="font-bold text-slate-800">Datos de acceso</h3>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Correo<input type="email" required value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} className={input} /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Rol<select value={account.role} onChange={(event) => setAccount({ ...account, role: event.target.value as AccountForm["role"] })} className={input}><option value="user">user</option><option value="manager">manager</option><option value="admin">admin</option></select></label><label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={account.is_active} onChange={(event) => setAccount({ ...account, is_active: event.target.checked })} />Cuenta activa</label></div>
              <button disabled={busy} className="mt-1 w-fit rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Guardar cuenta</button>
            </form>
            <form onSubmit={saveProfile} className="mt-6 grid gap-3">
              <h3 className="font-bold text-slate-800">Perfil personal</h3>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Nombre<input maxLength={200} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={input} /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono<PhoneInput type="tel" autoComplete="tel" maxLength={40} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className={input} /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Dirección<input maxLength={500} value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} className={input} /></label>
              <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">{hasProfile ? "Guardar perfil" : "Crear perfil"}</button>{hasProfile && <button type="button" disabled={busy} onClick={() => void deleteProfile()} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Eliminar perfil</button>}</div>
            </form>
          </>}
        </section>
      </div>
      <footer className="mt-7 border-t border-slate-200 pt-4 text-xs text-slate-400">HealthCore · Esta sección está disponible solo para administradores.</footer>
    </div>
  </main>;
}
