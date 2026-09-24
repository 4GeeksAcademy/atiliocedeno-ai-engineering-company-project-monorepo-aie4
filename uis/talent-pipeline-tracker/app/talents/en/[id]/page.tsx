import TalentDetail from "../../[id]/talent-detail";

export default async function EnglishTalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TalentDetail languageHref={`/talents/${encodeURIComponent(id)}`} id={id} />;
}