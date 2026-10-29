"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authRequest } from "../auth/session";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authRequest("/auth/forgot-password", { email }, "");
    } catch {
      // Keep the confirmation neutral, including when the API cannot be reached.
    } finally {
      setSubmitted(true);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h1>
      {submitted ? (
        <section role="status" className="rounded-xl bg-blue-50 p-5 text-slate-700">
          Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <p className="text-slate-600">Escribe el correo asociado a tu cuenta.</p>
          <label className="grid gap-1 font-medium" htmlFor="email">Correo electrónico
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "Enviar enlace"}</button>
        </form>
      )}
      <Link className="mt-6 inline-block text-blue-700 underline" href="/login">Volver a iniciar sesión</Link>
    </main>
  );
}
