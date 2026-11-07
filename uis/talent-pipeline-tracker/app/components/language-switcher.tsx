"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLanguage, type AppLanguage } from "./language-context";

function counterpart(pathname: string, language: AppLanguage): string | null {
  if (pathname === "/" || pathname === "/en") return language === "en" ? "/en" : "/";
  if (pathname === "/care-request" || pathname === "/en/care-request") return language === "en" ? "/en/care-request" : "/care-request";
  if (pathname === "/talents" || pathname === "/talents/en") return language === "en" ? "/talents/en" : "/talents";
  if (pathname === "/talents/new" || pathname === "/talents/en/new") return language === "en" ? "/talents/en/new" : "/talents/new";

  const talentMatch = pathname.match(/^\/talents\/(en\/)?([^/]+)$/);
  if (talentMatch) {
    const id = talentMatch[2];
    return language === "en" ? `/talents/en/${id}` : `/talents/${id}`;
  }
  return null;
}

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const nextLanguage: AppLanguage = language === "en" ? "es" : "en";
  const label = language === "en" ? "Switch to Spanish" : "Cambiar a inglés";
  const isPublicOrTalentRoute = pathname === "/" || pathname === "/en" || pathname.startsWith("/en/") ||
    pathname === "/care-request" || pathname === "/talents" || pathname.startsWith("/talents/");

  // Public landing/care pages and Talent pages have an equivalent control in their header.
  const hasHeaderLanguageControl = pathname === "/" || pathname === "/en" || pathname.startsWith("/en/") ||
    pathname === "/care-request" || pathname === "/talents" || pathname.startsWith("/talents/");
  if (hasHeaderLanguageControl) return null;

  function routeTarget(language: AppLanguage): string | null {
    if (pathname === "/care-request") return language === "en" ? "/en/care-request" : "/care-request";
    if (pathname === "/talents" || pathname === "/talents/en") return language === "en" ? "/talents/en" : "/talents";
    if (pathname === "/talents/new" || pathname === "/talents/en/new") return language === "en" ? "/talents/en/new" : "/talents/new";
    const talentMatch = pathname.match(/^\/talents\/(en\/)?([^/]+)$/);
    if (talentMatch) return language === "en" ? `/talents/en/${talentMatch[2]}` : `/talents/${talentMatch[2]}`;
    if (pathname === "/" || pathname === "/en" || pathname.startsWith("/en/")) return language === "en" ? "/en" : "/";
    return counterpart(pathname, language);
  }

  function switchLanguage() {
    setLanguage(nextLanguage);
    const target = routeTarget(nextLanguage);
    if (target && target !== pathname) router.push(target);
    else if (isPublicOrTalentRoute) router.push(nextLanguage === "en" ? "/en" : "/");
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-[100] inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-4 py-2.5 text-sm font-bold text-blue-800 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
    >
      <span aria-hidden="true">🌐</span>{language === "en" ? "ES" : "EN"}
    </button>
  );
}
