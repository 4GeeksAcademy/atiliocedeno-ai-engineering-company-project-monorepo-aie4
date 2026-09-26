import TalentPipeline from "../talent-pipeline";
import { Suspense } from "react";

export default function EnglishTalentPipelinePage() {
  return <Suspense fallback={<main>Loading talents...</main>}><TalentPipeline /></Suspense>;
}