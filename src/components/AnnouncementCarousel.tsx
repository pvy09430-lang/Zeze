import React, { useState, useRef } from "react";
import { Announcement, Bot } from "../types";
import { 
  Megaphone, Heart, MessageSquare, ChevronLeft, ChevronRight, 
  Sparkles, ExternalLink, Bot as BotIcon, ArrowRight, Bell
} from "lucide-react";

interface AnnouncementCarouselProps {
  announcements: Announcement[];
  bots?: Bot[];
  onRefresh: () => void;
  userId: string;
  nickname: string;
  avatar: string;
  isAdminUnlocked?: boolean;
  passcode?: string;
  activeDiscussionId: string | null;
  onSelectDiscussion: (id: string | null) => void;
  onBotClick?: (bot: Bot) => void;
}

export default function AnnouncementCarousel({
  announcements,
  bots = [],
  onRefresh,
  userId,
  nickname,
  activeDiscussionId,
  onSelectDiscussion,
  onBotClick
}: AnnouncementCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isLikingId, setIsLikingId] = useState<string | null>(null);

  // Scroll controls
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Like handler for manual announcements
  const handleToggleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikingId) return;
    setIsLikingId(id);
    try {
      const res = await fetch(`/api/announcements/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId || nickname })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Lỗi thả tim bản tin:", err);
    } finally {
      setIsLikingId(null);
    }
  };

  // Generate automated new bot announcement cards from the newest bots
  const sortedRecentBots = [...bots]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);

  // Combine automatic bot notifications and author announcements
  const totalItemsCount = sortedRecentBots.length + announcements.length;

  return (
    <section className="relative w-full space-y-3">
      {/* Header bar: Automatic New Bot Notifications (Buttons moved to Author section) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Thông Báo Bot Mới Tự Động</span>
              <span className="text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800/60 flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Tự Động Cập Nhật
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hệ thống tự động đồng bộ và hiển thị ngay khi có nhân vật bot AI mới ra mắt
            </p>
          </div>
        </div>

        {/* Carousel Scroll Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-90"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-90"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      {totalItemsCount === 0 ? (
        <div className="p-6 text-center bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
          Chưa có bot mới hoặc thông báo nào.
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-2 pt-1 px-1 snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* 1. Automated New Bot Cards */}
          {sortedRecentBots.map((bot, idx) => {
            const isFirst = idx === 0;
            const primaryLink = bot.links && bot.links.length > 0 ? bot.links[0].url : "";

            return (
              <div
                key={`auto-bot-${bot.id}`}
                className="w-[300px] sm:w-[350px] shrink-0 snap-start bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-pink-400 dark:hover:border-pink-800/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs relative group"
              >
                {/* Top Banner accent */}
                <div className={`h-1.5 w-full ${
                  bot.type === "GL" 
                    ? "bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300"
                    : "bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400"
                }`} />

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Card Header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-sans flex items-center gap-1 ${
                          bot.type === "GL"
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {bot.type === "GL" ? "Bot Thuần GL" : "Bot Futa"}
                        </span>
                        {isFirst && (
                          <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                            Mới Nhất 🔥
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(bot.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit"
                        })}
                      </span>
                    </div>

                    {/* Bot Name with Beautiful Sharp Italic Typography */}
                    <h4 className="font-serif italic font-bold tracking-wide text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      {bot.name}
                    </h4>
                  </div>

                  {/* Thumbnail & Note */}
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 relative shadow-2xs">
                      {bot.imageUrl ? (
                        <img
                          src={bot.imageUrl}
                          alt={bot.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BotIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {bot.authorNote || "Siêu phẩm Bot AI vừa được cập nhật link trò chuyện chính thức!"}
                      </p>
                    </div>
                  </div>

                  {/* ALL Tags of this Bot - Beautiful, Sharp, Italic & Compact */}
                  {bot.tags && bot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 font-serif">
                      {Array.from(new Set(bot.tags)).map((t) => (
                        <span
                          key={t}
                          className="font-serif italic text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>👁️ {bot.views || 0}</span>
                      <span>❤️ {bot.likes || 0}</span>
                    </div>

                    {primaryLink ? (
                      <a
                        href={primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onBotClick?.(bot)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-pink-500/20 cursor-pointer transition active:scale-95"
                      >
                        <span>Chat Ngay</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => onBotClick?.(bot)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>Xem Chi Tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 2. Official Author Announcements (if any) */}
          {announcements.map((ann) => {
            const isExpanded = !!expandedIds[ann.id];
            const isLiked = Array.isArray(ann.likedUserIds) && ann.likedUserIds.includes(userId || nickname);
            const isDiscussionOpen = activeDiscussionId === ann.id;
            const commentsCount = Array.isArray(ann.comments) ? ann.comments.length : 0;
            const isLongText = ann.content && ann.content.length > 180;

            return (
              <div
                key={ann.id}
                className={`w-[300px] sm:w-[350px] shrink-0 snap-start bg-white dark:bg-slate-900/90 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs relative group ${
                  isDiscussionOpen
                    ? "border-pink-500 ring-2 ring-pink-500/20 shadow-md shadow-pink-500/10"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-900/60 hover:shadow-md"
                }`}
              >
                {/* Top Banner accent */}
                <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 w-full" />

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/40">
                        👑 Bản Tin Tác Giả
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ann.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit"
                        })}
                      </span>
                    </div>

                    <h4 className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                      {ann.title}
                    </h4>
                  </div>

                  {ann.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 max-h-36 border border-slate-200/50 dark:border-slate-800">
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

                  <div className="relative font-body text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <div
                      className={`whitespace-pre-line break-words ${
                        !isExpanded && isLongText ? "line-clamp-3 max-h-[4.5rem] overflow-hidden" : ""
                      }`}
                    >
                      {ann.content}
                    </div>
                    {!isExpanded && isLongText && (
                      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {isLongText && (
                    <button
                      onClick={() => toggleExpand(ann.id)}
                      className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline self-start cursor-pointer pt-0.5"
                    >
                      {isExpanded ? "Thu gọn ▲" : "Xem thêm ▼"}
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={(e) => handleToggleLike(ann.id, e)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isLiked
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                          : "text-slate-500 hover:text-rose-600 hover:bg-rose-50/50"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span className="font-mono">{ann.likes || 0}</span>
                    </button>

                    <button
                      onClick={() => onSelectDiscussion(isDiscussionOpen ? null : ann.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDiscussionOpen
                          ? "bg-pink-500 text-white shadow-xs shadow-pink-500/20"
                          : "bg-pink-50/80 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/50 hover:bg-pink-500 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Thảo luận ({commentsCount})</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
