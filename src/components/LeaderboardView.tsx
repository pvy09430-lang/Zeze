import React, { useState } from "react";
import { Bot } from "../types";
import { 
  Trophy, Medal, Flame, Sparkles, Heart, Eye, MessageSquare, 
  ExternalLink, TrendingUp, Award, ArrowUpRight
} from "lucide-react";

interface LeaderboardViewProps {
  bots: Bot[];
  onBotClick: (bot: Bot) => void;
  onOpenBotDetail?: (botId: string) => void;
}

export default function LeaderboardView({
  bots,
  onBotClick,
  onOpenBotDetail
}: LeaderboardViewProps) {
  const [filterType, setFilterType] = useState<"All" | "GL" | "Futa">("All");

  // Calculate score for ranking: Views + (Likes * 3)
  const getBotScore = (bot: Bot): number => {
    return (bot.views || 0) + ((bot.likes || 0) * 3);
  };

  // Filter bots by type if requested
  const filteredBots = bots.filter(b => filterType === "All" || b.type === filterType);

  // Sorted list from Top 1 to bottom
  const rankedBots = [...filteredBots].sort((a, b) => getBotScore(b) - getBotScore(a));

  // 3-5 Trending Bots in Month (Bots with highest engagement / likes ratio or top views)
  const trendingBots = [...bots]
    .sort((a, b) => {
      // Sort by recent engagement score
      const scoreA = (a.likes || 0) * 5 + (a.views || 0);
      const scoreB = (b.likes || 0) * 5 + (b.views || 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-indigo-500/10 dark:from-amber-950/20 dark:via-pink-950/20 dark:to-indigo-950/20 p-6 sm:p-8 rounded-3xl border border-amber-200/50 dark:border-amber-900/40 relative overflow-hidden shadow-xs">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" /> Bảng Vinh Danh Bot AI
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 tracking-tight">
            Đấu Trường Xếp Hạng Toàn Diện
          </h2>
          <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Quy tụ toàn bộ danh sách Bot GL & FUTA trên một bảng xếp hạng duy nhất. Thứ hạng được tính toán dựa trên tổng hợp lượt xem và mức độ yêu thích từ độc giả.
          </p>
        </div>
      </div>

      {/* TOP SECTION: Bot nổi bật trong tháng (Trending Spotlight 3-4 cards) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Bot Nổi Bật Trong Tháng
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 font-bold uppercase tracking-wider">
                Trending 30 ngày
              </span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingBots.map((bot, index) => {
            const primaryLink = bot.links && bot.links.length > 0 ? bot.links[0] : null;

            return (
              <div
                key={`trending-${bot.id}`}
                className="bg-white/95 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between space-y-3 group relative overflow-hidden"
              >
                {/* Accent Top glow */}
                <div className={`h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${
                  index === 0 ? "from-amber-400 to-rose-400" :
                  index === 1 ? "from-pink-400 to-purple-400" :
                  index === 2 ? "from-cyan-400 to-blue-400" : "from-emerald-400 to-teal-400"
                }`} />

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                    {bot.imageUrl ? (
                      <img 
                        src={bot.imageUrl} 
                        alt={bot.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-pink-50 dark:bg-pink-950/30 text-pink-500 font-bold">
                        {bot.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium uppercase tracking-wider ${
                        bot.type === "GL" 
                          ? "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-200/40" 
                          : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/40"
                      }`}>
                        {bot.type}
                      </span>
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5 ml-auto">
                        <Flame className="w-3 h-3 fill-amber-500" />
                        Top {index + 1}
                      </span>
                    </div>

                    <h4 className="font-serif italic font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                      {bot.name}
                    </h4>
                  </div>
                </div>

                <p className="font-body text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {bot.authorNote || "Không có mô tả chi tiết."}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-sans tabular-nums">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-cyan-500" /> {bot.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> {bot.likes || 0}
                    </span>
                  </div>

                  {primaryLink && (
                    <a
                      href={primaryLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onBotClick(bot)}
                      className="px-2 py-1 rounded-lg bg-pink-50 hover:bg-pink-500 hover:text-white dark:bg-pink-950/40 dark:hover:bg-pink-600 text-pink-600 dark:text-pink-300 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <span>Chat</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & TOP-DOWN FULL LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100">
              Bảng Xếp Hạng Đua Top ({rankedBots.length} Bot)
            </h3>
          </div>

          {/* Quick Sub-filter for Leaderboard */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
            {(["All", "GL", "Futa"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === tab
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab === "All" ? "Tất Cả" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* TOP 1 - 2 - 3 PODIUM CARDS */}
        {rankedBots.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* TOP 2 (SILVER) */}
            {rankedBots[1] && (
              <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100/90 to-white dark:from-slate-800/90 dark:to-slate-900/90 rounded-2xl p-5 border-2 border-slate-300 dark:border-slate-600 shadow-md relative flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1 shadow-xs">
                    <Medal className="w-3.5 h-3.5 text-slate-500" /> TOP 2
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    {getBotScore(rankedBots[1])} điểm
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300">
                    {rankedBots[1].imageUrl ? (
                      <img src={rankedBots[1].imageUrl} alt={rankedBots[1].name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                        {rankedBots[1].name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-pink-600 uppercase">{rankedBots[1].type}</span>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {rankedBots[1].name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>👁️ {rankedBots[1].views}</span>
                      <span>❤️ {rankedBots[1].likes || 0}</span>
                    </div>
                  </div>
                </div>

                {rankedBots[1].links?.[0] && (
                  <a
                    href={rankedBots[1].links[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onBotClick(rankedBots[1])}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold text-center block transition"
                  >
                    Vào Chat Ngay
                  </a>
                )}
              </div>
            )}

            {/* TOP 1 (GOLD) - BIGGEST / HERO CARD */}
            {rankedBots[0] && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-100/90 via-amber-50/50 to-white dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900 rounded-2xl p-6 border-2 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-500/10 relative flex flex-col justify-between space-y-4 md:-translate-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 animate-pulse">
                    <Trophy className="w-4 h-4 fill-slate-950" /> QUÁN QUÂN TOP 1
                  </span>
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-black">
                    {getBotScore(rankedBots[0])} điểm
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-amber-100 dark:bg-amber-900/40 shrink-0 border-2 border-amber-300">
                    {rankedBots[0].imageUrl ? (
                      <img src={rankedBots[0].imageUrl} alt={rankedBots[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-600 text-xl">
                        👑
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">{rankedBots[0].type}</span>
                    <h4 className="font-heading font-black text-base text-slate-900 dark:text-slate-100 truncate">
                      {rankedBots[0].name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono mt-1 font-bold">
                      <span className="flex items-center gap-1">👁️ {rankedBots[0].views}</span>
                      <span className="flex items-center gap-1">❤️ {rankedBots[0].likes || 0}</span>
                      <span className="flex items-center gap-1">💬 {rankedBots[0].comments?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {rankedBots[0].links?.[0] && (
                  <a
                    href={rankedBots[0].links[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onBotClick(rankedBots[0])}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 rounded-xl text-xs font-black text-center block transition shadow-md shadow-amber-500/20"
                  >
                    Trải Nghiệm Top 1 Ngay 👑
                  </a>
                )}
              </div>
            )}

            {/* TOP 3 (BRONZE) */}
            {rankedBots[2] && (
              <div className="order-3 bg-gradient-to-b from-amber-900/10 to-white dark:from-amber-950/40 dark:to-slate-900/90 rounded-2xl p-5 border-2 border-amber-600/50 dark:border-amber-800 shadow-md relative flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-black flex items-center gap-1 shadow-xs">
                    <Medal className="w-3.5 h-3.5 text-amber-700" /> TOP 3
                  </span>
                  <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                    {getBotScore(rankedBots[2])} điểm
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-950/50 shrink-0 border border-amber-600/40">
                    {rankedBots[2].imageUrl ? (
                      <img src={rankedBots[2].imageUrl} alt={rankedBots[2].name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-700">
                        {rankedBots[2].name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-pink-600 uppercase">{rankedBots[2].type}</span>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {rankedBots[2].name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>👁️ {rankedBots[2].views}</span>
                      <span>❤️ {rankedBots[2].likes || 0}</span>
                    </div>
                  </div>
                </div>

                {rankedBots[2].links?.[0] && (
                  <a
                    href={rankedBots[2].links[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onBotClick(rankedBots[2])}
                    className="w-full py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-xl text-xs font-bold text-center block transition"
                  >
                    Vào Chat Ngay
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* TOP-DOWN VERTICAL LIST (FROM TOP 4 TO THE VERY BOTTOM) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs mt-4">
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold text-[11px] grid grid-cols-12 gap-2 items-center">
            <span className="col-span-1 text-center">HẠNG</span>
            <span className="col-span-6 sm:col-span-5">THÔNG TIN BOT</span>
            <span className="col-span-3 sm:col-span-4 text-center">THỐNG KÊ (XEM / TIM / ĐIỂM)</span>
            <span className="col-span-2 text-right pr-2">TRUY CẬP</span>
          </div>

          {rankedBots.map((bot, index) => {
            const rank = index + 1;
            const primaryLink = bot.links && bot.links.length > 0 ? bot.links[0] : null;

            return (
              <div
                key={`rank-row-${bot.id}`}
                className="p-3 sm:p-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 group"
              >
                {/* Rank Number */}
                <div className="col-span-1 flex items-center justify-center">
                  {rank === 1 ? (
                    <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                  ) : rank === 2 ? (
                    <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-slate-100 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                  ) : rank === 3 ? (
                    <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center">
                      3
                    </span>
                  ) : (
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                      #{rank}
                    </span>
                  )}
                </div>

                {/* Bot Info */}
                <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700">
                    {bot.imageUrl ? (
                      <img src={bot.imageUrl} alt={bot.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">
                        {bot.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium uppercase tracking-wider ${
                        bot.type === "GL" 
                          ? "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-200/40" 
                          : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/40"
                      }`}>
                        {bot.type}
                      </span>
                      {bot.tags && bot.tags.map((t, tidx) => (
                        <span key={tidx} className="font-serif italic text-[9px] text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <h4 className="font-serif italic font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                      {bot.name}
                    </h4>
                  </div>
                </div>

                {/* Stats */}
                <div className="col-span-3 sm:col-span-4 flex items-center justify-center gap-2 sm:gap-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1" title="Lượt xem">
                    <Eye className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{bot.views || 0}</span>
                  </span>
                  <span className="flex items-center gap-1" title="Lượt thích">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>{bot.likes || 0}</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400" title="Điểm tổng">
                    <Award className="w-3.5 h-3.5" />
                    <span>{getBotScore(bot)}đ</span>
                  </span>
                </div>

                {/* Chat Action */}
                <div className="col-span-2 flex items-center justify-end pr-2">
                  {primaryLink ? (
                    <a
                      href={primaryLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onBotClick(bot)}
                      className="px-2.5 sm:px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white dark:bg-pink-950/40 dark:hover:bg-pink-500 dark:text-pink-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Mở cổng chat"
                    >
                      <span className="hidden sm:inline">Trò chuyện</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Đang cập nhật</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
