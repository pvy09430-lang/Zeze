import React, { useState, useEffect } from "react";
import { Bot } from "../types";
import { Sparkles, ExternalLink, X, ArrowRight, Bot as BotIcon, Bell } from "lucide-react";
import { getOptimizedImageUrl } from "../lib/cloudinaryUtil";

interface NewBotWeeklyModalProps {
  bots: Bot[];
  isOpen: boolean;
  onClose: () => void;
  onBotClick: (bot: Bot) => void;
  onOpenBotDetail: (botId: string) => void;
}

export default function NewBotWeeklyModal({
  bots,
  isOpen,
  onClose,
  onBotClick,
  onOpenBotDetail
}: NewBotWeeklyModalProps) {
  const [selectedBotIndex, setSelectedBotIndex] = useState(0);

  // Filter bots created or updated in the last 7 days
  const weeklyNewBots = React.useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    return bots
      .filter((bot) => {
        if (!bot.createdAt) return false;
        const botTime = new Date(bot.createdAt).getTime();
        return now - botTime <= sevenDaysMs;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [bots]);

  useEffect(() => {
    if (selectedBotIndex >= weeklyNewBots.length && weeklyNewBots.length > 0) {
      setSelectedBotIndex(0);
    }
  }, [weeklyNewBots.length, selectedBotIndex]);

  if (!isOpen || weeklyNewBots.length === 0) return null;

  const currentBot = weeklyNewBots[selectedBotIndex] || weeklyNewBots[0];
  const primaryLink = currentBot.links && currentBot.links.length > 0 ? currentBot.links[0].url : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-pink-200/80 dark:border-pink-900/60 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top vibrant gradient header */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                🎉 Bot Mới Ra Mắt Trong Tuần!
              </h3>
              <p className="text-[11px] text-pink-100">
                Có {weeklyNewBots.length} nhân vật mới trong 7 ngày qua. Bạn có muốn thử ngay không?
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition cursor-pointer text-white/90 hover:text-white"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Navigation dots if multiple new bots */}
          {weeklyNewBots.length > 1 && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Nhân vật {selectedBotIndex + 1} / {weeklyNewBots.length}
              </span>
              <div className="flex items-center gap-1.5">
                {weeklyNewBots.map((b, idx) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBotIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      selectedBotIndex === idx
                        ? "w-6 bg-pink-500"
                        : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-pink-300"
                    }`}
                    title={b.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bot Card Details */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Thumbnail */}
            <div className="w-full sm:w-36 h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-md relative group">
              {currentBot.imageUrl ? (
                <img
                  src={getOptimizedImageUrl(currentBot.imageUrl, { width: 320, height: 420, quality: 85 })}
                  alt={currentBot.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <BotIcon className="w-10 h-10" />
                </div>
              )}
              <span className={`absolute bottom-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded text-white shadow-sm ${
                currentBot.type === "GL" ? "bg-pink-600" : "bg-purple-600"
              }`}>
                {currentBot.type}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">
                  Ngày ra mắt: {new Date(currentBot.createdAt).toLocaleDateString("vi-VN")}
                </span>
                {/* Bot Name with Beautiful Sharp Italic Typography */}
                <h4 className="font-serif italic font-bold tracking-wide text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                  {currentBot.name}
                </h4>
              </div>

              {/* Author Note / Intro */}
              <p className="font-body text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-4">
                {currentBot.authorNote || "Siêu phẩm Bot AI mới với cốt truyện phong phú và link trò chuyện chính thức!"}
              </p>

              {/* Full list of Tags (Compact & Italic) */}
              {currentBot.tags && currentBot.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 font-serif">
                  {Array.from(new Set(currentBot.tags)).map((tag) => (
                    <span
                      key={tag}
                      className="font-serif italic text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal footer CTA buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            Để sau / Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenBotDetail(currentBot.id);
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 rounded-xl transition cursor-pointer"
            >
              Xem Chi Tiết
            </button>

            {primaryLink ? (
              <a
                href={primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  onBotClick(currentBot);
                  onClose();
                }}
                className="px-5 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <span>Thử Ngay</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={() => {
                  onOpenBotDetail(currentBot.id);
                  onClose();
                }}
                className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <span>Khám Phá</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
