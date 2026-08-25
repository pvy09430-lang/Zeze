import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Safe interceptor for JSON parsing to catch non-JSON "upstream error" responses gracefully
const originalJson = Response.prototype.json;
Response.prototype.json = async function () {
  try {
    return await originalJson.call(this);
  } catch (err) {
    console.warn("Mất đồng bộ hoặc lỗi máy chủ (Không thể phân giải JSON):", err);
    return { error: "Không thể kết nối đến máy chủ hoặc phản hồi từ máy chủ bị lỗi. Vui lòng thử lại sau giây lát!" };
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
