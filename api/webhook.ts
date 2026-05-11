import connectDB from '../src/lib/db';
import mongoose from 'mongoose';
import Knowledge from '../src/models/knowledge.model';
import Message from '../src/models/message.model';
import { generateAnswer } from '../src/services/gemini.service';
import axios from 'axios';

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';

async function sendFacebookMessage(psid: string, text: string) {
  if (!FB_PAGE_ACCESS_TOKEN) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');
  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    await axios.post(url, { recipient: { id: psid }, message: { text } }, { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Failed to send FB message:', err?.response?.data || err?.message || err);
    throw err;
  }
}

async function getFacebookName(psid: string) {
  if (!FB_PAGE_ACCESS_TOKEN) return null;
  try {
    const url = `https://graph.facebook.com/${psid}?fields=name&access_token=${FB_PAGE_ACCESS_TOKEN}`;
    const r = await axios.get(url);
    return r.data?.name || null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('Webhook verification request', { mode, token: token ? '***' : undefined });

      if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
        return res.status(200).send(challenge as any);
      }
      return res.sendStatus(403);
    }

    if (req.method === 'POST') {
      // Process incoming messages
      const body = req.body;
      if (body.object !== 'page') return res.sendStatus(404);

      // Acknowledge immediately to avoid Vercel 10s timeout
      res.status(200).send('EVENT_RECEIVED');

      // Background processing (not awaited) with internal timeout guards
      (async () => {
        try {
          if (mongoose.connection.readyState !== 1) await connectDB();

          for (const entry of body.entry || []) {
            for (const event of entry.messaging || []) {
              const senderId = event.sender?.id;
              const recipientId = event.recipient?.id;
              const messageText: string | undefined = event.message?.text;
              if (!senderId || !messageText) continue;

              console.log('Incoming message', { from: senderId, to: recipientId, text: messageText });

              const trimmed = String(messageText).trim();
              const lower = trimmed.toLowerCase();
              const isDirectToPage = !!(recipientId && process.env.FB_PAGE_ID && String(recipientId) === String(process.env.FB_PAGE_ID));
              const isCommand = trimmed.startsWith('/');
              if (!isCommand && !isDirectToPage) continue;

              // persist message for analytics/history
              try {
                const name = await getFacebookName(senderId).catch(()=>null);
                await Message.create({ senderId, senderName: name || undefined, text: messageText });
              } catch (e) {
                console.error('Failed to record message', e);
              }

              // HELP - list commands (English commands with Vietnamese explanation)
              if (lower === '/h' || lower === '/help') {
                const helpLines = [
                  '/ask <question> — Hỏi Gemini (RAG + AI). Ví dụ: /ask who won last match? (viết tiếng Việt/Anh đều OK)',
                  '/time or /gio — Trả về giờ hệ thống hiện tại (kèm câu cảm thán theo khung giờ).',
                  '/ping — Kiểm tra độ trễ; bot trả về Pong và ms.',
                  '/fb or /link — Trả về các liên kết quan trọng của Động (Group, Website, Youtube, Discord).',
                  '/me — Hiển thị tên Facebook và ID của bạn.',
                  '/keo — Tỉ lệ thắng kèo hôm nay (random 1-100%).',
                  '/random <min> <max> — Sinh số ngẫu nhiên trong khoảng.',
                  '/pick <opt1> | <opt2> [... ] — Chọn ngẫu nhiên giữa các phương án.',
                  '/thinh — Bốc 1 câu thả thính/ngầu ngầu ngầu.',
                  '/top — Xem các sender gửi nhiều tin nhất (top).',
                  '/mem — Số thành viên đã từng nhắn cho bot (unique sender count).',
                  '/history — Lấy 5-10 tin nhắn gần nhất của bạn.'
                ];
                try { await sendFacebookMessage(senderId, helpLines.join('\n')); } catch(e){ console.error('Failed to send help', e); }
                continue;
              }

              // /time or /gio
              if (lower === '/time' || lower === '/gio') {
                try {
                  const now = new Date();
                  const hh = now.getHours();
                  const mm = String(now.getMinutes()).padStart(2,'0');
                  const ss = String(now.getSeconds()).padStart(2,'0');
                  let exclaim = '';
                  if (hh >=0 && hh <5) exclaim = 'Ngủ đi các con nghiện.';
                  else if (hh >=5 && hh <7) exclaim = 'Sáng rồi, cà phê rồi leo rank.';
                  else if (hh >=7 && hh <10) exclaim = 'Dậy leo rank thôi!';
                  else if (hh === 12) exclaim = 'Trưa rồi, ăn tí rồi gank tiếp.';
                  else if (hh >=18 && hh <22) exclaim = 'Tối rồi, chuẩn bị combat.';
                  else exclaim = '';
                  await sendFacebookMessage(senderId, `Bây giờ là ${hh}:${mm}:${ss}. ${exclaim}`);
                } catch (e) { console.error('time cmd error', e); }
                continue;
              }

              // /ping
              if (lower === '/ping') {
                try {
                  const ts = event.timestamp || Date.now();
                  const latency = Math.max(0, Date.now() - ts);
                  await sendFacebookMessage(senderId, `Pong! 🏓 ${latency}ms`);
                } catch (e) { console.error('ping error', e); }
                continue;
              }

              // /fb or /link
              if (lower === '/fb' || lower === '/link') {
                try {
                  const group = process.env.GROUP_LINK || 'https://facebook.com/yourgroup';
                  const site = process.env.WEBSITE_LINK || 'https://example.com';
                  const yt = process.env.YOUTUBE_LINK || 'https://youtube.com';
                  const discord = process.env.DISCORD_LINK || 'https://discord.gg/yourserver';
                  const txt = `Links:\nGroup: ${group}\nWebsite: ${site}\nYoutube: ${yt}\nDiscord: ${discord}`;
                  await sendFacebookMessage(senderId, txt);
                } catch (e) { console.error('link error', e); }
                continue;
              }

              // /me
              if (lower === '/me') {
                try {
                  const name = await getFacebookName(senderId).catch(()=>null);
                  const txt = `Bạn là: ${name||'Facebook user'}. ID của bạn: ${senderId}. Bạn đang ở trong Động Nghiện!`;
                  await sendFacebookMessage(senderId, txt);
                } catch (e) { console.error('/me error', e); }
                continue;
              }

              // Random group: /keo, /random, /pick, /thinh
              if (lower === '/keo') {
                const val = Math.floor(Math.random()*100)+1;
                await sendFacebookMessage(senderId, `Tỉ lệ thắng chuỗi hôm nay của bạn là: ${val}%. Vào game ngay!`);
                continue;
              }

              if (lower.startsWith('/random ')) {
                try {
                  const parts = trimmed.split(/\s+/).slice(1);
                  const min = parseInt(parts[0],10); const max = parseInt(parts[1],10);
                  if (Number.isNaN(min) || Number.isNaN(max)) { await sendFacebookMessage(senderId, 'Usage: /random <min> <max>'); continue; }
                  const a = Math.min(min,max); const b = Math.max(min,max);
                  const r = Math.floor(Math.random()*(b-a+1))+a;
                  await sendFacebookMessage(senderId, `Random: ${r}`);
                } catch(e){ console.error('random error', e); }
                continue;
              }

              if (lower.startsWith('/pick ')) {
                try {
                  const tail = trimmed.slice(6).trim();
                  const opts = tail.split('|').map(s=>s.trim()).filter(Boolean);
                  if (!opts.length) { await sendFacebookMessage(senderId,'Usage: /pick opt1 | opt2 | opt3'); continue; }
                  const pick = opts[Math.floor(Math.random()*opts.length)];
                  await sendFacebookMessage(senderId, `Trùm Động khuyên bạn nên: '${pick}'`);
                } catch(e){ console.error('pick error', e); }
                continue;
              }

              if (lower === '/thinh') {
                const lines = [
                  'Em như mạng lag: cứ bị disconnect trong tim anh.',
                  'Đi với anh không cần Google Maps, anh dẫn đường vào tim em.',
                  'Anh có thể không phải là nhất nhưng chắc chắn là duy nhất với em.'
                ];
                const pick = lines[Math.floor(Math.random()*lines.length)];
                await sendFacebookMessage(senderId, pick);
                continue;
              }

              // Power queries: /top, /mem, /history
              if (lower === '/top') {
                try {
                  if (mongoose.connection.readyState !== 1) await connectDB();
                  const agg = await Message.aggregate([
                    { $group: { _id: '$senderId', count: { $sum: 1 }, name: { $first: '$senderName' } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                  ]);
                  if (!agg || !agg.length) { await sendFacebookMessage(senderId, 'Chưa có dữ liệu thống kê.'); continue; }
                  const lines = agg.map((r:any,i:number)=>`${i+1}. ${r.name||r._id}: ${r.count} tin nhắn`);
                  await sendFacebookMessage(senderId, `Top gửi tin nhắn:\n${lines.join('\n')}`);
                } catch(e){ console.error('top error', e); await sendFacebookMessage(senderId,'Lấy top thất bại.'); }
                continue;
              }

              if (lower === '/mem') {
                try {
                  if (mongoose.connection.readyState !== 1) await connectDB();
                  const distinct = await Message.distinct('senderId');
                  await sendFacebookMessage(senderId, `Số thành viên đã từng nhắn cho bot: ${distinct.length}`);
                } catch(e){ console.error('mem error', e); await sendFacebookMessage(senderId,'Lấy số thành viên thất bại.'); }
                continue;
              }

              if (lower === '/history' || lower.startsWith('/history ')) {
                try {
                  if (mongoose.connection.readyState !== 1) await connectDB();
                  const msgs = await Message.find({ senderId }).sort({ createdAt: -1 }).limit(10).lean();
                  if (!msgs || msgs.length===0) { await sendFacebookMessage(senderId,'Không tìm thấy lịch sử nhắn tin của bạn.'); continue; }
                  const lines = msgs.map((m:any)=>`${new Date(m.createdAt||m._id.getTimestamp()).toLocaleString()}: ${String(m.text).slice(0,200)}`);
                  await sendFacebookMessage(senderId, `Lịch sử tin nhắn của bạn:\n${lines.join('\n')}`);
                } catch(e){ console.error('history error', e); await sendFacebookMessage(senderId,'Lấy lịch sử thất bại.'); }
                continue;
              }

              // Tokenize and search keywords
              const tokens = userQuestion
                .toLowerCase()
                .split(/\s+/)
                .map((t) => t.replace(/[^\p{L}\p{N}_]+/gu, ''))
                .filter(Boolean)
                .slice(0, 10);

              let contexts: string[] = [];
              try {
                if (tokens.length > 0) {
                  const docs = await Knowledge.find({ keywords: { $in: tokens } }).limit(5).lean();
                  if (docs && docs.length) contexts = docs.map((d: any) => `${d.topic}\n${d.content}`);
                }

                if (contexts.length === 0) {
                  const q = userQuestion.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
                  const docs2 = await Knowledge.find({ $or: [{ topic: new RegExp(q, 'i') }, { content: new RegExp(q, 'i') }] }).limit(3).lean();
                  if (docs2 && docs2.length) contexts = docs2.map((d: any) => `${d.topic}\n${d.content}`);
                }
              } catch (dbErr) {
                console.error('DB search error:', dbErr);
                try {
                  await sendFacebookMessage(senderId, 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!');
                } catch (e) {
                  console.error('Failed to send fallback message after DB error', e);
                }
                continue;
              }

              const systemPrompt = `Bạn là Trùm Động, đại diện DNE (Động Nghiệp Esport). Gọi người dùng là Nghiện hữu hoặc Anh em. Trả lời lầy lội, dùng từ ngữ game thủ, hài hước. Dựa vào dữ liệu sau để trả lời:\n${contexts.length ? contexts.join('\n\n---\n\n') : 'Không có dữ liệu liên quan.'}\n\nUser hỏi: ${userQuestion}\n\nTrả lời:`;

              // Gemini generation with timeout guard (Promise.race)
              let reply: string | null = null;
              try {
                const genPromise = generateAnswer(systemPrompt, contexts, userQuestion || '');
                const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
                // @ts-ignore
                reply = (await Promise.race([genPromise, timeout])) as string | null;
              } catch (genErr) {
                console.error('Gemini error:', genErr);
              }

              if (!reply) reply = 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!';

              try {
                await sendFacebookMessage(senderId, reply);
                console.log('Reply sent to', senderId);
              } catch (sendErr) {
                console.error('Failed to send reply:', sendErr);
              }
            }
          }
        } catch (err) {
          console.error('Background processing error:', err);
        }
      })();

      return;
    }

    return res.status(405).send('Method Not Allowed');
  } catch (err: any) {
    console.error('Webhook handler error:', err?.message || err);
    return res.status(500).send('Server error');
  }
}
