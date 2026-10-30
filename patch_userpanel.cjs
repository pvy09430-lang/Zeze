const fs = require('fs');
let content = fs.readFileSync('src/components/UserPanel.tsx', 'utf8');

// 1. Replace state
const stateTarget = `const [sortBy, setSortBy] = useState<"newest" | "popular" | "az">("newest");`;
const stateReplacement = `const [sortBy, setSortBy] = useState<"newest" | "views" | "likes" | "comments" | "az">("newest");`;
content = content.replace(stateTarget, stateReplacement);

// 2. Replace getFilteredBots logic
const sortLogicTarget = `    // Apply manual user selected sorting
    if (sortBy === "newest") {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === "popular") {
      list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === "az") {
      list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
    }`;
const sortLogicReplacement = `    // Apply manual user selected sorting
    if (sortBy === "newest") {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === "views") {
      list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === "likes") {
      list = [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === "comments") {
      list = [...list].sort((a, b) => getBotCommentCount(b) - getBotCommentCount(a));
    } else if (sortBy === "az") {
      list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
    }`;
content = content.replace(sortLogicTarget, sortLogicReplacement);

// 3. Replace select UI
const selectTarget = `<option value="newest">Mới nhất (Newest First)</option>
                  <option value="popular">Yêu thích nhất (Most Popular)</option>
                  <option value="az">Theo bảng chữ cái (A-Z)</option>`;
const selectReplacement = `<option value="newest">Mới nhất (Newest First)</option>
                  <option value="views">Nhiều lượt xem (Most Views)</option>
                  <option value="likes">Nhiều lượt thích (Most Likes)</option>
                  <option value="comments">Nhiều bình luận (Most Comments)</option>
                  <option value="az">Theo bảng chữ cái (A-Z)</option>`;
content = content.replace(selectTarget, selectReplacement);

// 4. Replace Top Trending Section
const topTarget = `            {/* Top Trending Section (Restored) */}
            {(activeTab === "GL" || activeTab === "Futa") && broadCategoryFilter === "all" && searchKeyword === "" && selectedTags.length === 0 && (
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-900/10 dark:via-transparent border border-amber-500/20 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                      Top Bot Được Yêu Thích Nhất
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">TRENDING</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Những siêu phẩm được cộng đồng click nhiều nhất trong tuần</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[...state.bots]
                    .filter(b => b.type === (activeTab === "GL" ? "GL" : "Futa"))
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 3)
                    .map((bot, idx) => (
                      <div 
                        key={\`trending-\${bot.id}\`}
                        onClick={() => {
                          handleBotClick(bot);
                          setExpandedBotId(bot.id);
                        }}
                        className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/50 dark:border-white/5 cursor-pointer hover:scale-[1.03] transition-all flex items-center gap-3 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-xl overflow-hidden border border-slate-200/50 dark:border-white/5">
                          {bot.imageUrl ? (
                            <img src={getOptimizedImageUrl(bot.imageUrl, { width: 100, height: 100 })} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          ) : (
                            idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[11px] text-slate-800 dark:text-slate-100 truncate uppercase tracking-tighter">{bot.name}</p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {bot.views || 0} clicks
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}`;
            
const topReplacement = `            {/* Top Trending Section (Restored) */}
            {(activeTab === "GL" || activeTab === "Futa") && broadCategoryFilter === "all" && searchKeyword === "" && selectedTags.length === 0 && (
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-900/10 dark:via-transparent border border-amber-500/20 rounded-2xl p-5 mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-400 text-white rounded-xl shadow-lg shadow-amber-500/30">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-slate-800 dark:text-slate-100 text-base uppercase tracking-wider flex items-center gap-2">
                        Bảng Xếp Hạng Lượt Xem
                        <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">HOT</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Top những siêu phẩm bot được click nhiều nhất</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[...state.bots]
                    .filter(b => b.type === (activeTab === "GL" ? "GL" : "Futa"))
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 3)
                    .map((bot, idx) => (
                      <div 
                        key={\`trending-\${bot.id}\`}
                        onClick={() => {
                          if (bot.links && bot.links.length > 0) {
                            handleBotClick(bot);
                            window.open(bot.links[0].url, '_blank', 'noopener,noreferrer');
                          } else {
                            handleBotClick(bot);
                            setExpandedBotId(bot.id);
                          }
                        }}
                        className="bg-white/95 dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all flex items-center gap-4 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-3xl"></div>
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                        
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-2xl overflow-hidden border-2 border-amber-100 dark:border-amber-900 shadow-inner relative">
                          {bot.imageUrl ? (
                            <img src={getOptimizedImageUrl(bot.imageUrl, { width: 120, height: 120 })} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white w-5 h-5 flex items-center justify-center rounded-tl-lg text-[10px] font-black z-10 shadow-sm border border-white dark:border-slate-800">
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 relative z-10">
                          <p className="font-black text-xs text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{bot.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <Eye className="w-3 h-3 text-amber-500" /> {bot.views || 0}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <Heart className="w-3 h-3 text-rose-500" /> {bot.likes || 0}
                            </p>
                          </div>
                        </div>
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-400/50 rounded-2xl pointer-events-none transition-colors"></div>
                      </div>
                    ))}
                </div>
              </div>
            )}`;

content = content.replace(topTarget, topReplacement);
fs.writeFileSync('src/components/UserPanel.tsx', content, 'utf8');
console.log('Patched UserPanel.tsx');
