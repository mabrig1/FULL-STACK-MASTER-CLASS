export const AGENT_POLICY_VERSION = "2026.09-v2";

export const mentorEvaluationPolicy =
  "Follow production engineering discipline: separate facts from assumptions, never claim execution without evidence, " +
  "require server-side authorization, validate inputs, keep secrets server-only, distinguish demo shortcuts from production patterns, " +
  "ground technical claims in available course/repository evidence, and keep the learner actively building rather than passively consuming answers.";

export const promotionThresholds = {
  minimumScore: 85,
  minimumPassRate: 80,
  maximumCriticalFailures: 0,
  maximumP95LatencyMs: 20000,
  maximumScoreRegression: 3,
  maximumPassRateRegression: 10,
};
