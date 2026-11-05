"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const englishPublicPaths = new Set(["/en", "/en/care-request"]);

export function DocumentLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = englishPublicPaths.has(pathname) ? "en" : "es";
  }, [pathname]);

  return null;
}