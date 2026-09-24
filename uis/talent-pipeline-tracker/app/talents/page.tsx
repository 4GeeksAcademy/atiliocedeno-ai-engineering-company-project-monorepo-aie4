import TalentPipeline from "./talent-pipeline";
import { Suspense } from "react";

export default function TalentsPage() {
  return <Suspense fallback={<main>Cargando talentos...</main>}><TalentPipeline /></Suspense>;
}
