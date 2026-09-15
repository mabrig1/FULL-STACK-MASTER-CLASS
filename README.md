# Full Stack Master Class

An AI-native, project-first online learning platform for full stack engineering, AI application development, agentic systems, SaaS, cloud deployment and technology entrepreneurship.

## What makes this different

This is intentionally not a conventional LMS.

- **64-module mastery graph** from web fundamentals to AI agents, SaaS and product delivery.
- **Mentor swarm** with five modes: Mentor, Code Review, Project Coach, Quiz Master and Career Agent.
- **Proof-first learning**: each module asks the learner to create something inspectable or runnable.
- **Adaptive dashboard**: progress determines the next recommended module.
- **AI Code Lab** for experiment → review → fix loops.
- **Portfolio framing** so completed work becomes evidence, not forgotten coursework.
- **Graceful AI fallback**: the product remains usable without an AI key, then switches to live provider-backed coaching when configured.

## Stack

- Next.js 16.3.3 App Router
- React 19
- TypeScript
- CSS design system
- Vercel-ready server route for the mentor swarm
- Browser localStorage for zero-setup progress in the first release

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Enable live agentic coaching

Copy `.env.example` to `.env.local`.

```bash
AI_GATEWAY_API_KEY=your_key
AI_MODEL=your_current_gateway_model_id
```

The app calls the OpenAI-compatible Vercel AI Gateway endpoint. Keep `AI_MODEL` environment-driven so the platform can adopt newer models without code changes.

Without these variables the mentor swarm uses its built-in project coaching engine, so the application remains functional.

## Routes

- `/` — premium product landing page
- `/dashboard` — adaptive learner dashboard
- `/learn/[id]` — mastery lesson + code lab + contextual mentor
- `/api/agent` — five-role AI mentor API

## Product architecture

The current release deliberately has zero database/auth setup friction and proves the complete learning experience first.

Recommended production expansion:

1. Add authentication and learner accounts.
2. Persist progress, submissions, XP and mentor sessions in MongoDB/Postgres.
3. Add GitHub repository linking and automatic project evidence ingestion.
4. Add code execution sandboxes for safe browser/server labs.
5. Add instructor/admin studio for lessons, cohorts, assessments and analytics.
6. Add retrieval over lesson material so tutor responses cite the exact course source.
7. Add structured agent traces, tool permissions and human approval for consequential actions.
8. Add certificates that are issued only after capstone evidence validation.
9. Add team/cohort collaboration, peer review and mentor escalation.
10. Add payments and entitlement tiers if commercial access is desired.

## Learning philosophy

Understand → Build → Break → Fix → Explain → Ship.

The certificate is not the product. The ability to solve, ship and prove the work is.
