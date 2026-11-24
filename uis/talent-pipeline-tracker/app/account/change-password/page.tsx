"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-context";
import { authRequest, getAccessToken, apiRequest, isUnauthorized, clearAccessToken } from "../../auth/session";

export default function ChangePasswordPage() {
  const en = useLanguage().language === "en";
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setVerified(false);
    setError("");
    if (!getAccessToken()) { router.replace("/login"); return; }
    apiRequest("/auth/me", {signal:controller.signal}).then(() => { if (!controller.signal.aborted) setVerified(true); }).catch(cause => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(cause)) { clearAccessToken(); router.replace("/login"); }
      else { setError(cause instanceof Error ? cause.message : (en ? "Unable to verify your session. Try again." : "No se pudo verificar la sesión.")); }
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [router, verificationAttempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking || !verified) return;
    setMessage("");
    setError("");
    if (newPassword !== confirm) {
      setError((en ? "The new passwords do not match." : "Las contraseñas nuevas no coinciden."));
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError((en ? "Sign in to change your password." : "Inicia sesión para cambiar tu contraseña."));
      return;
    }
    setBusy(true);
    try {
      await authRequest("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      }, token);
      setMessage(en ? "Password updated successfully." : "Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (cause) {
      if (isUnauthorized(cause)) { clearAccessToken(); router.replace("/login"); return; }
      setError(cause instanceof Error ? cause.message : (en ? "Unable to change your password. Try again." : "No se pudo cambiar la contraseña."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fc] px-6 py-10 text-slate-800"><div className="mx-auto max-w-lg">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">{en ? "Change password" : "Cambiar contraseña"}</h1>
      {checking && <p role="status">{en ? "Checking your session…" : "Verificando sesión…"}</p>}
      {!checking && !verified && <button type="button" onClick={() => setVerificationAttempt(attempt => attempt + 1)} className="text-blue-700 underline">{en ? "Check session again" : "Reintentar verificación"}</button>}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1 font-medium" htmlFor="current-password">{en ? "Current password" : "Contraseña actual"}
          <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="new-password">{en ? "New password" : "Nueva contraseña"}
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="confirm-password">{en ? "Confirm new password" : "Confirmar nueva contraseña"}
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {message && <p role="status" className="text-green-700">{message}</p>}
        <button disabled={busy || checking || !verified} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? (en ? "Saving…" : "Guardando…") : (en ? "Change password" : "Cambiar contraseña")}</button>
      </form>
      <Link className="mt-6 inline-block text-blue-700 underline" href="/dashboard">{en ? "Back to dashboard" : "Volver al panel"}</Link>
    </div></main>
  );
}
