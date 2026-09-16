import { collections, getDb, isDatabaseConfigured } from "@/lib/db";
import { getModule } from "@/lib/course";

export type LessonSection = {
  title: string;
  body: string;
};

export type LessonQuiz = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type CourseContent = {
  moduleId: number;
  summary: string;
  objectives: string[];
  sections: LessonSection[];
  lab: {
    title: string;
    steps: string[];
    deliverable: string;
  };
  quiz: LessonQuiz[];
  reflection: string;
  version: number;
};

const moduleOne: CourseContent = {
  moduleId: 1,
  summary:
    "Software development is the disciplined process of turning a real problem into a working, testable and maintainable software system. This module gives you the mental model you will use throughout the Master Class before you begin writing serious code.",
  objectives: [
    "Explain the difference between a problem, a feature and an implementation.",
    "Describe the basic relationship between frontend, backend, database and deployment.",
    "Trace a simple web request from a user's browser to a server and back.",
    "Use a professional build loop: understand, plan, build, test, debug, document and ship.",
    "Identify evidence that proves a software feature actually works.",
  ],
  sections: [
    {
      title: "1. Software development begins with a problem",
      body:
        "Professional developers do not begin with code. They begin by defining who has a problem, what successful behaviour looks like and what constraints matter. A feature is a proposed solution to that problem. Code is only one implementation mechanism. Keeping these three levels separate prevents you from building technically impressive software that solves the wrong problem.",
    },
    {
      title: "2. The four-part web application mental model",
      body:
        "Most modern web applications can be understood through four cooperating layers. The frontend is what the user sees and interacts with. The backend receives requests, applies rules and coordinates work. The database stores durable information. Deployment makes the system available outside your computer. Real products often add authentication, queues, storage, analytics and AI, but these four layers remain a useful starting map.",
    },
    {
      title: "3. Follow the request, not the framework",
      body:
        "When a user clicks a button, the browser may update locally or send a request to a server. The server validates the input, checks authorization, reads or writes data and returns a response. The frontend then turns that response into visible behaviour. If you can trace data through this path, you can debug systems built with many different frameworks because the underlying request-response model remains understandable.",
    },
    {
      title: "4. The professional build loop",
      body:
        "Use the same loop on every project: understand the requirement, define the smallest expected behaviour, build one vertical slice, test the happy path, test a failure path, debug with evidence, document the decision and ship a reproducible result. Avoid changing several layers at once when you do not understand the failure. Reduce uncertainty before increasing complexity.",
    },
    {
      title: "5. Debugging is evidence collection",
      body:
        "A bug is a difference between expected behaviour and observed behaviour. Before changing code, reproduce the problem, inspect the inputs, inspect the output, isolate the smallest failing step and state what should have happened. Random edits may occasionally work, but they do not build engineering judgment. Evidence-driven debugging does.",
    },
    {
      title: "6. Proof is part of the product",
      body:
        "A developer should be able to prove that work functions. Useful proof can include a deployed URL, automated test, screenshot, API response, repository commit, reproducible README or a short demonstration. Throughout this Master Class, completed learning should become visible evidence that another person can inspect rather than private notes that disappear after a lesson.",
    },
  ],
  lab: {
    title: "Build your first developer mission map",
    steps: [
      "Choose one everyday problem that could reasonably be improved with a web application.",
      "Write one sentence describing the user and the problem without mentioning technology.",
      "Define one user action that would prove the smallest useful version works.",
      "Sketch the four layers: frontend, backend, database and deployment. Write what each layer would be responsible for.",
      "List one happy-path test and one failure-path test.",
      "Create a README.md containing the problem, expected behaviour, system map and tests.",
    ],
    deliverable:
      "A GitHub repository containing a clear README.md mission map. No complex code is required yet; the evidence is your ability to define the system before building it.",
  },
  quiz: [
    {
      question: "Which statement best describes a professional starting point for a software project?",
      options: [
        "Choose a framework first.",
        "Define the user problem and expected behaviour first.",
        "Create the database first.",
        "Start coding and discover the problem later.",
      ],
      answer: "Define the user problem and expected behaviour first.",
      explanation:
        "Technology choices should follow a sufficiently clear understanding of the problem and the behaviour that would count as success.",
    },
    {
      question: "Where should authorization normally be enforced?",
      options: [
        "Only in the browser UI.",
        "At the server/API/data boundary where protected actions are executed.",
        "Inside CSS.",
        "Only after deployment.",
      ],
      answer: "At the server/API/data boundary where protected actions are executed.",
      explanation:
        "A user can bypass or modify client-side UI. Protected actions must therefore be verified by trusted server-side code.",
    },
    {
      question: "What is the best first action when a feature behaves unexpectedly?",
      options: [
        "Rewrite the feature.",
        "Change several files at once.",
        "Reproduce the failure and compare observed behaviour with expected behaviour.",
        "Switch frameworks.",
      ],
      answer: "Reproduce the failure and compare observed behaviour with expected behaviour.",
      explanation:
        "A reproducible difference between expected and observed behaviour gives you something concrete to investigate.",
    },
    {
      question: "Which is strongest as evidence that a feature works?",
      options: [
        "Saying that it works.",
        "A reproducible test or deployed behaviour another person can inspect.",
        "A course attendance record.",
        "A long code file.",
      ],
      answer: "A reproducible test or deployed behaviour another person can inspect.",
      explanation:
        "Engineering evidence should be independently inspectable or reproducible.",
    },
  ],
  reflection:
    "Before continuing, explain your chosen app idea in four sentences: the user problem, the smallest useful action, the four-layer system map and the evidence that would prove success.",
  version: 1,
};

