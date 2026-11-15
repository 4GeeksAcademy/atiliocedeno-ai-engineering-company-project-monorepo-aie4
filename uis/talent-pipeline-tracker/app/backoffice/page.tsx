import { headers } from "next/headers";
import BackofficeWorkspace from "./workspace";

export async function generateMetadata() {
  const language = (await headers()).get("x-healthcore-language");
  return language === "en"
    ? { title: "HealthCore Digital | Operations", description: "Protected HealthCore internal operations workspace." }
    : { title: "HealthCore Digital | Operaciones", description: "Espacio interno protegido de operaciones de HealthCore." };
}

export default function BackofficePage() {
  return <BackofficeWorkspace />;
}
