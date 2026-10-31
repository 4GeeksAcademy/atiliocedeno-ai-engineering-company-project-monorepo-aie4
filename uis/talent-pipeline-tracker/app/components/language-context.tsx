"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type AppLanguage = "es" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function languageFromPath(pathname: string | null): AppLanguage | null {
  if (pathname === "/en" || pathname?.startsWith("/en/") || pathname?.startsWith("/talents/en")) return "en";
  if (pathname === "/" || pathname === "/care-request" || pathname === "/talents") return "es";
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => languageFromPath(pathname) ?? "es");

  useEffect(() => {
    setLanguage(languageFromPath(pathname) ?? (sessionStorage.getItem("healthcore_language") === "en" ? "en" : "es"));
  }, [pathname]);

  useEffect(() => { document.documentElement.lang = language; sessionStorage.setItem("healthcore_language", language); }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
