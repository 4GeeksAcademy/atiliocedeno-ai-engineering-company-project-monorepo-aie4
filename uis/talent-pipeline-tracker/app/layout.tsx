import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { headers } from "next/headers";
import { LanguageProvider } from "./components/language-context";
import { DocumentLanguage } from "./document-language";

export const metadata: Metadata = {
  title: "HealthCore Digital",
  description: "Herramientas internas de HealthCore Digital.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const language = requestHeaders.get("x-healthcore-language") === "en" ? "en" : "es";

  return (
    <html lang={language}>
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" strategy="beforeInteractive" />
      </head>
      <body><DocumentLanguage /><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
