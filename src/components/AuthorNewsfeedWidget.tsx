import React, { useState, useEffect, useMemo } from "react";
import { Announcement, Comment } from "../types";
import { 
  Megaphone, Heart, MessageSquare, Send, ChevronDown, ChevronUp, 
  Trash2, CornerDownRight, Sparkles, Loader2
} from "lucide-react";

interface AuthorNewsfeedWidgetProps {
  announcements: Announcement[];
  onRefresh: (silent?: boolean) => void;
  userId: string;
  nickname: string;
  avatar: string;
  isAdminUnlocked?: boolean;
  passcode?: string;
}

export default function AuthorNewsfeedWidget({
  announcements,
  onRefresh,
  userId,
  nickname,
  avatar,
  isAdminUnlocked,
  passcode
}: AuthorNewsfeedWidgetProps) {
  const [openCommentsIds, setOpenCommentsIds] = useState<string[]>([]);
  const [commentInputs, setCommentInputs] = useState<{ [id: string]: string }>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<{ [id: string]: boolean }>({});
  const [expandedTextIds, setExpandedTextIds] = useState<string[]>([]);

  // Instant optimistic like state
  const [localLikedMap, setLocalLikedMap] = useState<Record<string, boolean>>({});
  const [localLikeDeltaMap, setLocalLikeDeltaMap] = useState<Record<string, number>>({});
  const [animatingHeartId, setAnimatingHeartId] = useState<string | null>(null);

  // Optimistic local comments
  const [localExtraComments, setLocalExtraComments] = useState<Record<string, Comment[]>>({});
  const [deletedCommentIds, setDeletedCommentIds] = useState<string[]>([]);

  // Guaranteed persistent device userId for mobile & desktop
  const effectiveUserId = useMemo(() => {
    if (userId && userId.trim()) return userId.trim();
    try {
      let saved = localStorage.getItem("app_user_device_id");
      if (!saved) {
        saved = "u_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("app_user_device_id", saved);
      }
      return saved;
    } catch {
      return "anon_" + Date.now();
    }
  }, [userId]);

  // Load previously liked announcement IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("liked_announcement_ids") || "[]");
      if (Array.isArray(stored)) {
        const initialMap: Record<string, boolean> = {};
        stored.forEach((id: string) => {
          initialMap[id] = true;
        });
        setLocalLikedMap(prev => ({ ...initialMap, ...prev }));
      }
    } catch (e) {
      console.warn("Could not load liked_announcement_ids:", e);
    }
  }, []);

  const toggleComments = (id: string) => {
    setOpenCommentsIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [announcements]);

  const toggleExpandText = (id: string) => {
    setExpandedTextIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Instant 0ms Optimistic Heart / Like Handler
  const handleToggleLike = async (id: string) => {
    const ann = announcements.find(a => a.id === id);
    const serverLiked = Array.isArray(ann?.likedUserIds) && ann.likedUserIds.includes(effectiveUserId);
    const currentlyLiked = localLikedMap[id] !== undefined ? localLikedMap[id] : serverLiked;
    const nextLiked = !currentlyLiked;

    // 1. Instant local update
    setLocalLikedMap(prev => ({ ...prev, [id]: nextLiked }));
    setLocalLikeDeltaMap(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + (nextLiked ? 1 : -1)
    }));

    // Pulse animation
    setAnimatingHeartId(id);
    setTimeout(() => setAnimatingHeartId(null), 400);

    // Save to localStorage immediately
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("liked_announcement_ids") || "[]");
      let nextStored: string[];
      if (nextLiked) {
        nextStored = Array.from(new Set([...stored, id]));
      } else {
        nextStored = stored.filter(x => x !== id);
      }
      localStorage.setItem("liked_announcement_ids", JSON.stringify(nextStored));
    } catch (err) {
      console.warn("localStorage like sync error:", err);
    }

    // 2. Background server update (lightning-fast, never blocking UI)
    try {
      const res = await fetch(`/api/announcements/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: effectiveUserId })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (typeof data.likes === "number") {
          // Sync exact server count smoothly
          setLocalLikeDeltaMap(prev => ({
            ...prev,
            [id]: data.likes - (ann?.likes || 0)
          }));
        }
      }
    } catch (err) {
      console.error("Lỗi gửi tim lên máy chủ:", err);
    }
  };

  // Instant Optimistic Comment Posting
  const handleSendComment = async (annId: string) => {
    const text = (commentInputs[annId] || "").trim();
    if (!text) return;

    const tempCommentId = "temp_" + Date.now();
    const optimisticComment: Comment = {
      id: tempCommentId,
      nickname: nickname || "Bạn đọc ẩn danh",
      content: text,
      createdAt: new Date().toISOString(),
      isAdmin: false,
      avatar: avatar || undefined,
      userId: effectiveUserId
    };

    // 1. Instantly display comment in UI & clear input
    setLocalExtraComments(prev => ({
      ...prev,
      [annId]: [...(prev[annId] || []), optimisticComment]
    }));
    setCommentInputs(prev => ({ ...prev, [annId]: "" }));
    setIsSubmittingComment(prev => ({ ...prev, [annId]: true }));

    // 2. Background server post
    try {
      const res = await fetch(`/api/announcements/${annId}/comments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-passcode": passcode || "1492007"
        },
        body: JSON.stringify({
          nickname: nickname || "Bạn đọc ẩn danh",
          content: text,
          avatar,
          userId: effectiveUserId,
          isAdminComment: false,
          passcode: passcode || "1492007"
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.comment) {
          // Replace temp comment with server confirmed comment
          setLocalExtraComments(prev => ({
            ...prev,
            [annId]: (prev[annId] || []).map(c => c.id === tempCommentId ? data.comment : c)
          }));
        }
      }
    } catch (err) {
      console.error("Lỗi gửi bình luận bản tin:", err);
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [annId]: false }));
    }
  };

  const handleDeleteComment = async (annId: string, commentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    // Optimistically remove comment
    setDeletedCommentIds(prev => [...prev, commentId]);
    setLocalExtraComments(prev => ({
      ...prev,
      [annId]: (prev[annId] || []).filter(c => c.id !== commentId)
    }));

    try {
      await fetch(`/api/announcements/${annId}/comments/${commentId}?passcode=${encodeURIComponent(passcode || "1492007")}&userId=${effectiveUserId}&nickname=${encodeURIComponent(nickname || "")}`, {
        method: "DELETE",
        headers: {
          "x-admin-passcode": passcode || "1492007"
        }
      });
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/10 p-4 shadow-sm space-y-3">
      {/* Header (Mục Độc Giả: không có nút đăng hay xóa tin, chỉ hiển thị thông báo chính thức) */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-xs">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Bảng Tin Tác Giả</span>
              <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300">
                {announcements.length}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Thông báo chính thức từ tác giả
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {(!announcements || announcements.length === 0) && (
        <div className="py-6 px-3 text-center space-y-1">
          <p className="text-xs text-slate-400 italic">
            Chưa có bài tin tức hoặc cập nhật nào từ tác giả.
          </p>
        </div>
      )}

      {/* List of Announcements with Integrated Seamless Comments (Chỉ dành cho độc giả đọc, thả tim, bình luận) */}
      {announcements && announcements.length > 0 && (
        <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
          {sortedAnnouncements.map((ann) => {
            const isCommentsOpen = openCommentsIds.includes(ann.id);
            const isTextExpanded = expandedTextIds.includes(ann.id);

            // Determine optimistic liked status & count
            const serverLiked = Array.isArray(ann.likedUserIds) && ann.likedUserIds.includes(effectiveUserId);
            const isLiked = localLikedMap[ann.id] !== undefined ? localLikedMap[ann.id] : serverLiked;
            const delta = localLikeDeltaMap[ann.id] || 0;
            const totalLikes = Math.max(0, (ann.likes || 0) + delta);

            // Combine server comments + local optimistic extra comments - deleted comments
            const serverComments = (ann.comments || []).filter(c => !deletedCommentIds.includes(c.id));
            const extra = (localExtraComments[ann.id] || []).filter(c => !deletedCommentIds.includes(c.id));
            // De-duplicate in case server already contains extra
            const existingIds = new Set(serverComments.map(c => c.id));
            const comments = [...serverComments, ...extra.filter(c => !existingIds.has(c.id))];

            const isLongContent = ann.content && ann.content.length > 160;
            const isHeartAnimating = animatingHeartId === ann.id;

            return (
              <div
                key={ann.id}
                className="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-2.5 transition hover:border-pink-300 dark:hover:border-pink-900/50 relative group"
              >
                {/* Header with Title & Date (Không có nút xóa ở mục độc giả) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-bold text-pink-600 dark:text-pink-400 font-mono">
                        {new Date(ann.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </span>
                      <span className="text-[9px] text-slate-400">·</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                        Tác Giả
                      </span>
                    </div>
                    <h5 className="font-heading font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 leading-snug">
                      {ann.title}
                    </h5>
                  </div>
                </div>

                {/* Optional attached image */}
                {ann.imageUrl && (
                  <div className="rounded-lg overflow-hidden bg-slate-150 dark:bg-slate-850 max-h-40 border border-slate-200/50 dark:border-slate-700/50">
                    <img
                      src={ann.imageUrl}
                      alt={ann.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content body with expandable toggle if long */}
                <div className="relative font-body text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p className={`whitespace-pre-wrap break-words ${!isTextExpanded && isLongContent ? "line-clamp-4 max-h-[5.5rem] overflow-hidden" : ""}`}>
                    {ann.content}
                  </p>
                  {isLongContent && (
                    <button
                      onClick={() => toggleExpandText(ann.id)}
                      className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline pt-0.5 cursor-pointer block"
                    >
                      {isTextExpanded ? "▲ Thu gọn nội dung" : "▼ Xem đầy đủ bài viết"}
                    </button>
                  )}
                </div>

                {/* Action bar: Heart Like + Integrated Comment Accordion Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/60 text-xs">
                  {/* Instant Heart Like Button */}
                  <button
                    onClick={() => handleToggleLike(ann.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-90 ${
                      isLiked
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                        : "text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                    title={isLiked ? "Bỏ thích bản tin" : "Thả tim bản tin"}
                  >
                    <Heart 
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isLiked ? "fill-rose-500 text-rose-500" : ""
                      } ${isHeartAnimating ? "scale-140 rotate-12" : "scale-100"}`} 
                    />
                    <span className="font-mono text-[11px] font-extrabold">{totalLikes}</span>
                  </button>

                  {/* Comment Accordion Toggle */}
                  <button
                    onClick={() => toggleComments(ann.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-medium ${
                      isCommentsOpen
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-bold"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{comments.length} bình luận</span>
                    {isCommentsOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Integrated Seamless Comments Section */}
                {isCommentsOpen && (
                  <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2.5 animate-fade-in">
                    {/* List of comments */}
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 text-center">
                        Chưa có bình luận nào. Hãy là người đầu tiên để lại lời nhắn! 💬
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                        {comments.map((comment) => {
                          const canDelete = isAdminUnlocked || (comment.userId && comment.userId === effectiveUserId) || (!comment.userId && comment.nickname === nickname);

                          return (
                            <div
                              key={comment.id}
                              className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-2.5 border border-slate-200/50 dark:border-slate-850 text-xs space-y-1 relative group/comment"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {comment.avatar ? (
                                    <img
                                      src={comment.avatar}
                                      alt={comment.nickname}
                                      className="w-4 h-4 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                                      {comment.nickname.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                    {comment.nickname}
                                  </span>
                                  {comment.isAdmin && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                      Tác Giả
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(comment.createdAt).toLocaleTimeString("vi-VN", {
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </span>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteComment(ann.id, comment.id)}
                                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition"
                                      title="Xóa bình luận này"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words pl-5 text-[11.5px] leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Integrated Comment Input Box */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="Viết bình luận cho bản tin này..."
                        value={commentInputs[ann.id] || ""}
                        onChange={(e) =>
                          setCommentInputs(prev => ({
                            ...prev,
                            [ann.id]: e.target.value
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment(ann.id);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 dark:text-white"
                      />
                      <button
                        onClick={() => handleSendComment(ann.id)}
                        disabled={isSubmittingComment[ann.id] || !(commentInputs[ann.id] || "").trim()}
                        className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                      >
                        {isSubmittingComment[ann.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Gửi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
