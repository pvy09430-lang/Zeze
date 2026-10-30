import React, { useState } from "react";
import { BotRequest } from "../types";
import { 
  ThumbsUp, Send, Plus, Sparkles, MessageSquare, Trash2, 
  Search, CornerDownRight, CheckCircle2, User, Clock, ChevronDown, ChevronUp
} from "lucide-react";

interface MasonryRequestsViewProps {
  botRequests: BotRequest[];
  onRefresh: () => void;
  nickname: string;
  avatar: string;
  userId: string;
  isAdminUnlocked?: boolean;
  passcode?: string;
}

export default function MasonryRequestsView({
  botRequests,
  onRefresh,
  nickname,
  avatar,
  userId,
  isAdminUnlocked,
  passcode
}: MasonryRequestsViewProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"GL" | "Futa">("GL");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [openCommentsIds, setOpenCommentsIds] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [localExtraReplies, setLocalExtraReplies] = useState<{ [id: string]: any[] }>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<{ [id: string]: boolean }>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleComments = (id: string) => {
    setOpenCommentsIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "Khách ẩn danh",
          title: title.trim(),
          type,
          description: description.trim(),
          avatar,
          userId
        })
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Gặp lỗi khi gửi đề cử ý tưởng");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (requestId: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (requestId: string) => {
    const text = (replyText[requestId] || "").trim();
    if (!text) return;

    const tempReply = {
      id: "rep_temp_" + Date.now(),
      nickname: nickname || "Khách ẩn danh",
      content: text,
      createdAt: new Date().toISOString(),
      isAdmin: !!isAdminUnlocked,
      avatar
    };

    // Instant optimistic display
    setLocalExtraReplies(prev => ({
      ...prev,
      [requestId]: [...(prev[requestId] || []), tempReply]
    }));
    setReplyText(prev => ({ ...prev, [requestId]: "" }));
    setIsSubmittingReply(prev => ({ ...prev, [requestId]: true }));

    try {
      const res = await fetch(`/api/requests/${requestId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "Khách ẩn danh",
          content: text,
          avatar,
          isAdmin: !!isAdminUnlocked
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReply(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đề cử này?")) return;
    const activePasscode = passcode || (isAdminUnlocked ? "1492007" : "");
    try {
      const res = await fetch(`/api/requests/${id}?passcode=${encodeURIComponent(activePasscode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": activePasscode }
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReply = async (requestId: string, replyId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phản hồi này?")) return;
    const activePasscode = passcode || (isAdminUnlocked ? "1492007" : "");
    try {
      const res = await fetch(`/api/requests/${requestId}/replies/${replyId}?passcode=${encodeURIComponent(activePasscode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": activePasscode }
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Sort by NEWEST FIRST (mấy ý tưởng mới lên đầu)
  const filteredRequests = [...botRequests]
    .filter(req => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      return (
        req.title?.toLowerCase().includes(kw) ||
        req.description?.toLowerCase().includes(kw) ||
        req.nickname?.toLowerCase().includes(kw)
      );
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Banner & Submission Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Góc Sáng Tạo Của Độc Giả
          </div>
          <h2 className="font-heading font-black text-2xl text-slate-900 dark:text-slate-100">
            Đề Xuất Ý Tưởng & Bình Chọn Bot Mới
          </h2>
          <p className="font-body text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Bạn có kịch bản hoặc mẫu nhân vật mong muốn? Hãy đăng đề cử tại đây. Các ý tưởng mới nhất sẽ luôn được hiển thị ở vị trí đầu để bạn đọc dễ dàng thảo luận và bình chọn!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên bot hoặc mẫu nhân vật đề xuất <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 《Song Kính Học Viện》 Nữ thần ngạo kiều..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Model Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thể loại
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("GL")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    type === "GL"
                      ? "bg-pink-500 text-white border-pink-500 shadow-xs shadow-pink-500/20"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  Thuần GL
                </button>
                <button
                  type="button"
                  onClick={() => setType("Futa")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    type === "Futa"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-600/20"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  Futa Model
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Resize Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mô tả chi tiết bối cảnh, ngoại hình và tính cách mong muốn <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              placeholder="Ghi rõ bối cảnh (hiện đại, cổ trang, học đường, tu tiên...), tính cách (lạnh lùng, thê nô, chiếm hữu, ngạo kiều...), cách xưng hô bạn mong muốn..."
              value={description}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.max(110, el.scrollHeight)}px`;
              }}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 text-xs sm:text-sm font-body leading-relaxed rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none min-h-[110px]"
              maxLength={3000}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-sans">
              Khung tự động co giãn chiều cao theo độ dài bài viết
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm shadow-amber-500/20 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Đang gửi..." : "Đăng Ý Tưởng Mới"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Masonry Grid Layout of Bot Requests (Newest First) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Danh Sách Ý Tưởng & Đề Cử Mới Nhất
            <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
              {filteredRequests.length} đề cử
            </span>
          </h3>

          {/* Search bar for ideas */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Tìm ý tưởng, tên bot..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            Chưa có đề cử nào phù hợp với từ khóa tìm kiếm.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 [column-fill:_balance]">
            {filteredRequests.map((req) => {
              const isExpanded = expandedIds.includes(req.id);
              const isLongText = req.description && req.description.length > 200;
              const hasVoted = Array.isArray(req.votedUserIds) && req.votedUserIds.includes(userId);
              const isAuthor = req.nickname === nickname;
              const canDelete = isAdminUnlocked || isAuthor;
              const isCommentsOpen = openCommentsIds.includes(req.id);

              const avatarSrc = req.avatar && (req.avatar.startsWith("data:") || req.avatar.startsWith("http") || req.avatar.startsWith("/"))
                ? req.avatar
                : (req.avatar && req.avatar.length > 30 ? `data:image/png;base64,${req.avatar}` : null);

              const serverReplies = Array.isArray(req.userReplies) ? req.userReplies : [];
              const extraReplies = localExtraReplies[req.id] || [];
              const userReplies = [
                ...serverReplies,
                ...extraReplies.filter(er => !serverReplies.some(sr => sr.id === er.id || (sr.content === er.content && sr.nickname === er.nickname)))
              ];

              return (
                <div
                  key={req.id}
                  className="break-inside-avoid bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-900/60 transition-all duration-300 space-y-3 group"
                >
                  {/* Card Top: Type badge & Upvote Button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      req.type === "GL"
                        ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200/50"
                        : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50"
                    }`}>
                      {req.type}
                    </span>

                    {/* Upvote Button */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleVote(req.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          hasVoted
                            ? "bg-amber-500 text-white shadow-xs shadow-amber-500/20"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-500 hover:text-white"
                        }`}
                        title={hasVoted ? "Bạn đã bình chọn cho ý tưởng này" : "Bình chọn ý tưởng này"}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? "fill-white" : ""}`} />
                        <span className="font-mono tabular-nums">{req.votes || 0}</span>
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          title="Xóa đề cử"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug">
                    {req.title}
                  </h4>

                  {/* Description */}
                  <div className="relative font-body text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                    <div
                      className={`whitespace-pre-line break-words ${
                        !isExpanded && isLongText ? "line-clamp-4 max-h-[5.5rem] overflow-hidden" : ""
                      }`}
                    >
                      {req.description}
                    </div>

                    {!isExpanded && isLongText && (
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {/* Read More button */}
                  {isLongText && (
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline pt-0.5 cursor-pointer block"
                    >
                      {isExpanded ? "▲ Thu gọn" : "▼ Xem thêm bối cảnh"}
                    </button>
                  )}

                  {/* Submitter info */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {avatarSrc ? (
                          <img src={avatarSrc} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          req.avatar || "👤"
                        )}
                      </span>
                      <span className="font-medium text-slate-600 dark:text-slate-400 truncate">
                        {req.nickname}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {/* Developer reply if exists */}
                  {req.reply && (
                    <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-1">
                      <span className="font-heading font-black text-amber-800 dark:text-amber-300 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        👑 Lời Nhắn Từ Tác Giả:
                      </span>
                      <p className="font-body text-slate-700 dark:text-slate-300 text-[11.5px] leading-relaxed">
                        {req.reply}
                      </p>
                    </div>
                  )}

                  {/* COMMENTS SECTION: Collapsible toggle */}
                  {/* When closed: collapsed, only shows comment count button */}
                  {/* When open: shows all comments inside and comment input box */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleComments(req.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCommentsOpen
                            ? "bg-amber-500 text-white font-bold shadow-xs shadow-amber-500/20"
                            : "text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Bình luận ({userReplies.length})</span>
                        {isCommentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isCommentsOpen && (
                        <span className="text-[10px] text-slate-400">
                          {userReplies.length} phản hồi
                        </span>
                      )}
                    </div>

                    {/* Expanded Comments Content */}
                    {isCommentsOpen && (
                      <div className="space-y-2.5 pt-1 animate-fade-in">
                        {/* Nested Replies List */}
                        {userReplies.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1 px-1">
                            Chưa có bình luận nào cho ý tưởng này. Hãy là người đầu tiên thảo luận!
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {userReplies.map((reply) => (
                              <div
                                key={reply.id}
                                className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs space-y-0.5 border border-slate-100 dark:border-slate-850"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-heading font-bold text-[11px] text-slate-800 dark:text-slate-200">
                                    {reply.nickname}
                                    {reply.isAdmin && (
                                      <span className="ml-1 px-1 rounded text-[8px] font-black uppercase bg-rose-500 text-white">
                                        Tác giả
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {new Date(reply.createdAt).toLocaleDateString("vi-VN")}
                                    </span>
                                    {isAdminUnlocked && (
                                      <button
                                        onClick={() => handleDeleteReply(req.id, reply.id)}
                                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition opacity-70 hover:opacity-100"
                                        title="Xóa phản hồi này"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="font-body text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Input Box inside the open card */}
                        <div className="flex gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Viết bình luận, góp ý về ý tưởng này..."
                            value={replyText[req.id] || ""}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [req.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSendReply(req.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            onClick={() => handleSendReply(req.id)}
                            disabled={!replyText[req.id]?.trim()}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition"
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
