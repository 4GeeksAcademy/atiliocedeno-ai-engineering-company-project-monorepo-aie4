"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { authRequest, saveAccessToken, apiRequest, getAccessToken, clearAccessToken, isUnauthorized, accountDestination, type Account } from "../auth/session";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) return;
    const controller = new AbortController();
    apiRequest<Account>("/auth/me", {signal: controller.signal}).then(account => router.replace(accountDestination(account))).catch(error => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(error)) clearAccessToken();
    });
    return () => controller.abort();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await authRequest<{ access_token: string }>("/auth/login", { email, password }, "");
      saveAccessToken(result.access_token);
      const account = await apiRequest<Account>("/auth/me", {token: result.access_token});
      router.replace(accountDestination(account));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#f4f8fc] px-5 py-12 text-slate-800">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-teal-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-100/70 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_-40px_rgba(15,45,85,0.35)] lg:min-h-[640px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1558c0] via-[#176bc9] to-[#13a994] p-12 text-white lg:flex">
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/15" />
          <div className="absolute -right-8 top-36 h-52 w-52 rounded-full border border-white/15" />
          <Link href="/" className="relative inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl">✚</span>
            <span>Health<span className="text-teal-200">Core</span></span>
          </Link>
          <div className="relative max-w-lg">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-teal-100">Cuidado conectado</p>
            <h2 className="text-5xl font-bold leading-[1.08]">La salud, mejor cuando está en buenas manos.</h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-blue-50/90">Accede a tu espacio seguro y mantén tu información de atención organizada en un solo lugar.</p>
          </div>
          <p className="relative text-sm text-blue-50/75">© {new Date().getFullYear()} HealthCore Digital</p>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#2563EB] lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">✚</span>
              <span>Health<span className="text-teal-500">Core</span></span>
            </Link>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Portal HealthCore</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Te damos la bienvenida</h1>
            <p className="mt-3 text-slate-500">Inicia sesión para continuar a tu panel de control.</p>
            {params.get("registered") === "success" && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Cuenta creada correctamente. Ya puedes iniciar sesión.</p>}
            {params.get("passwordReset") === "success" && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Tu contraseña se restableció correctamente. Inicia sesión con la nueva contraseña.</p>}
            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="email">Correo electrónico
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="password">Contraseña
                <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="mt-1 min-h-12 rounded-xl bg-[#2563EB] px-5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{busy ? "Ingresando…" : "Ingresar a mi cuenta"}</button>
            </form>
            <Link className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900" href="/forgot-password">¿Olvidaste tu contraseña?</Link>
            <p className="mt-5 text-sm text-slate-500">¿Aún no tienes una cuenta? <Link href="/signup" className="font-bold text-blue-700 hover:text-blue-900">Regístrate</Link></p>
            <p className="mt-10 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">Tu información está protegida y solo se utiliza para brindarte una mejor experiencia de atención.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="p-8">Cargando…</main>}><LoginForm /></Suspense>;
}
