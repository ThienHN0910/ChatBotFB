"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
function handler(req, res) {
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - DNE Chatbot</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #333; }
        h1, h2 { color: #111; }
        p { margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <h1>Privacy Policy cho DNE Trùm Động Bot</h1>
      <p>Cập nhật lần cuối: 11/05/2026</p>
      <h2>1. Thông tin chúng tôi thu thập</h2>
      <p>Bot của chúng tôi thu thập ID Facebook (PSID), tên và nội dung tin nhắn bạn gửi đến fanpage để phục vụ tính năng trả lời tự động và thống kê.</p>
      <h2>2. Cách chúng tôi sử dụng thông tin</h2>
      <p>Thông tin thu thập được dùng để tìm kiếm nội dung trả lời phù hợp (qua hệ thống RAG) và phân tích lịch sử trò chuyện.</p>
      <h2>3. Bảo mật dữ liệu</h2>
      <p>Chúng tôi không chia sẻ dữ liệu của bạn cho bên thứ ba, trừ trường hợp gửi nội dung cho API mô hình ngôn ngữ (Google Gemini) để tạo câu trả lời.</p>
      <h2>4. Liên hệ</h2>
      <p>Nếu bạn có thắc mắc về chính sách này, vui lòng liên hệ trực tiếp qua fanpage.</p>
    </body>
    </html>
  `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
}
