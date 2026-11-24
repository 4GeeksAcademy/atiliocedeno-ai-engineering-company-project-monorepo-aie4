"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { authRequest, hasStatus } from "../auth/session";
import { useLanguage } from "../components/language-context";
import BrandLogo from "../components/brand-logo";

function ResetPasswordForm() {
  const en = useLanguage().language === "en";
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [validation, setValidation] = useState<{ token: string; status: "checking" | "valid" | "invalid" | "unavailable" }>({ token, status: "checking" });

  useEffect(() => {
    if (!token) {
      setValidation({ token, status: "invalid" });
      return;
    }
    let active = true;
    setValidation({ token, status: "checking" });
    authRequest("/auth/reset-password/validate", { token }, "")
      .then(() => { if (active) setValidation({ token, status: "valid" }); })
      .catch((cause) => {
        if (active) setValidation({ token, status: hasStatus(cause, 400) || hasStatus(cause, 422) ? "invalid" : "unavailable" });
      });
    return () => { active = false; };
  }, [token, retry]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || validation.token !== token || validation.status !== "valid") return;
    setError("");
    if (!token) {
      setError((en ? "This reset link is incomplete. Request a new one." : "El enlace no contiene un token de recuperación. Solicita uno nuevo."));
      return;
    }
    if (password !== confirm) {
      setError((en ? "The passwords do not match." : "Las contraseñas no coinciden."));
      return;
    }
    setBusy(true);
    try {
      await authRequest("/auth/reset-password", { token, new_password: password }, "");
      router.push("/login?passwordReset=success");
    } catch (cause) {
      if (hasStatus(cause, 400)) {
        setValidation({ token, status: "invalid" });
      } else {
        setError(cause instanceof Error ? cause.message : (en ? "Unable to save the password. Try again." : "No se pudo guardar la contraseña."));
      }
    } finally {
      setBusy(false);
    }
  }

  if (validation.token !== token || validation.status !== "valid") {
    const checking = validation.token !== token || validation.status === "checking";
    return (
      <main className="min-h-screen bg-[#f4f8fc] px-6 py-10 text-slate-800"><div className="mx-auto max-w-lg"><BrandLogo className="mb-12" />
        <h1 className="mb-3 text-3xl font-bold text-slate-900">{en ? "Reset password" : "Restablecer contraseña"}</h1>
        <p role="status">{checking ? (en ? "Checking link…" : "Verificando enlace…") : validation.status === "invalid" ? (en ? "This link is invalid, expired or already used." : "El enlace es inválido, ha caducado o ya fue utilizado.") : (en ? "Unable to verify the link. Try again in a moment." : "No se pudo verificar el enlace. Inténtalo de nuevo más tarde.")}</p>
        {!checking && validation.status === "unavailable" && <button type="button" className="mr-4 text-blue-700 underline" onClick={() => setRetry(value => value + 1)}>{en ? "Check link again" : "Volver a verificar el enlace"}</button>}
        {!checking && <Link className="mt-5 inline-block text-blue-700 underline" href="/forgot-password">{en ? "Request another link" : "Solicitar otro enlace"}</Link>}
      </div></main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fc] px-6 py-10 text-slate-800"><div className="mx-auto max-w-lg"><BrandLogo className="mb-12" />
      <h1 className="mb-3 text-3xl font-bold text-slate-900">{en ? "Reset password" : "Restablecer contraseña"}</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1 font-medium" htmlFor="new-password">{en ? "New password" : "Nueva contraseña"}
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 font-medium" htmlFor="confirm-password">{en ? "Confirm new password" : "Confirmar nueva contraseña"}
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? (en ? "Saving…" : "Guardando…") : (en ? "Save password" : "Guardar contraseña")}</button>
      </form>
      {error && <Link className="mt-5 inline-block text-blue-700 underline" href="/forgot-password">{en ? "Request another link" : "Solicitar otro enlace"}</Link>}
    </div></main>
  );
}

export default function ResetPasswordPage() {
  const en = useLanguage().language === "en";
  return <Suspense fallback={<main className="p-8">{en ? "Loading…" : "Cargando…"}</main>}><ResetPasswordForm /></Suspense>;
}
