import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "HealthCore" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const language = (await headers()).get("x-healthcore-language") === "en" ? "en" : "es";
  return (
    <html lang={language}>
      <head><Script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" strategy="beforeInteractive" /></head>
      <body>{children}</body>
    </html>
  );
}
