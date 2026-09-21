import Link from "next/link";
import { useLanguage } from "./language-context";

type GlobalNavbarProps = {
  backLabel?: boolean;
  languageHref?: string;
};

/** Shared HealthCore navigation used by every Next.js talent page. */
export default function GlobalNavbar({ backLabel = false, languageHref }: GlobalNavbarProps) {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const homePage = isEnglish ? "/index.en.html" : "/index.html";
  const talentPath = backLabel ? (isEnglish ? "/talents/en" : "/talents") : "/talents/new";
  const alternateLanguageHref = languageHref ?? (isEnglish ? "/talents" : "/talents/en");

  const pipelineLabel = backLabel
    ? (isEnglish ? "Back to pipeline" : "Volver al pipeline")
    : (isEnglish ? "New talents" : "Nuevos talentos");

  return (
    <header className="fixed left-0 top-0 z-50 w-full bg-white/90 shadow-sm backdrop-blur-md" role="banner">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 lg:px-8">
        <Link className="flex items-center gap-2" href={homePage} aria-label={isEnglish ? "HealthCore - Go to homepage" : "HealthCore - Ir al inicio"}>
          <span className="text-2xl" aria-hidden="true">🏥</span>
          <span className="text-xl font-bold tracking-tight text-[#2563EB]">
            Health<span className="text-teal-500">Core</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label={isEnglish ? "Main navigation" : "Navegación principal"}>
          <Link className="text-sm font-medium text-[#1F2937]/70 transition-colors duration-200 hover:text-[#2563EB]" href={`${homePage}#features`}>{isEnglish ? "Features" : "Características"}</Link>
          <Link className="text-sm font-medium text-[#1F2937]/70 transition-colors duration-200 hover:text-[#2563EB]" href={`${homePage}#contact`}>{isEnglish ? "Contact" : "Contacto"}</Link>
          <Link className="text-sm font-medium text-[#1F2937]/70 transition-colors duration-200 hover:text-[#2563EB]" href={talentPath}>{pipelineLabel}</Link>
          <Link className="flex items-center gap-1.5 rounded-lg border border-[#1F2937]/20 px-3 py-1.5 text-sm font-semibold text-[#1F2937]/70 transition-all duration-200 hover:border-[#2563EB]/40 hover:text-[#2563EB]" href={alternateLanguageHref} lang={isEnglish ? "es" : "en"}>
            <span aria-hidden="true">🌐</span>{isEnglish ? "ES" : "EN"}
          </Link>
          <Link className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-[#1d4ed8]" href={isEnglish ? "/aplication.en.html" : "/aplication.html"}>
            {isEnglish ? "Request Care" : "Solicitar Atención"}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link className="rounded-lg border border-[#1F2937]/20 px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]/70" href={alternateLanguageHref} lang={isEnglish ? "es" : "en"}>
            🌐 {isEnglish ? "ES" : "EN"}
          </Link>
          <Link className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20" href={isEnglish ? "/aplication.en.html" : "/aplication.html"}>
            {isEnglish ? "Request" : "Solicitar"}
          </Link>
          <Link className="rounded-lg border border-[#2563EB]/30 px-3 py-2 text-xs font-semibold text-[#2563EB]" href={talentPath}>
            {backLabel ? "Pipeline" : (isEnglish ? "Talents" : "Talentos")}
          </Link>
        </div>
      </div>
    </header>
  );
}