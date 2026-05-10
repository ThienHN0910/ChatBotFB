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
npm install axios body-parser dotenv express mongoose request @google/generative-ai
npm install --save-dev typescript ts-node-dev @types/express @types/node @types/body-parser
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
# copy forwarding URL và cấu hình webhook Facebook (Webhook -> Add Callback URL)
```

Facebook Webhook
- Endpoint GET `/webhook` để Facebook xác thực:
  - `hub.mode`, `hub.verify_token`, `hub.challenge`
- Endpoint POST `/webhook` nhận message events.

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

