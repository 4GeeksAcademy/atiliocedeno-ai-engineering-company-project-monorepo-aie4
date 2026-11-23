"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authRequest } from "../auth/session";
import { useLanguage } from "../components/language-context";
import BrandLogo from "../components/brand-logo";

export default function ForgotPasswordPage() {
  const en = useLanguage().language === "en";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await authRequest("/auth/forgot-password", { email }, "");
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : en
        ? "Unable to request a reset link. Try again."
        : "No se pudo solicitar el enlace. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fc] px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-lg">
      <BrandLogo className="mb-12" />
      <h1 className="mb-3 text-3xl font-bold text-slate-900">{en ? "Forgot your password?" : "¿Olvidaste tu contraseña?"}</h1>
      {submitted ? (
        <section role="status" className="rounded-xl bg-blue-50 p-5 text-slate-700">
          {en ? "If an account exists for that email, you will receive a password reset link." : "Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña."}
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <p className="text-slate-600">{en ? "Enter the email address associated with your account." : "Escribe el correo asociado a tu cuenta."}</p>
          <label className="grid gap-1 font-medium" htmlFor="email">{en ? "Email address" : "Correo electrónico"}
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? (en ? "Sending…" : "Enviando…") : (en ? "Send link" : "Enviar enlace")}</button>
        </form>
      )}
      <Link className="mt-6 inline-block text-blue-700 underline" href="/login">{en ? "Back to sign in" : "Volver a iniciar sesión"}</Link>
      </div>
    </main>
  );
}
