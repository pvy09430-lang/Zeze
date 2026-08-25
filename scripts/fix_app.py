import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Fix fetchStateWithRetry
replacement = """      try {
        data = JSON.parse(text);
        // Ngay lập tức sao lưu vào localStorage sau khi tải thành công
        localStorage.setItem("cl_portal_local_state_backup", text);
      }"""
text = text.replace("""      try {
        data = JSON.parse(text);
      }""", replacement)

error_fallback = """      if (retries > 0) {
        console.warn(`[Auto-Retry] Lỗi đồng bộ dữ liệu: "${error.message}". Thử lại sau ${delay}ms... (Còn lại ${retries} lần)`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchStateWithRetry(silent, retries - 1, delay * 1.5);
      }
      
      // Fallback: Khôi phục toàn bộ từ localStorage nếu mất kết nối / API sập
      const backup = localStorage.getItem("cl_portal_local_state_backup");
      if (backup) {
        console.warn("Khôi phục toàn bộ dữ liệu từ localStorage dự phòng...");
        try {
          return JSON.parse(backup) as AppState;
        } catch(e) {}
      }
      throw error;"""
text = text.replace("""      if (retries > 0) {
        console.warn(`[Auto-Retry] Lỗi đồng bộ dữ liệu: "${error.message}". Thử lại sau ${delay}ms... (Còn lại ${retries} lần)`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchStateWithRetry(silent, retries - 1, delay * 1.5);
      }
      throw error;""", error_fallback)

# Fix handleUpdateLocalState
handle_update_rep = """  const handleUpdateLocalState = (newState: AppState) => {
    setState(newState);
    // Đảm bảo dữ liệu luôn được lưu vào localStorage ngay lập tức sau mỗi lần cập nhật API thành công.
    localStorage.setItem("cl_portal_local_state_backup", JSON.stringify(newState));
  };"""
text = text.replace("""  const handleUpdateLocalState = (newState: AppState) => {
    setState(newState);
  };""", handle_update_rep)

with open("src/App.tsx", "w") as f:
    f.write(text)
print("done")
