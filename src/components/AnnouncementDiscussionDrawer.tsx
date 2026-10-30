import React, { useState } from "react";
import { Announcement, Comment } from "../types";
import { MessageSquare, Send, Trash2, X, Heart, Sparkles, User, CornerDownRight } from "lucide-react";

interface AnnouncementDiscussionDrawerProps {
  announcement: Announcement;
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
  nickname: string;
  avatar: string;
  isAdminUnlocked?: boolean;
}

export default function AnnouncementDiscussionDrawer({
  announcement,
  onClose,
  onRefresh,
  userId,
  nickname,
  avatar,
  isAdminUnlocked
}: AnnouncementDiscussionDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = Array.isArray(announcement.comments) ? announcement.comments : [];

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "Khách ẩn danh",
          content: commentText.trim(),
          avatar,
          userId,
          isAdminComment: !!isAdminUnlocked
        })
      });
      if (res.ok) {
        setCommentText("");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Gặp lỗi khi gửi bình luận");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    try {
      const res = await fetch(
        `/api/announcements/${announcement.id}/comments/${commentId}?userId=${encodeURIComponent(userId)}&nickname=${encodeURIComponent(nickname)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Không thể xóa bình luận");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-pink-50/60 via-white to-white dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-950 rounded-2xl border border-pink-200/80 dark:border-pink-900/40 p-4 sm:p-5 shadow-sm space-y-4 animate-fade-in relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-pink-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 font-sans">
              Thảo luận bản tin
            </p>
            <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
              {announcement.title}
            </h4>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Đóng khung thảo luận"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            Chưa có phản hồi nào cho bản tin này. Hãy là người đầu tiên chia sẻ cảm nghĩ nhé! ✨
          </div>
        ) : (
          comments.map((c) => {
            const isAuthor = (c.userId && c.userId === userId) || (!c.userId && c.nickname === nickname);
            const canDelete = isAdminUnlocked || isAuthor;

            const avatarSrc = c.avatar && (c.avatar.startsWith("data:") || c.avatar.startsWith("http") || c.avatar.startsWith("/"))
              ? c.avatar
              : (c.avatar && c.avatar.length > 30 ? `data:image/png;base64,${c.avatar}` : null);

            return (
              <div
                key={c.id}
                className="p-3 bg-white/90 dark:bg-slate-950/70 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-1.5 text-xs transition hover:border-pink-200 dark:hover:border-pink-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-950/60 border border-pink-200/50 dark:border-pink-800/40 flex items-center justify-center text-xs overflow-hidden select-none shrink-0">
                      {avatarSrc ? (
                        <img src={avatarSrc} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        c.avatar || "👤"
                      )}
                    </span>
                    <span className="font-heading font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {c.nickname}
                      {c.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-pink-500 text-white">
                          Tác Giả
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(c.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                        title="Xóa bình luận"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="font-body text-slate-700 dark:text-slate-300 pl-8 leading-relaxed break-words whitespace-pre-line">
                  {c.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={`Bình luận với tên "${nickname}"...`}
          className="flex-1 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          maxLength={300}
        />
        <button
          type="submit"
          disabled={isSubmitting || !commentText.trim()}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs shadow-pink-500/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
}
