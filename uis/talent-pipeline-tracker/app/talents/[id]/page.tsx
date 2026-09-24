import TalentDetail from "./talent-detail";

export default async function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TalentDetail id={id} languageHref={`/talents/en/${encodeURIComponent(id)}`} />;
}
