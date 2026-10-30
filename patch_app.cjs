const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        console.error("[DEBUG UPSTREAM] Nhận phản hồi không hợp lệ (Không phải JSON) từ backend:", {`;

const replacement = `      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        if (trimmed.includes("<title>Starting Server...</title>")) {
           throw new Error("Máy chủ đang khởi động, vui lòng đợi...");
        }
        console.error("[DEBUG UPSTREAM] Nhận phản hồi không hợp lệ (Không phải JSON) từ backend:", {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Patched App.tsx successfully!');
