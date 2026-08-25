import React from "react";
import { AppState, getBotCommentCount } from "../types";
import { Facebook, MessageCircle, Flower, Star, Search, ExternalLink, Bot as BotIcon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function AboutAuthor({ 
  state, 
}: { 
  state: AppState, 
  onRefresh: () => void,
  nickname: string
}) {
  const authorSettings = state.authorSettings || {
    authorName: "Tác Giả Ẩn Danh",
    welcomeTitle: "Cổng Chia Sẻ Bot GL & FUTA chất lượng cao!",
    welcomeSubtitle: "Nơi trải nghiệm các bot AI đẳng cấp",
    welcomeIntro: "Chào mừng bạn ghé thăm trang web của mình! Hãy thoải mái tìm kiếm các Bot yêu thích và đóng góp ý kiến để mình ngày càng cải tiến nhé. Tất cả link chat đều trỏ về Google AI Studio.",
    facebookUrl: "https://facebook.com",
    discordUrl: "https://discord.com"
  };

  const topBots = [...state.bots].sort((a,b) => ((b.views || 0) + getBotCommentCount(b) * 2 + (b.likes || 0) * 3) - ((a.views || 0) + getBotCommentCount(a) * 2 + (a.likes || 0) * 3)).slice(0, 6);

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-start">
        <Link to="/" className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-600 transition-colors bg-white/50 dark:bg-slate-900/50 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> TRỞ VỀ TRANG CHỦ
        </Link>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-sky-100 dark:border-white/10 p-8 md:p-12 rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Banner Image */}
        {authorSettings.bannerUrl ? (
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-slate-900/70 z-10"></div>
             <img src={authorSettings.bannerUrl} alt="Cover" className="w-full h-full object-cover blur-sm opacity-50" />
          </div>
        ) : (
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        )}

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 mb-6 bg-gradient-to-tr from-pink-300 via-rose-400 to-red-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-500/20 border-4 border-white dark:border-slate-800 animate-pulse">
            <span className="text-4xl">🌸</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-display font-black bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
            {authorSettings.authorName}
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mb-8">
            {authorSettings.welcomeIntro}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {authorSettings.facebookUrl && (
              <a 
                href={authorSettings.facebookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 dark:hover:text-white transition w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 font-bold border border-blue-500/20"
              >
                <Facebook className="w-5 h-5" />
                <span>Theo dõi trên Facebook</span>
              </a>
            )}
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText("zelig6411");
                alert("Đã sao chép tài khoản Discord: zelig6411");
              }}
              className="px-6 py-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 dark:hover:text-white transition w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 font-bold border border-indigo-500/20"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Discord: zelig6411</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          Dự Án Bot Nổi Bật Nhất
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topBots.length > 0 ? topBots.map((bot, index) => (
            <div key={bot.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex gap-4 hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-305 ease-out group relative overflow-hidden">
               {/* Ambient hover glow sweep */}
               <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-transparent to-cyan-500/0 group-hover:from-cyan-500/[0.015] group-hover:to-cyan-500/[0.035] transition-all duration-700 pointer-events-none"></div>

               <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-amber-500/10 text-amber-500 rounded-bl-xl font-black z-10">
                 #{index + 1}
               </div>

               <div className="w-20 h-28 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 relative border border-slate-200 dark:border-white/5">
                  {bot.imageUrl ? (
                    <img src={bot.imageUrl} alt={bot.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BotIcon className="w-8 h-8 text-slate-300" /></div>
                  )}
               </div>
               <div className="flex flex-col py-1 overflow-hidden">
                 <h4 className="font-bold text-slate-800 dark:text-white truncate">{bot.name}</h4>
                 <div className="flex flex-wrap gap-1 mt-2">
                   {bot.tags.slice(0, 3).map(t => (
                     <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 whitespace-nowrap">{t}</span>
                   ))}
                   {bot.tags.length > 3 && <span className="text-[10px] text-slate-400">+{bot.tags.length - 3}</span>}
                 </div>
                 <div className="mt-auto flex flex-wrap gap-3 text-xs text-slate-500">
                   <span>👁️ {bot.views || 0} lượt xem</span>
                   <span>❤️ {bot.likes || 0} lượt thích</span>
                 </div>
               </div>
            </div>
          )) : (
            <p className="text-slate-500 italic">Chưa có bot nào để hiển thị.</p>
          )}
        </div>
      </div>
    </div>
  );
}
