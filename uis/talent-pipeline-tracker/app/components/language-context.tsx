"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type AppLanguage = "es" | "en";
const LANGUAGE_COOKIE = "healthcore_language";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function languageFromPath(pathname: string | null): AppLanguage | null {
  if (pathname === "/en" || pathname?.startsWith("/en/") || pathname === "/talents/en" || pathname?.startsWith("/talents/en/")) return "en";
  if (pathname === "/" || pathname === "/care-request" || (pathname === "/talents" || pathname?.startsWith("/talents/"))) return "es";
  return null;
}

export function LanguageProvider({ children, initialLanguage = "es" }: { children: ReactNode; initialLanguage?: AppLanguage }) {
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => languageFromPath(pathname) ?? initialLanguage);

  useEffect(() => {
    const routeLanguage = languageFromPath(pathname);
    const storedLanguage = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${LANGUAGE_COOKIE}=`))?.split("=")[1]
      ?? sessionStorage.getItem(LANGUAGE_COOKIE);
    setLanguage(routeLanguage ?? (storedLanguage === "en" ? "en" : "es"));
  }, [pathname]);

  useEffect(() => {
    document.documentElement.lang = language;
    sessionStorage.setItem(LANGUAGE_COOKIE, language);
    document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [language]);

  const updateLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    if (typeof document !== "undefined") {
      sessionStorage.setItem(LANGUAGE_COOKIE, nextLanguage);
      document.cookie = `${LANGUAGE_COOKIE}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  };

  const value = useMemo(() => ({ language, setLanguage: updateLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
