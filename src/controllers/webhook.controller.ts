import { Request, Response } from 'express';
import Knowledge from '../models/knowledge.model';
import Message from '../models/message.model';
import { generateAnswer } from '../services/gemini.service';
import { sendTextMessage } from '../services/facebook.service';
import config from '../config';
import axios from 'axios';

// GET /webhook - verification
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge as any);
  }
  return res.sendStatus(403);
};

// POST /webhook - message events
export const handleWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text;
        if (!senderId || !messageText) continue;

        const trimmed = String(messageText).trim();
        const lower = trimmed.toLowerCase();

        // record message
        try {
          const fbName = await (async function(){
            try {
              const token = process.env.FB_PAGE_ACCESS_TOKEN || config.fbPageAccessToken;
              if (!token) return null;
              const r = await axios.get(`https://graph.facebook.com/${senderId}?fields=name&access_token=${token}`);
              return r.data?.name || null;
            } catch(e){return null}
          })();
          await Message.create({ senderId, senderName: fbName || undefined, text: messageText });
        } catch(e){ console.error('record msg error', e); }

        // Help
        if (lower === '/h' || lower === '/help') {
          await sendTextMessage(senderId, '/ask <question> — Hỏi Gemini (RAG+AI)\n/time or /gio — Hiện giờ hệ thống\n/ping — Pong với ms\n/fb or /link — Links\n/me — Thông tin bạn\n/keo /random /pick /thinh — random fun\n/top /mem /history — queries');
          continue;
        }

        // /time or /gio
        if (lower === '/time' || lower === '/gio') {
          const now = new Date(); const hh = now.getHours(); const mm = String(now.getMinutes()).padStart(2,'0'); const ss = String(now.getSeconds()).padStart(2,'0');
          let exclaim = '';
          if (hh>=0 && hh<5) exclaim='Ngủ đi các con nghiện.'; else if (hh>=5 && hh<7) exclaim='Sáng rồi, cà phê rồi leo rank.'; else if (hh>=7 && hh<10) exclaim='Dậy leo rank thôi!'; else if (hh===12) exclaim='Trưa rồi, ăn tí rồi gank tiếp.'; else if (hh>=18 && hh<22) exclaim='Tối rồi, chuẩn bị combat.';
          await sendTextMessage(senderId, `Bây giờ là ${hh}:${mm}:${ss}. ${exclaim}`);
          continue;
        }

        // /ping
        if (lower === '/ping') { const ts = event.timestamp || Date.now(); const latency = Math.max(0, Date.now()-ts); await sendTextMessage(senderId, `Pong! 🏓 ${latency}ms`); continue; }

        // /fb or /link
        if (lower === '/fb' || lower === '/link') { const group = process.env.GROUP_LINK||'https://facebook.com/yourgroup'; const site = process.env.WEBSITE_LINK||'https://example.com'; const yt = process.env.YOUTUBE_LINK||'https://youtube.com'; const discord = process.env.DISCORD_LINK||'https://discord.gg/yourserver'; await sendTextMessage(senderId, `Links:\nGroup: ${group}\nWebsite: ${site}\nYoutube: ${yt}\nDiscord: ${discord}`); continue; }

        // /me
        if (lower === '/me') { try { const token = process.env.FB_PAGE_ACCESS_TOKEN || config.fbPageAccessToken; const r = token ? await axios.get(`https://graph.facebook.com/${senderId}?fields=name&access_token=${token}`) : null; const name = r?.data?.name || 'Facebook user'; await sendTextMessage(senderId, `Bạn là: ${name}. ID của bạn: ${senderId}. Bạn đang ở trong Động Nghiện!`);} catch(e){console.error(e);} continue; }

        // /keo
        if (lower === '/keo') { const val = Math.floor(Math.random()*100)+1; await sendTextMessage(senderId, `Tỉ lệ thắng chuỗi hôm nay của bạn là: ${val}%. Vào game ngay!`); continue; }

        // /random
        if (lower.startsWith('/random ')) { try { const parts = trimmed.split(/\s+/).slice(1); const min=parseInt(parts[0],10), max=parseInt(parts[1],10); if (isNaN(min)||isNaN(max)) { await sendTextMessage(senderId,'Usage: /random <min> <max>'); } else { const a=Math.min(min,max), b=Math.max(min,max); const r=Math.floor(Math.random()*(b-a+1))+a; await sendTextMessage(senderId, `Random: ${r}`); } } catch(e){console.error(e);} continue; }

        // /pick
        if (lower.startsWith('/pick ')) { const tail = trimmed.slice(6).trim(); const opts = tail.split('|').map(s=>s.trim()).filter(Boolean); if (!opts.length) { await sendTextMessage(senderId,'Usage: /pick opt1 | opt2'); } else { const pick = opts[Math.floor(Math.random()*opts.length)]; await sendTextMessage(senderId, `Trùm Động khuyên bạn nên: '${pick}'`); } continue; }

        // /thinh
        if (lower === '/thinh') { const lines=['Em như mạng lag: cứ bị disconnect trong tim anh.','Đi với anh không cần Google Maps, anh dẫn đường vào tim em.','Anh có thể không phải là nhất nhưng chắc chắn là duy nhất với em.']; const pick=lines[Math.floor(Math.random()*lines.length)]; await sendTextMessage(senderId,pick); continue; }

        // /top
        if (lower === '/top') { try { const agg = await Message.aggregate([{ $group:{ _id:'$senderId', count:{ $sum:1 }, name:{ $first:'$senderName' } } },{ $sort:{ count:-1 } },{ $limit:10 }]); if (!agg||!agg.length) { await sendTextMessage(senderId,'Chưa có dữ liệu thống kê.'); } else { const lines = agg.map((r:any,i:number)=>`${i+1}. ${r.name||r._id}: ${r.count} tin nhắn`); await sendTextMessage(senderId, `Top gửi tin nhắn:\n${lines.join('\n')}`); } } catch(e){ console.error(e); await sendTextMessage(senderId,'Lấy top thất bại.'); } continue; }

        // /mem - unique senders count
        if (lower === '/mem') { try { const distinct = await Message.distinct('senderId'); await sendTextMessage(senderId, `Số thành viên đã từng nhắn cho bot: ${distinct.length}`); } catch(e){ console.error(e); await sendTextMessage(senderId,'Lấy số thành viên thất bại.'); } continue; }

        // /history - last messages for this sender
        if (lower === '/history' || lower.startsWith('/history ')) { try { const msgs = await Message.find({ senderId }).sort({ createdAt:-1 }).limit(10).lean(); if (!msgs||msgs.length===0) { await sendTextMessage(senderId,'Không tìm thấy lịch sử nhắn tin của bạn.'); } else { const lines = msgs.map((m:any)=>`${new Date(m.createdAt||m._id.getTimestamp()).toLocaleString()}: ${String(m.text).slice(0,200)}`); await sendTextMessage(senderId, `Lịch sử tin nhắn của bạn:\n${lines.join('\n')}`); } } catch(e){ console.error(e); await sendTextMessage(senderId,'Lấy lịch sử thất bại.'); } continue; }

        // /ask -> AI
        let userQuestion = trimmed;
        if (lower.startsWith('/ask ')) userQuestion = trimmed.slice(5).trim();
        else if (lower === '/ask') { await sendTextMessage(senderId,'Gửi câu hỏi theo cú pháp: /ask <câu hỏi>'); continue; }

        // RAG: search knowledge base using topic/content/keywords
        const tokens = userQuestion.toLowerCase().split(/\s+/).map(t=>t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean).slice(0,10);
        let contexts: string[] = [];
        try {
          if (tokens.length > 0) {
            const docs = await Knowledge.find({ keywords: { $in: tokens } }).limit(5).lean();
            if (docs && docs.length) contexts = docs.map((d:any) => `${d.topic}\n${d.content}`);
          }
          if (contexts.length === 0) {
            const q = userQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const docs2 = await Knowledge.find({ $or: [{ topic: new RegExp(q,'i') }, { content: new RegExp(q,'i') }] }).limit(3).lean();
            if (docs2 && docs2.length) contexts = docs2.map((d:any)=>`${d.topic}\n${d.content}`);
          }
        } catch (dbErr) {
          console.error('DB search error', dbErr);
          try { await sendTextMessage(senderId, 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!'); } catch(e){console.error(e)}
          continue;
        }

        const systemPrompt = "Bạn là Trùm Động, đại diện DNE. Gọi người dùng là Nghiện hữu/Anh em. Giọng văn hài hước, lầy lội, dùng thuật ngữ Esport (check var, gank, combat...). Kết thúc bằng icon 🎮 hoặc 🔥.";

        let reply = '';
        try {
          reply = await generateAnswer(systemPrompt, contexts, userQuestion || '');
        } catch (err) {
          console.error('AI error', err);
          reply = 'Trùm Động bị đuổi khỏi combat, thử lại sau nhé 🎮';
        }

        // send back to Facebook
        try {
          await sendTextMessage(senderId, reply);
        } catch (err) {
          console.error('Failed to send message to FB:', err);
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('webhook handling error', err);
    return res.sendStatus(500);
  }
};

export default { verifyWebhook, handleWebhook };
