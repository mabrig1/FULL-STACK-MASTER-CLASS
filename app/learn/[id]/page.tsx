import { notFound } from "next/navigation";
import LessonExperience from "@/components/lesson-experience";
import { courseModules, getModule } from "@/lib/course";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const module = getModule(Number(id));

  if (!module) notFound();

  return <LessonExperience module={module} total={courseModules.length} />;
}
