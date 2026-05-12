# BotFacebook

This repository now runs as a Vue 3 frontend plus a Node.js backend rewrite.

## Layout

- `chatbotfbNode` - Node.js backend for webhook, dashboard API, auth, MongoDB, Gemini, and Facebook integration.
- `chatbotfbweb/BotFacebook.Web` - Vue 3 SPA for the public pages and admin dashboard.

## What the app does

- Facebook webhook verification and message receive flow.
- Dashboard CRUD for knowledge base and authorized users.
- Google login for the dashboard with cookie-based session auth.
- Public `/policy` and `/term` pages in Vue.
- Bot command support in the Node backend: `/ask`, `/about`, `/echo`, `/time`, `/uptime`, `/ping`, `/me`, `/fb`, `/link`, `/random`, `/mem`, `/top`, `/history`, `/help`.

## Frontend notes

- Vue routes are lazy-loaded to keep the initial bundle smaller.
- The home page now reflects the current bot command list and the Node backend runtime.
- `VITE_API_BASE_URL` should point at the backend host when frontend and backend are deployed separately.

## Backend setup

Environment values are loaded from `.env`. Use `__` in environment variable names when targeting nested config sections.

Examples:

- `Mongo__ConnectionString`
- `Mongo__DatabaseName`
- `Facebook__PageAccessToken`
- `Facebook__PageId`
- `Facebook__GraphApiVersion`
- `Facebook__AppSecret`
- `Gemini__ApiKey`
- `Webhook__VerifyToken`
- `Auth__GoogleClientId`
- `Auth__GoogleClientSecret`
- `Auth__OAuthRedirect`
- `Auth__FrontendBaseUrl`
- `Auth__SessionSecret`

Run the backend:

```bash
cd chatbotfbNode
npm install
npm run dev
```

Build the backend:

```bash
cd chatbotfbNode
npm run build
npm start
```

## Frontend setup

The Vue app calls the backend API with `credentials: include`, so set the API base URL in the frontend environment if the frontend and backend are hosted on different origins.

Example file:

- `chatbotfbweb/BotFacebook.Web/.env.example`

Example:

- `VITE_API_BASE_URL=https://your-botfb-api-host`

Current production split:

- Frontend: `https://chat-bot-fb-web.vercel.app`
- Backend: `https://chatbotfb-production.up.railway.app`

If you deploy frontend and backend on the same origin, the app can still fall back to relative `/api/...` URLs when `VITE_API_BASE_URL` is omitted.

The frontend login/logout and dashboard requests are all cookie-based, so the backend must allow credentials and be reachable over HTTPS in production.

Run the frontend:

```bash
cd chatbotfbweb/BotFacebook.Web
npm install
npm run dev
```

Build the frontend:

```bash
cd chatbotfbweb/BotFacebook.Web
npm run build
```

## Notes

- The Node backend keeps the original API shape so the Facebook webhook, admin dashboard, and bot commands can be swapped in without changing the external flow.
- The Facebook callback URL can point to either `/webhook` or `/api/webhook`, but it must target the backend domain, not the frontend Vercel site.
- Webhook signature verification is supported when `Facebook__AppSecret` is set.
- The app fails fast on weak or missing `Auth__SessionSecret` values instead of silently booting with the old default.
- The dashboard and auth cookies rely on the backend being served behind HTTPS in production.