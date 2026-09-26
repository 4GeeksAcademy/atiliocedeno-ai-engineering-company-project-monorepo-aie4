import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { LanguageProvider } from "./components/language-context";

export const metadata: Metadata = {
  title: "HealthCore Digital",
  description: "Herramientas internas de HealthCore Digital.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" strategy="beforeInteractive" />
      </head>
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
