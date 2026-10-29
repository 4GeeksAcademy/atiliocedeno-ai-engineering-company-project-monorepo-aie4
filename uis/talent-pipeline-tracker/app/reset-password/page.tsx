"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { authRequest } from "../auth/session";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("El enlace no contiene un token de recuperación. Solicita uno nuevo.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await authRequest("/auth/reset-password", { token, new_password: password });
      router.push("/login?passwordReset=success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "El enlace es inválido, expiró o ya fue utilizado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">Restablecer contraseña</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1 font-medium" htmlFor="new-password">Nueva contraseña
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="confirm-password">Confirmar nueva contraseña
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Guardando…" : "Guardar contraseña"}</button>
      </form>
      {error && <Link className="mt-5 inline-block text-blue-700 underline" href="/forgot-password">Solicitar otro enlace</Link>}
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="p-8">Cargando…</main>}><ResetPasswordForm /></Suspense>;
}
