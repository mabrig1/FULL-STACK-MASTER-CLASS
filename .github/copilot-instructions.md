# Full Stack Master Class — Agent Instructions

This repository is a commercial AI-native learning platform. When making changes:

- Preserve the free-access rule: Module 1 is free; Modules 2–64 require premium/staff entitlement.
- Never trust client-controlled role or plan values for authorization. Enforce access server-side.
- Keep secrets server-only and never commit API keys, database passwords, tokens, or payment secrets.
- Use the shared MongoDB helper in `lib/db.ts`; do not open a new MongoClient per request.
- Any AI-generated output that affects grading, access, credentials, or learner state must be bounded by deterministic checks and stored evidence.
- Do not claim code was executed unless the system actually executed or verified it.
- Learning recommendations should use mastery evidence and cognitive-load signals when available.
- Project grading must distinguish repository evidence from AI interpretation.
- Preserve auditability: important admin/security mutations should create audit or notification evidence where appropriate.
- Prefer small vertical-slice changes and keep production build checks green.
