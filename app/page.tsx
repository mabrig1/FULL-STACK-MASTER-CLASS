import Link from "next/link";
import { courseModules, phases } from "@/lib/course";
import HomeShowcase from "@/components/home-showcase";

const features = [
  ["Adaptive Mastery Graph", "The platform recommends the next build from your completion evidence instead of forcing passive linear consumption."],
  ["AI Mentor Swarm", "Tutor, code reviewer, project coach, quiz master and career agent share the context of the lesson you are working on."],
  ["Proof-First Learning", "Every module ends with something another human can run, inspect, click, test or evaluate."],
  ["AI Code Lab", "Experiment in a focused workspace and send your reasoning or code directly to the review agent."],
  ["SaaS + Agentic Engineering", "The curriculum goes beyond websites into AI agents, RAG, multi-tenant SaaS, payments, observability and product delivery."],
  ["Career Evidence Engine", "Learning is organized around portfolio proof and demonstrable engineering decisions—not attendance."],
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroGlow" />
        <div className="heroCopy">
          <span className="eyebrow">THE AI-NATIVE DEVELOPER ACADEMY</span>
          <h1>
            Become the developer who can <em>build the whole system.</em>
          </h1>
          <p>
            A 64-module full stack, AI, SaaS and technology entrepreneurship master
            class engineered around projects, adaptive progression and agentic coaching.
          </p>
          <div className="heroActions">
            <Link className="primaryButton inlineButton" href="/dashboard">
              Enter the academy →
            </Link>
            <a className="secondaryButton" href="#curriculum">Explore the system</a>
          </div>
          <div className="heroMetrics">
            <div><strong>64</strong><span>mastery modules</span></div>
            <div><strong>5</strong><span>AI mentor roles</span></div>
            <div><strong>10</strong><span>career phases</span></div>
            <div><strong>1</strong><span>production capstone</span></div>
          </div>
        </div>

        <HomeShowcase />
      </section>

      <section className="ticker">
        <span>HTML</span><span>CSS</span><span>JAVASCRIPT</span><span>TYPESCRIPT</span>
        <span>REACT</span><span>NEXT.JS</span><span>NODE</span><span>DATABASES</span>
        <span>CLOUD</span><span>AI</span><span>AGENTS</span><span>SAAS</span>
      </section>

      <section className="experience" id="experience">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">NOT ANOTHER LMS</span>
            <h2>A developer operating system for learning.</h2>
          </div>
          <p>
            Content is only one layer. The product is designed to turn knowledge into
            evidence, feedback, iteration and shipped work.
          </p>
        </div>
        <div className="featureGrid">
          {features.map(([title, copy], index) => (
            <article key={title}>
              <span className="featureNumber">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="curriculumPreview" id="curriculum">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">FROM FIRST TAG TO AGENTIC SYSTEMS</span>
            <h2>{courseModules.length} modules. {phases.length} phases. One builder identity.</h2>
          </div>
          <Link href="/dashboard">Open full curriculum →</Link>
        </div>
        <div className="roadmap">
          {phases.map((phase, index) => {
            const modules = courseModules.filter((item) => item.phase === phase);
            return (
              <article key={phase}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{phase.replace(/^Phase \d+ · /, "")}</h3>
                  <p>{modules.length} modules · {modules[0]?.level}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="referralPromo">
        <div>
          <span className="eyebrow">BUILD · SHARE · EARN</span>
          <h2>Turn your learning network into a 15% referral income stream.</h2>
          <p>
            Every learner gets a tracked referral link. When someone joins through your
            link and completes a verified paid enrolment, your commission is recorded
            automatically in your referral dashboard.
          </p>
          <Link className="primaryButton inlineButton" href="/referrals">
            Open referral dashboard →
          </Link>
        </div>
        <div className="referralOffer">
          <strong>15%</strong>
          <span>commission on every verified paid referral</span>
        </div>
      </section>

      <section className="finalCta">
        <span className="eyebrow">YOUR CERTIFICATE IS NOT THE PRODUCT</span>
        <h2>Your ability to solve and ship is.</h2>
        <p>Start with one module. Finish with a deployable body of work.</p>
        <Link className="primaryButton inlineButton" href="/dashboard">Launch Full Stack Master Class →</Link>
      </section>
    </main>
  );
}
