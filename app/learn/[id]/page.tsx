import Link from "next/link";
import { notFound } from "next/navigation";
import LessonExperience from "@/components/lesson-experience";
import { courseModules, getModule } from "@/lib/course";
import { getCurrentUser } from "@/lib/auth";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const module = getModule(Number(id));
  if (!module) notFound();

  const freeLimit = Math.max(1, Number(process.env.FREE_MODULE_LIMIT || "5"));
  const user = await getCurrentUser();
  const hasPremiumAccess =
    module.id <= freeLimit ||
    user?.role === "admin" ||
    user?.role === "instructor" ||
    user?.plan === "masterclass" ||
    user?.entitlements.includes("academy");

  if (!hasPremiumAccess) {
    return (
      <main className="commercialPage lockedLesson">
        <section className="commercialHero">
          <span className="eyebrow">PREMIUM MASTERY MODULE · {module.phase}</span>
          <h1>{module.title}</h1>
          <p>
            The first {freeLimit} modules are available as the foundation experience.
            This module belongs to the full commercial Master Class and unlocks with
            verified learner access.
          </p>
        </section>
        <section className="commercialSection">
          <span className="eyebrow">BUILD CHALLENGE PREVIEW</span>
          <h2>{module.challenge}</h2>
          <div className="actionRow">
            {!user && <Link className="secondaryButton" href="/login">Sign in</Link>}
            <Link className="primaryButton inlineButton" href="/pricing">Unlock Full Master Class →</Link>
          </div>
        </section>
      </main>
    );
  }

  return <LessonExperience module={module} total={courseModules.length} />;
}
