# Full Stack Master Class Code Review Skill

Use this skill when reviewing application changes.

## Review priorities
1. Authentication and server-side authorization boundaries.
2. Secret exposure and unsafe environment-variable handling.
3. MongoDB persistence, indexes, TTL behaviour, and serverless connection reuse.
4. AI cost controls, quota enforcement, fallback behaviour, and prompt-grounding boundaries.
5. Payment verification and entitlement changes.
6. Assessment integrity: answers must not leak to the learner before submission.
7. Certificate integrity: public credentials must be backed by stored evidence.
8. Accessibility, mobile behaviour, and failure-state UX.
9. Build/type correctness for Next.js App Router routes and client/server boundaries.
10. Regression coverage or explicit verification steps.

Do not approve a change merely because it compiles. Identify what evidence demonstrates production behaviour.
