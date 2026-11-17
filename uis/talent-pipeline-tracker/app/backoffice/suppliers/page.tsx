import { headers } from "next/headers";
import SuppliersDirectory from "./suppliers-directory";

export async function generateMetadata() {
  const language = (await headers()).get("x-healthcore-language");
  return language === "en"
    ? { title: "HealthCore Digital | Suppliers", description: "Protected HealthCore supplier directory." }
    : { title: "HealthCore Digital | Proveedores", description: "Directorio protegido de proveedores de HealthCore." };
}

export default function SuppliersPage() {
  return <SuppliersDirectory />;
}