export function defaultCourseContent(moduleId: number): CourseContent {
  if (moduleId === 1) return moduleOne;

  const module = getModule(moduleId);
  if (!module) throw new Error("Unknown course module.");

  return {
    moduleId,
    summary:
      module.title +
      " is taught through the Master Class mastery loop: understand the concept, build a small vertical slice, test failure modes, explain the decision and convert the result into proof.",
    objectives: [
      "Explain the core ideas behind " + module.title + ".",
      "Apply the concept inside a working implementation.",
      "Identify one important failure mode or trade-off.",
      "Document and verify the finished result.",
    ],
    sections: [
      {
        title: "Concept map",
        body:
          "Begin by identifying the inputs, outputs, responsibilities, trust boundaries and failure modes involved in " +
          module.title +
          ". Use the AI mentor to clarify concepts, but verify implementation behaviour yourself.",
      },
      {
        title: "Production perspective",
        body:
          "Treat this module as an engineering decision rather than a syntax exercise. Ask what must be secure, observable, testable and maintainable when the feature leaves your local machine.",
      },
    ],
    lab: {
      title: module.challenge,
      steps: [
        "Define the smallest expected behaviour.",
        "Build one vertical slice.",
        "Test the happy path.",
        "Test at least one failure path.",
        "Document the engineering decision and produce inspectable evidence.",
      ],
      deliverable:
        "A reproducible project artifact aligned with the module build challenge.",
    },
    quiz: [],
    reflection:
      "What did you assume at the start of this module, what did the evidence show, and what would you change in a production implementation?",
    version: 1,
  };
}

export async function getCourseContent(moduleId: number): Promise<CourseContent> {
  const fallback = defaultCourseContent(moduleId);
  if (!isDatabaseConfigured()) return fallback;

  try {
    const db = await getDb();
    const row = await db.collection(collections.courseContent).findOne({ moduleId });
    if (!row) return fallback;

    return {
      moduleId,
      summary: String(row.summary || fallback.summary),
      objectives: Array.isArray(row.objectives) ? row.objectives.map(String) : fallback.objectives,
      sections: Array.isArray(row.sections)
        ? row.sections.map((item: any) => ({
            title: String(item.title || ""),
            body: String(item.body || ""),
          }))
        : fallback.sections,
      lab: row.lab && typeof row.lab === "object"
        ? {
            title: String(row.lab.title || fallback.lab.title),
            steps: Array.isArray(row.lab.steps) ? row.lab.steps.map(String) : fallback.lab.steps,
            deliverable: String(row.lab.deliverable || fallback.lab.deliverable),
          }
        : fallback.lab,
      quiz: Array.isArray(row.quiz)
        ? row.quiz.map((item: any) => ({
            question: String(item.question || ""),
            options: Array.isArray(item.options) ? item.options.map(String) : [],
            answer: String(item.answer || ""),
            explanation: String(item.explanation || ""),
          }))
        : fallback.quiz,
      reflection: String(row.reflection || fallback.reflection),
      version: Number(row.version || fallback.version),
    };
  } catch {
    return fallback;
  }
}
