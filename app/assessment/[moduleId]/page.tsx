import AssessmentStudio from "@/components/assessment-studio";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  return <AssessmentStudio moduleId={Number(moduleId)} />;
}
