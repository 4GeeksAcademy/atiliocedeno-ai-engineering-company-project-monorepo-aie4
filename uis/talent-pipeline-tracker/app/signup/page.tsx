"use client";
import { PhoneInput } from "../components/phone-input";
import { phoneError, normalizePhone } from "../auth/phone";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { apiRequest } from "../auth/session";

type SignupResult = { id: number; email: string; profile: { name: string | null } | null };

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (busy || phoneError(phone)) return;
    setBusy(true);
    try {
      await apiRequest<SignupResult>("/users", {
        method: "POST",
        token: "",
        body: {
          email,
          password,
          profile: { name: name.trim() || null, phone: normalizePhone(phone), address: address.trim() || null },
        },
      });
      router.push("/login?registered=success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  const field = "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
  const label = "grid gap-2 text-sm font-semibold text-slate-700";

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#f4f8fc] px-5 py-12 text-slate-800">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-teal-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-100/70 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_-40px_rgba(15,45,85,0.35)] lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1558c0] via-[#176bc9] to-[#13a994] p-12 text-white lg:flex">
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/15" />
          <Link href="/" className="relative inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl">✚</span><span>Health<span className="text-teal-200">Core</span></span></Link>
          <div className="relative"><p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-teal-100">Tu salud, conectada</p><h1 className="text-5xl font-bold leading-tight">Crea tu espacio HealthCore.</h1><p className="mt-6 max-w-md text-lg leading-8 text-blue-50/90">Un acceso seguro a la información de tu cuenta y tus servicios de atención.</p></div>
          <p className="relative text-sm text-blue-50/75">La cuenta se registra con el rol estándar de usuario.</p>
        </section>
        <section className="px-6 py-9 sm:px-12 lg:px-14 lg:py-12">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#2563EB] lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50">✚</span>Health<span className="-ml-2 text-teal-500">Core</span></Link>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Crear cuenta</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Regístrate en HealthCore</h2>
          <p className="mt-2 text-slate-500">Completa tus datos para crear tu cuenta y perfil.</p>
          <form onSubmit={handleSubmit} className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`} htmlFor="email">Correo electrónico<input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" className={field} /></label>
            <label className={`${label} sm:col-span-2`} htmlFor="password">Contraseña<input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Al menos 8 caracteres" className={field} /></label>
            <label className={label} htmlFor="name">Nombre<input id="name" autoComplete="name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className={field} /></label>
            <label className={label} htmlFor="phone">Teléfono<PhoneInput id="phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className={field} /></label>
            <label className={`${label} sm:col-span-2`} htmlFor="address">Dirección<input id="address" autoComplete="street-address" maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className={field} /></label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
            <button disabled={busy} className="mt-1 min-h-12 rounded-xl bg-[#2563EB] px-5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{busy ? "Creando cuenta…" : "Crear cuenta"}</button>
          </form>
          <p className="mt-6 text-sm text-slate-500">¿Ya tienes una cuenta? <Link className="font-bold text-blue-700 hover:text-blue-900" href="/login">Inicia sesión</Link></p>
        </section>
      </div>
    </main>
  );
}
