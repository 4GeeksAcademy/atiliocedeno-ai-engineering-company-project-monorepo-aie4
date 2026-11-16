"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./brand-logo";
import { useLanguage } from "./language-context";
import { clearAccessToken } from "../auth/session";

export default function PrivateNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const en = useLanguage().language === "en";
  const links = [
    ["/dashboard", en ? "Dashboard" : "Panel de control"],
    ["/backoffice", en ? "Operations" : "Operaciones"],
    [en ? "/talents/en" : "/talents", en ? "Talent pipeline" : "Nuevos talentos"],
    ["/backoffice/incidents", en ? "Incident analysis" : "Análisis de incidentes"],
    ["/backoffice/suppliers", en ? "Suppliers" : "Proveedores"],
    ["/account/profile", en ? "My profile" : "Mi perfil"],
    ["/account/change-password", en ? "Change password" : "Cambiar contraseña"],
  ];
  if (isAdmin) links.push(["/admin/users", en ? "Users" : "Usuarios"]);

  return <aside className="private-sidebar">
    <BrandLogo href="/dashboard" inverse ariaLabel={en ? "HealthCore dashboard" : "Panel de HealthCore"} />
    <nav aria-label={en ? "Internal navigation" : "Navegación interna"}>
      {links.map(([href, label]) => {
        const active = pathname === href || (href.startsWith("/talents") && pathname.startsWith("/talents/"));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
    <button type="button" onClick={() => {
      clearAccessToken();
      window.location.replace("/login");
    }}>{en ? "Sign out" : "Salir"}</button>
  </aside>;
}
