# ChatBotFB — Architecture & Developer Notes

Overview
- This repository implements a Facebook Messenger chatbot (DNE "Trùm Động") with a simple admin dashboard.
- Main concerns: webhook handling (RAG + Gemini), MongoDB-based knowledge store, Google OAuth-protected dashboard, and user management.

Project layout (key files)
- `api/webhook.ts` — Vercel serverless webhook handler (calls controller).
- `src/controllers/webhook.controller.ts` — Core webhook logic used by both Vercel and Express.
- `src/commands/` — Command handlers (ask, history, mem, top, time, etc.) managed via `index.ts`.
- `api/policy.ts`, `api/term.ts` — Serverless endpoints for Privacy Policy and Terms of Service.
- `api/dashboard.ts` — Serverless dashboard endpoint (HTML UI and JSON CRUD API).
- `api/auth.ts` and `api/auth/callback.ts` — Google OAuth start + callback.
- `api/seed-admin.ts` — protected seed endpoint for creating an admin (requires `SEED_SECRET`).
- `src/lib/db.ts` — MongoDB singleton connection for serverless environments.
- `src/models/knowledge.model.ts` — `knowledge_base` schema (`topic`, `content`, `keywords`).
- `src/models/authorized_user.model.ts` — `authorized_users` schema (`email`, `role`).
- `src/services/gemini.service.ts` — wrapper for Generative AI (REST fallback to Google Generative Language API).
- `scripts/seed-admin.js` — CLI script to upsert a user into `authorized_users`.

Environment variables
- `MONGO_URI` — MongoDB connection string
- `FB_VERIFY_TOKEN`, `FB_PAGE_ACCESS_TOKEN` — Facebook webhook & Page tokens
- `GOOGLE_API_KEY` — API key for Generative Language REST usage
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `SESSION_SECRET` — JWT signing secret
- `SEED_SECRET` — secret token used to guard `/api/seed-admin` endpoint

Runtime flows
- Webhook: Facebook POST -> `api/webhook.ts` -> immediate 200 -> background processing: command parsing (/ask,/mem,/history,/h) -> DB search + call to Gemini -> reply via Graph API.
- Dashboard: user hits `/dashboard` -> if not logged in shows `Login with Google` -> Google OAuth flow -> callback checks `authorized_users` -> set JWT cookie -> dashboard UI (Knowledge + Users tabs) -> CRUD via `/api/dashboard` JSON API.

Commands supported by bot
- `/h` or `/help` — show help text.
- `/ask <question>` — send question to Gemini (RAG uses `knowledge_base`).
- `/hoi <question>` — alias for `/ask` (backwards compatibility).
- `/mem` — count total distinct users interacting with bot.
- `/top` — leaderboard of top interacting users.
- `/history` — show user's recent messages.

Testing & deployment
- Local dev: `npm run dev` (uses `src/server.ts` + Express). Use `ngrok` to expose local webhook for Facebook testing.
- Seed first admin: `node scripts/seed-admin.js` (reads `MONGO_URI` from `.env`) or call `/api/seed-admin` with `x-seed-secret` header.
- Build & deploy: push to GitHub → Vercel deploys automatically (ensure `engines.node` is set to `24.x`).

Notes & maintenance
- The code uses a MongoDB singleton in `src/lib/db.ts` with `serverSelectionTimeoutMS` and `socketTimeoutMS` to reduce serverless connection issues.
- Ambient `.d.ts` files were added for optional native SDKs (`@google/generative-ai`) and some JS libs used without `@types` to avoid build-time type errors.
- If you remove the seed endpoint, keep `scripts/seed-admin.js` offline for emergency admin creation.

Files to review when changing behavior
- [api/webhook.ts](api/webhook.ts)
- [src/controllers/webhook.controller.ts](src/controllers/webhook.controller.ts)
- [api/dashboard.ts](api/dashboard.ts)
- [src/lib/db.ts](src/lib/db.ts)
- [src/services/gemini.service.ts](src/services/gemini.service.ts)
