export function getPolicyHtml() {
  return `
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
}

export function getTermHtml() {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - DNE Chatbot</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #333; }
        h1, h2 { color: #111; }
        p { margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <h1>Terms of Service cho DNE Trùm Động Bot</h1>
      <p>Cập nhật lần cuối: 11/05/2026</p>
      <h2>1. Chấp nhận điều khoản</h2>
      <p>Khi sử dụng DNE Trùm Động Bot ("Bot"), bạn đồng ý tuân thủ các Điều khoản Dịch vụ này.</p>
      <h2>2. Nội dung do người dùng tạo</h2>
      <p>Bạn chịu trách nhiệm về nội dung tin nhắn gửi cho Bot. Bot không chịu trách nhiệm với bất kỳ nội dung do AI sinh ra dựa trên thông tin bạn cung cấp.</p>
      <h2>3. Mục đích sử dụng</h2>
      <p>Bot được thiết kế để cung cấp thông tin và giải trí. Chúng tôi không đảm bảo tính chính xác tuyệt đối của câu trả lời.</p>
      <h2>4. Thay đổi dịch vụ</h2>
      <p>Chúng tôi có quyền thay đổi hoặc ngừng hoạt động của Bot bất cứ lúc nào mà không cần báo trước.</p>
    </body>
    </html>
  `;
}
