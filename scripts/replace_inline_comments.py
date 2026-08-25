import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

start_marker = "{(!bot.comments || bot.comments.length === 0) ? ("
end_marker = "{/* Comment writer */}"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_content = """{(!bot.comments || bot.comments.length === 0) ? (
                                <p className="text-[11px] text-slate-400 italic text-center py-2">Trải chiếu nằm chờ bình luận đầu tiên...</p>
                              ) : (
                                bot.comments.map((c) => (
                                  <div key={c.id} className="flex gap-2.5">
                                    {/* Avatar */}
                                    <div className="shrink-0 pt-1">
                                        {c.avatar ? (
                                          c.avatar.startswith('data:') ? (
                                            <img src={c.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm shadow-sm">{c.avatar}</div>
                                          )
                                        ) : <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm shadow-sm">🤖</div>}
                                    </div>
                                    
                                    <div className="flex-1 space-y-1">
                                      {/* Comment Bubble */}
                                      <div className={`p-3 rounded-2xl inline-block max-w-[95%] ${
                                        c.isAdmin 
                                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100" 
                                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                                      }`}>
                                        <div className="font-bold flex items-center gap-1.5 flex-wrap text-[11px] mb-0.5">
                                          <span>{c.nickname}</span>
                                          {(() => {
                                            const [bId, tText] = (c.userBadge || "").split("||");
                                            return renderUserBadges(c.nickname, c.isAdmin, tText, bId);
                                          })()}
                                        </div>
                                        <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{c.content}</p>
                                      </div>
                                      
                                      {/* Actions below bubble */}
                                      <div className="flex items-center gap-3 px-2 text-[10px] text-slate-500 font-medium">
                                        <span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleDateString("vi-VN")}</span>
                                        <button 
                                          onClick={() => handleLikeComment(bot.id, c.id)}
                                          className={`hover:underline cursor-pointer ${c.likedUserIds?.includes(userId) ? 'text-rose-500 font-bold' : ''}`}
                                        >
                                          Thích {c.likes ? `(${c.likes})` : ''}
                                        </button>
                                        <button 
                                          onClick={() => setActiveCommentReplyId(activeCommentReplyId === c.id ? null : c.id)}
                                          className="hover:underline cursor-pointer"
                                        >
                                          Trả lời
                                        </button>
                                        {(isAdminUnlocked || (c.userId && c.userId === userId) || (!c.userId && c.nickname === nickname)) && (
                                          <button onClick={() => handleDeleteComment(bot.id, c.id)} className="hover:underline cursor-pointer">Xóa</button>
                                        )}
                                      </div>
                                      
                                      {/* Replies */}
                                      {c.replies && c.replies.length > 0 && (
                                        <div className="mt-3 space-y-3">
                                          {c.replies.map((reply) => (
                                            <div key={reply.id} className="flex gap-2">
                                              <div className="shrink-0 pt-0.5">
                                                {reply.avatar ? (
                                                  reply.avatar.startswith('data:') ? (
                                                    <img src={reply.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover shadow-sm" />
                                                  ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] shadow-sm">{reply.avatar}</div>
                                                  )
                                                ) : <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] shadow-sm">🤖</div>}
                                              </div>
                                              <div className="flex-1 space-y-1">
                                                <div className={`p-2.5 rounded-2xl inline-block max-w-[95%] ${
                                                  reply.isAdmin 
                                                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100" 
                                                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                                                }`}>
                                                  <div className="font-bold flex items-center gap-1.5 flex-wrap text-[10px] mb-0.5">
                                                    <span>{reply.nickname}</span>
                                                    {(() => {
                                                      const [bId, tText] = (reply.userBadge || "").split("||");
                                                      return renderUserBadges(reply.nickname, reply.isAdmin, tText, bId);
                                                    })()}
                                                  </div>
                                                  <p className="text-[11.5px] leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                                                </div>
                                                <div className="flex items-center gap-3 px-2 text-[9px] text-slate-500 font-medium">
                                                  <span className="text-[8px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString("vi-VN")}</span>
                                                  <button 
                                                    onClick={() => {
                                                      setActiveCommentReplyId(c.id);
                                                      const currentText = commentReplyInput[c.id] || "";
                                                      const cleanText = currentText.startswith(`@${reply.nickname}`)
                                                        ? currentText
                                                        : `@${reply.nickname} ` + currentText.replace(/^@[^\s]+\s*/, "");
                                                      setCommentReplyInput({ ...commentReplyInput, [c.id]: cleanText });
                                                    }}
                                                    className="hover:underline cursor-pointer"
                                                  >
                                                    Trả lời
                                                  </button>
                                                  {(isAdminUnlocked || (reply.userId && reply.userId === userId) || (!reply.userId && reply.nickname === nickname) || (c.userId && c.userId === userId) || (!c.userId && c.nickname === nickname)) && (
                                                    <button onClick={() => handleDeleteCommentReply(bot.id, c.id, reply.id)} className="hover:underline cursor-pointer">Xóa</button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Reply Input */}
                                      {activeCommentReplyId === c.id && (
                                        <div className="mt-2 flex gap-1.5 items-center animate-fade-in pl-2">
                                          <input
                                            type="text"
                                            maxLength={120}
                                            placeholder={`Phản hồi lại ${c.nickname}...`}
                                            value={commentReplyInput[c.id] || ""}
                                            onChange={(e) => setCommentReplyInput({ ...commentReplyInput, [c.id]: e.target.value })}
                                            className="flex-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800 text-[11px] dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm"
                                          />
                                          <button
                                            onClick={() => handlePostCommentReply(bot.id, c.id)}
                                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-[10px] font-bold transition cursor-pointer"
                                          >
                                            Gửi
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            """

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text[:start_idx] + new_content + text[end_idx:])

print("Successfully replaced inline comments block")
