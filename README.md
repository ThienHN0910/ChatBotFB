# DNE - "Trùm Động" Facebook Chatbot

Ứng dụng mẫu Chatbot cho Group / Fanpage DNE (Động Nghiệp Esport). Bot đóng vai trò là **Trùm Động** — hài hước, dùng thuật ngữ Esport, trả lời khi tin nhắn bắt đầu bằng `/hoi`.

Yêu cầu: Node.js, MongoDB, (tuỳ chọn) ngrok khi chạy local.

Các file quan trọng
- `src/` — mã nguồn TypeScript
- `tsconfig.json` — cấu hình TypeScript
- `.env.example` — biến môi trường mẫu

Biến môi trường (.env)

`PORT` — cổng server (mặc định 3000)

`MONGO_URI` — kết nối MongoDB (ví dụ: `mongodb://localhost:27017/dne_chatbot`)

`FB_VERIFY_TOKEN` — token tùy chọn để xác thực webhook Facebook

`FB_PAGE_ACCESS_TOKEN` — access token của Page để gửi tin nhắn

`GOOGLE_API_KEY` — API key hoặc Bearer token để gọi Gemini/Generative AI (cấu hình Google)

`GOOGLE_CLIENT_ID` — Google OAuth Client ID (for Dashboard login)

`GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret

`SESSION_SECRET` — Secret used to sign session JWTs (set a strong value in production)

`VERCEL_URL` or `OAUTH_REDIRECT` — optional override for OAuth redirect URL (default uses https://chat-bot-fb-lime.vercel.app/api/auth/callback)

Cài đặt dependencies

```bash
npm install axios dotenv express mongoose jsonwebtoken cookie
npm install --save-dev typescript ts-node-dev @types/express @types/node
```

Chạy ở môi trường phát triển (hot-reload)

```bash
npm run dev
```

Build và chạy production

```bash
npm run build
npm start
```

Chạy local + Ngrok (ví dụ: cổng 3000)

```bash
ngrok http 3000
# copy forwarding URL và cấu hình webhook Facebook (Webhook -> Add Callback URL -> Callback URL: https://<ngrok-id>.ngrok.io/api/webhook)
```

Facebook Webhook
- Use the webhook endpoint at `/api/webhook` for Vercel (or `/webhook` for local Express).
- Endpoint GET `/api/webhook` to verify (hub.mode, hub.verify_token, hub.challenge).
- Endpoint POST `/api/webhook` to receive message events.

Triển khai lên Render / VPS
- Thiết lập biến môi trường theo `.env.example`
- Build (`npm run build`) và chạy `npm start` hoặc dùng PM2

Ghi chú
- Code mẫu gọi Generative AI qua REST endpoint của Google (v1beta2). Tuỳ vào SDK mới, bạn có thể đổi phần `src/services/gemini.service.ts` để dùng `@google/generative-ai` chính thức.

Dashboard & Admin setup
- The project includes a simple protected dashboard at `/api/dashboard` (you can rewrite `/dashboard` to `/api/dashboard` via Vercel rewrites).
- Authentication uses Google OAuth2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your environment (redirect URI must be set to `https://chat-bot-fb-lime.vercel.app/api/auth/callback` or update `OAUTH_REDIRECT`).

Creating the first admin user in MongoDB
1. Connect to your MongoDB instance (mongo shell, Compass, or Atlas UI).
2. Switch to the database used by `MONGO_URI` and insert an authorized user:

```js
db.authorized_users.insertOne({ email: 'admin@example.com', role: 'admin', createdAt: new Date() })
```

Replace `admin@example.com` with your Google account email. After this, log in via `/api/auth` (which will redirect to Google) and you will be allowed to access the dashboard.

Vercel notes
- Add environment variables in the Vercel project settings: `MONGO_URI`, `FB_VERIFY_TOKEN`, `FB_PAGE_ACCESS_TOKEN`, `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `OAUTH_REDIRECT` (optional).
- Optionally add a rewrite in `vercel.json` to map `/dashboard` to `/api/dashboard`.

Commands (bot)
- `/h` or `/help`: show help and available commands.
- `/ask <question>`: ask Gemini (RAG+Gen) using knowledge base as context.
- `/hoi <question>`: alias of `/ask` kept for backwards compatibility.
- `/mem`: list members from the `authorized_users` collection.
- `/history`: show knowledge entries that look like historical records (searches `topic`, `content`, and `keywords`).

Dashboard
- Visit `/dashboard` (or `/api/dashboard`) to open the admin UI. If not logged in you'll see a **Login with Google** button.
- After login (Google OAuth) users must exist in the `authorized_users` collection to access the dashboard.
- UI features:
	- Two tabs: **Knowledge** and **Users**.
	- Create / Edit / Delete knowledge records (`topic`, `content`, `keywords`).
	- Create / Edit / Delete users (`email`, `role`).

Development & testing
- Start local dev server:
```bash
npm run dev
```
- Create an admin locally (or use `scripts/seed-admin.js`) to insert an authorized user.
- To simulate a Messenger webhook POST locally, POST JSON to your ngrok-forwarded URL `/api/webhook` with a structure similar to Facebook's messaging event:
```json
{
	"object": "page",
	"entry": [{ "messaging": [{ "sender": { "id": "USER_ID" }, "message": { "text": "/ask Xin chào" } }] }]
}
```

Deployment checklist
- Ensure Vercel environment variables are set (see above).
- Push to GitHub; Vercel will auto-deploy if connected.
- After deploy, check the deployment logs in the Vercel dashboard for errors.


**Seed-admin script & security**
- **Script file**: `scripts/seed-admin.js` — upserts an admin into the `authorized_users` collection. The repository also exposes a protected endpoint at `/api/seed-admin` which checks `SEED_SECRET`.
- **Run locally (quick)**: ensure `.env` contains a valid `MONGO_URI`, then run:
```bash
node scripts/seed-admin.js
```
- **Use protected HTTP endpoint** (optional): call the Vercel function with your secret header or query param:
```bash
curl -X POST https://<your-vercel-url>/api/seed-admin \
	-H "Content-Type: application/json" \
	-H "x-seed-secret: $SEED_SECRET" \
	-d '{"email":"hnt.vn.vn@gmail.com"}'
```
- **Security recommendations**:
	- Always set a strong `SEED_SECRET` in your environment and never commit it to source control.
	- Prefer running `scripts/seed-admin.js` from a secure, offline machine rather than exposing the HTTP endpoint publicly.
	- If you keep the `/api/seed-admin` endpoint, restrict access, rotate `SEED_SECRET` after use, and audit deployments/secret access.
	- After the initial setup, consider disabling or removing the endpoint and keeping the script offline for emergency use only.
- **Note**: The seed script has been executed locally and the email `hnt.vn.vn@gmail.com` was upserted into `authorized_users`. Rotate credentials and secrets as appropriate.
