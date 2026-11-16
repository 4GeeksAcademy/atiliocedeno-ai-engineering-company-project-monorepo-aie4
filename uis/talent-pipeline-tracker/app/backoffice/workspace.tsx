"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../components/language-context";
import "./backoffice.css";

export default function BackofficeWorkspace() {
  const isEn = useLanguage().language === "en";
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#incident-analysis") router.replace("/backoffice/incidents");
  }, [router]);
  return (
    <div className="backoffice-shell">
      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">HealthCore Digital</span><span className="breadcrumb"> / {isEn ? "Operations overview" : "Resumen de operaciones"}</span></div>
          <div className="topbar-actions"><span className="secure-label">◈ {isEn ? "Secure internal view" : "Vista interna segura"}</span><span className="avatar">HC</span></div>
        </header>
        <div className="content-wrap">
          <section className="welcome" aria-labelledby="page-title">
            <div><p className="eyebrow accent">{isEn ? "Monday, operations overview" : "Lunes, resumen de operaciones"}</p><h1 id="page-title">{isEn ? "Welcome to the HealthCore workspace." : "Te damos la bienvenida al espacio HealthCore."}</h1><p className="intro">{isEn ? "A shared starting point for the teams modernizing care across our 12 clinics." : "Un punto de partida común para los equipos que modernizan la atención en nuestras 12 clínicas."}</p></div>
            <div className="welcome-badge"><span className="pulse" /><span>{isEn ? "Digital transformation" : "Transformación digital"}<br /><strong>{isEn ? "in progress" : "en curso"}</strong></span></div>
          </section>
          <section className="metric-grid" aria-label={isEn ? "HealthCore business metrics" : "Métricas de HealthCore"}>
            <article className="metric-card"><span className="metric-icon blue">⌂</span><span className="metric-label">{isEn ? "Clinic network" : "Red de clínicas"}</span><strong>12</strong><span className="metric-detail">{isEn ? "9 US · 3 UK locations" : "9 en EE. UU. · 3 en Reino Unido"}</span></article>
            <article className="metric-card"><span className="metric-icon teal">♙</span><span className="metric-label">{isEn ? "People" : "Personas"}</span><strong>200</strong><span className="metric-detail">{isEn ? "Across two countries" : "En dos países"}</span></article>
            <article className="metric-card"><span className="metric-icon violet">$</span><span className="metric-label">{isEn ? "Annual revenue" : "Ingresos anuales"}</span><strong>$28M</strong><span className="metric-detail">{isEn ? "Approximate network total" : "Total aproximado de la red"}</span></article>
            <article className="metric-card alert-card"><span className="metric-icon coral">!</span><span className="metric-label">{isEn ? "No-show rate" : "Tasa de inasistencia"}</span><strong>22%</strong><span className="metric-detail">{isEn ? "Priority for patient access" : "Prioridad para el acceso de pacientes"}</span></article>
          </section>
          <section className="section-grid" id="operations">
            <article className="panel operations-panel"><div className="panel-heading"><div><p className="eyebrow">{isEn ? "Company snapshot" : "Panorama de la organización"}</p><h2>{isEn ? "Where attention is needed" : "Áreas que requieren atención"}</h2></div><span className="panel-status">{isEn ? "Planning view" : "Vista de planificación"}</span></div>
              <div className="bar-row"><div className="bar-label"><span>{isEn ? "Claims rejection" : "Rechazo de reclamaciones"}</span><strong>14%</strong></div><div className="bar-track"><span className="bar-fill coral-fill" style={{ width: "56%" }} /></div><small>{isEn ? "Revenue Cycle & Billing" : "Ciclo de ingresos y facturación"}</small></div>
              <div className="bar-row"><div className="bar-label"><span>{isEn ? "Clinical documentation overhead" : "Tiempo dedicado a documentación clínica"}</span><strong>35 {isEn ? "min/day" : "min/día"}</strong></div><div className="bar-track"><span className="bar-fill blue-fill" style={{ width: "72%" }} /></div><small>{isEn ? "Clinical Operations" : "Operaciones clínicas"}</small></div>
              <div className="bar-row"><div className="bar-label"><span>{isEn ? "Average clinical hiring time" : "Tiempo promedio de contratación clínica"}</span><strong>47 {isEn ? "days" : "días"}</strong></div><div className="bar-track"><span className="bar-fill teal-fill" style={{ width: "64%" }} /></div><small>{isEn ? "People & Workforce" : "Personas y equipo"}</small></div>
            </article>
            <article className="panel priorities-panel" id="compliance"><div className="panel-heading"><div><p className="eyebrow">{isEn ? "Digital priorities" : "Prioridades digitales"}</p><h2>{isEn ? "Building with care" : "Construimos con cuidado"}</h2></div><span className="shield">◇</span></div>
              <ul className="priority-list"><li><span className="check">✓</span><span><strong>{isEn ? "One operational view" : "Una sola vista operativa"}</strong><small>{isEn ? "Bring cross-clinic signals together." : "Unimos las señales de todas las clínicas."}</small></span></li><li><span className="check">✓</span><span><strong>{isEn ? "Patient-centered access" : "Acceso centrado en el paciente"}</strong><small>{isEn ? "Reduce missed appointments and friction." : "Reducimos las citas perdidas y las barreras."}</small></span></li><li><span className="check">✓</span><span><strong>{isEn ? "Privacy by design" : "Privacidad desde el diseño"}</strong><small>{isEn ? "Work within HIPAA and UK GDPR." : "Cumplimos con HIPAA y UK GDPR."}</small></span></li></ul>
            </article>
          </section>
          <section className="footer-callout" id="people"><span className="callout-icon">✦</span><div><strong>{isEn ? "HealthCore Digital connects the people behind the care." : "HealthCore Digital conecta a las personas que hacen posible la atención."}</strong><span>{isEn ? "This internal view is a foundation for future operational tools and shared intelligence." : "Esta vista interna sienta las bases para futuras herramientas operativas e inteligencia compartida."}</span></div><span className="arrow">→</span></section>

        </div>
        <footer>{isEn ? "HealthCore Digital · Internal operations workspace" : "HealthCore Digital · Espacio interno de operaciones"}<span>{isEn ? "Built for secure, human-centered healthcare operations" : "Diseñado para operaciones sanitarias seguras y centradas en las personas"}</span></footer>
      </main>
    </div>
  );
}
