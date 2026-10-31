"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { authRequest, getAccessToken, apiRequest, isUnauthorized, clearAccessToken } from "../../auth/session";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    if (!getAccessToken()) { router.replace("/login"); return; }
    apiRequest("/auth/me", {signal:controller.signal}).then(() => setChecking(false)).catch(cause => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(cause)) { clearAccessToken(); router.replace("/login"); }
      else { setError(cause instanceof Error ? cause.message : "No se pudo verificar la sesión."); }
    });
    return () => controller.abort();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    setMessage("");
    setError("");
    if (newPassword !== confirm) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError("Inicia sesión para cambiar tu contraseña.");
      return;
    }
    setBusy(true);
    try {
      const result = await authRequest<{ message: string }>("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      }, token);
      setMessage(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (cause) {
      if (isUnauthorized(cause)) { clearAccessToken(); router.replace("/login"); return; }
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">Cambiar contraseña</h1>
      {checking && <p role="status">Verificando sesión…</p>}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1 font-medium" htmlFor="current-password">Contraseña actual
          <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="new-password">Nueva contraseña
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="confirm-password">Confirmar nueva contraseña
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {message && <p role="status" className="text-green-700">{message}</p>}
        <button disabled={busy || checking} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Guardando…" : "Cambiar contraseña"}</button>
      <Link href="/dashboard" className="text-blue-700 underline">Cancelar</Link>
      </form>
      <Link className="mt-6 inline-block text-blue-700 underline" href="/dashboard">Volver al panel</Link>
    </main>
  );
}
