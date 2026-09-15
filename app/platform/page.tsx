import Link from "next/link";

const tools = [
  ["LEARN", "Adaptive Academy", "Continue the 64-module mastery graph with cloud-synced progress.", "/dashboard"],
  ["PLAN", "AI Study Plan", "Generate a personalized route from your goal, weekly time and current progress.", "/study-plan"],
  ["BUILD", "Secure Code Sandbox", "Run HTML, CSS and JavaScript in an isolated browser sandbox.", "/sandbox"],
  ["VERIFY", "Project Verification", "Submit GitHub projects and prove repository ownership with a verification challenge.", "/submissions"],
  ["ORCHESTRATE", "Agent Command Center", "Give a goal to a supervisor that routes work through specialist learning agents.", "/orchestrator"],
  ["MEASURE", "Job Readiness", "See a weighted readiness score built from progress, verified projects and peer evidence.", "/career-readiness"],
  ["COHORTS", "Cohort Workspace", "Join structured cohorts and learn alongside a real group.", "/cohorts"],
  ["REVIEW", "Peer Review", "Review verified projects using engineering rubrics and improve through feedback.", "/peer-review"],
  ["CREDENTIAL", "Certificates", "Issue and publicly verify evidence-backed Full Stack Master Class credentials.", "/account"],
  ["COMMERCE", "Plans & Access", "Unlock commercial course access through verified Paystack transactions.", "/pricing"],
  ["OPERATE", "Instructor Studio", "Manage learners, cohorts, projects, revenue and academy quality.", "/admin"],
];

export default function PlatformPage() {
  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">COMMERCIAL ACADEMY PLATFORM</span>
        <h1>Learning, evidence, AI and opportunity in one system.</h1>
        <p>
          Every major layer now has a dedicated workspace—from account identity and project proof
          to grading, cohorts, payments and the autonomous mentor orchestrator.
        </p>
      </section>
      <section className="platformGrid">
        {tools.map(([tag, title, copy, href]) => (
          <Link href={href} className="platformCard" key={title}>
            <span>{tag}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
