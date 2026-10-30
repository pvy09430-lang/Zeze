import React, { useState } from "react";
import { Feedback } from "../types";
import { 
  MessagesSquare, Send, Trash2, Edit3, Heart, MessageCircle, 
  CornerDownRight, User, ShieldCheck, Check, Sparkles
} from "lucide-react";

interface MasonryFeedbackViewProps {
  feedbacks: Feedback[];
  onRefresh: () => void;
  nickname: string;
  avatar: string;
  userId: string;
  isAdminUnlocked?: boolean;
  passcode?: string;
}

export default function MasonryFeedbackView({
  feedbacks,
  onRefresh,
  nickname,
  avatar,
  userId,
  isAdminUnlocked,
  passcode
}: MasonryFeedbackViewProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [replyInputOpenId, setReplyInputOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const [openCommentsIds, setOpenCommentsIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleComments = (id: string) => {
    setOpenCommentsIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: isAnonymous ? "Khách Ẩn Danh" : (nickname || "Khách Ẩn Danh"),
          isAnonymous,
          content: content.trim(),
          avatar: isAnonymous ? "🤫" : avatar,
          userId
        })
      });
      if (res.ok) {
        setContent("");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Gặp lỗi khi gửi phản hồi");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (feedbackId: string) => {
    const text = replyText[feedbackId] || "";
    if (!text.trim()) return;

    const activePasscode = passcode || localStorage.getItem("admin_passcode") || "1492007";
    try {
      const res = await fetch(`/api/feedbacks/${feedbackId}/replies?passcode=${encodeURIComponent(activePasscode)}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-passcode": activePasscode
        },
        body: JSON.stringify({
          nickname: nickname || "Khách ẩn danh",
          content: text.trim(),
          avatar,
          userId,
          isAdmin: !!isAdminUnlocked || (nickname && nickname.toLowerCase() === "zeze") || activePasscode === "1492007",
          passcode: activePasscode
        })
      });
      if (res.ok) {
        setReplyText(prev => ({ ...prev, [feedbackId]: "" }));
        setReplyInputOpenId(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phản hồi này?")) return;
    try {
      const res = await fetch(`/api/feedbacks/${id}`, { method: "DELETE" });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingContent.trim()) return;
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() })
      });
      if (res.ok) {
        setEditingId(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sortedFeedbacks = [...feedbacks].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Banner & Submission Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-bold uppercase tracking-wider">
            <MessagesSquare className="w-3.5 h-3.5" /> Hòm Thư Độc Giả
          </div>
          <h2 className="font-heading font-black text-2xl text-slate-900 dark:text-slate-100">
            Gửi Góp Ý & Tâm Sự Đến Tác Giả
          </h2>
          <p className="font-body text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Nơi bạn có thể gửi gắm lời nhắn, thông báo link bot gặp sự cố hoặc đóng góp các ý kiến cải tiến prompt. Tất cả ý kiến đều được tác giả đón nhận trân trọng!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
          {/* Identity & Anonymous Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-950/60 flex items-center justify-center text-xs shrink-0">
                {isAnonymous ? "🤫" : (avatar.startsWith("http") || avatar.startsWith("data:") ? (
                  <img src={avatar} className="w-full h-full rounded-full object-cover" alt="" />
                ) : avatar)}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Người gửi: <strong className="font-bold text-slate-900 dark:text-slate-100">{isAnonymous ? "Khách Ẩn Danh" : nickname}</strong>
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
              />
              <span className="text-slate-600 dark:text-slate-400 font-semibold text-xs">
                Gửi dưới chế độ Ẩn Danh (Giữ bí mật)
              </span>
            </label>
          </div>

          {/* Auto-Resize Textarea */}
          <div className="relative">
            <textarea
              required
              placeholder="Nhập nội dung chia sẻ, góp ý của bạn tại đây (khung tự động mở rộng theo độ dài chữ gõ)..."
              value={content}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.max(100, el.scrollHeight)}px`;
              }}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 text-xs sm:text-sm font-body leading-relaxed rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all resize-none min-h-[100px]"
              maxLength={2000}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-sans">
              Tối đa 2.000 ký tự · Tự co giãn chiều cao
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm shadow-pink-500/20 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Đang gửi..." : "Gửi Phản Hồi Ngay"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Masonry Grid Layout of Feedbacks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Hòm Thư Đang Chia Sẻ
            <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/40">
              {feedbacks.length} lá thư
            </span>
          </h3>
        </div>

        {sortedFeedbacks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            Chưa có phản hồi nào trong hòm thư. Hãy là người đầu tiên để lại lời nhắn nhé! ✨
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 [column-fill:_balance]">
            {sortedFeedbacks.map((fb) => {
              const isExpanded = expandedIds.includes(fb.id);
              const isLongText = fb.content && fb.content.length > 200;
              const isAuthor = (fb.userId && fb.userId === userId) || (!fb.userId && fb.nickname === nickname);
              const canEditDelete = isAdminUnlocked || isAuthor;

              const avatarSrc = fb.avatar && (fb.avatar.startsWith("data:") || fb.avatar.startsWith("http") || fb.avatar.startsWith("/"))
                ? fb.avatar
                : (fb.avatar && fb.avatar.length > 30 ? `data:image/png;base64,${fb.avatar}` : null);

              const replies = Array.isArray(fb.replies) ? fb.replies : [];

              return (
                <div
                  key={fb.id}
                  className="break-inside-avoid bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-pink-300 dark:hover:border-pink-900/60 transition-all duration-300 space-y-3 group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                        {avatarSrc ? (
                          <img src={avatarSrc} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          fb.avatar || (fb.isAnonymous ? "🤫" : "👤")
                        )}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                          {fb.isAnonymous ? "Khách Ẩn Danh" : fb.nickname}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(fb.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canEditDelete && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => { setEditingId(fb.id); setEditingContent(fb.content); }}
                          className="p-1 text-slate-400 hover:text-cyan-500 rounded transition"
                          title="Sửa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(fb.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  {editingId === fb.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-body"
                        rows={3}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveEdit(fb.id)}
                          className="px-3 py-1 text-xs font-bold bg-pink-500 text-white rounded-lg"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative font-body text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <div
                        className={`whitespace-pre-line break-words ${
                          !isExpanded && isLongText ? "line-clamp-4 max-h-[5.5rem] overflow-hidden" : ""
                        }`}
                      >
                        {fb.content}
                      </div>

                      {/* Fade out gradient */}
                      {!isExpanded && isLongText && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
                      )}
                    </div>
                  )}

                  {/* Read More button */}
                  {isLongText && editingId !== fb.id && (
                    <button
                      onClick={() => toggleExpand(fb.id)}
                      className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline pt-0.5 cursor-pointer block"
                    >
                      {isExpanded ? "▲ Thu gọn" : "▼ Xem thêm"}
                    </button>
                  )}

                  {/* Comments Section: Collapsible Toggle */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <button
                      onClick={() => toggleComments(fb.id)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        openCommentsIds.includes(fb.id)
                          ? "bg-pink-500 text-white font-bold shadow-xs shadow-pink-500/20"
                          : "text-slate-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40"
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{openCommentsIds.includes(fb.id) ? "Thu gọn phản hồi" : "Phản hồi"} ({replies.length})</span>
                    </button>

                    {openCommentsIds.includes(fb.id) && (
                      <div className="space-y-2.5 pt-1 animate-fade-in">
                        {replies.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1 px-1">
                            Chưa có phản hồi nào. Hãy để lại lời nhắn cho độc giả này!
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {replies.map((reply) => (
                              <div
                                key={reply.id}
                                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                  reply.isAdmin
                                    ? "bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40"
                                    : "bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-heading font-bold text-slate-900 dark:text-slate-100 text-[11px] flex items-center gap-1">
                                    {reply.nickname}
                                    {reply.isAdmin && (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-rose-500 text-white">
                                        Tác Giả
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(reply.createdAt).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                                <p className="font-body text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px] whitespace-pre-line">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời / phản hồi..."
                            value={replyText[fb.id] || ""}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSendReply(fb.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          />
                          <button
                            onClick={() => handleSendReply(fb.id)}
                            disabled={!replyText[fb.id]?.trim()}
                            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition"
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
