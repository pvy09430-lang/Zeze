import React, { useState, useEffect } from "react";
import { AppState, Bot, Announcement, Feedback, BotRequest, Comment, getBotCommentCount } from "../types";
import { getOptimizedImageUrl } from "../lib/cloudinaryUtil";
import { 
  Search, Calendar, Star, History, MessageSquare, Heart, Compass, Send, 
  HelpCircle, Sparkles, Navigation, ChevronDown, Check, RefreshCw, Eye, ExternalLink,
  Facebook, MessagesSquare, ThumbsUp, UserPlus, Smile, Bot as BotIcon, MessageCircle, X,
  Trash2, ArrowUpDown, Award, Plus, Clock, ChevronRight, Share2,
  TrendingUp, ZoomIn, Trophy, Flame, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BadgeStoreModal } from "./BadgeStoreModal";
import AuthorNewsfeedWidget from "./AuthorNewsfeedWidget";
import LeaderboardView from "./LeaderboardView";
import MasonryFeedbackView from "./MasonryFeedbackView";
import MasonryRequestsView from "./MasonryRequestsView";

interface UserPanelProps {
  state: AppState;
  onRefresh: (silent?: boolean) => void;
  onUpdateState?: (newState: AppState) => void;
  nickname: string;
  avatar: string;
  onOpenLogin: () => void;
  userId: string;
  isAdminUnlocked?: boolean;
  passcode?: string;
  loading?: boolean;
}

function BotSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 p-5 rounded-2xl flex flex-col justify-between animate-pulse relative overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* Left Thumbnail Skeleton */}
        <div className="w-full sm:w-48 md:w-52 lg:w-60 xl:w-64 h-64 sm:h-72 md:h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0" />
        
        {/* Right Content Skeleton */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="flex flex-wrap gap-1">
            <div className="h-3.5 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-8 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="space-y-1.5 pt-1 hidden sm:block">
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-2.5 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </div>

      {/* Bottom Actions Skeleton */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3.5 mt-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

const BotCardSkeleton = BotSkeleton;

function UserPanel({
  state,
  onRefresh,
  onUpdateState,
  nickname,
  avatar,
  onOpenLogin,
  userId,
  isAdminUnlocked,
  passcode,
  loading
}: UserPanelProps) {
  // Navigation & Sub-tabs (No "All" tab - GL is default)
  const [activeTab, setActiveTab] = useState<"GL" | "Futa" | "Leaderboard" | "Feedback" | "Requests" | "Bookmarks">("GL");

  // Search & Filters State
  const [searchKeyword, setSearchKeyword] = useState("");
  const [localSearchKeyword, setLocalSearchKeyword] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);



  // Debounce searchKeyword to prevent heavy re-renders while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeyword(localSearchKeyword);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearchKeyword]);

  // Tag filter states: Included tags (+) and Excluded tags (-)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(12);
  }, [activeTab, searchKeyword, selectedTags, excludedTags, timeFilter]);
  const [requestSearchKeyword, setRequestSearchKeyword] = useState("");
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<string[]>([]);


  // Liked comment & reply IDs state stored in localStorage
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("liked_comment_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("liked_comment_ids", JSON.stringify(likedCommentIds));
    } catch (e) {
      console.error("Error saving liked_comment_ids:", e);
    }
  }, [likedCommentIds]);

  // Custom Option States for Polls
  const [customOptionText, setCustomOptionText] = useState<{[pollId: string]: string}>({});
  const [addingOptionPollId, setAddingOptionPollId] = useState<string | null>(null);

  // User Local Storage states (Favorites/Bookmarks & View History)
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [viewedHistory, setViewedHistory] = useState<{ id: string; timestamp: string }[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().getTime());

  // Count newly added bots
  const newBotsCount = state.bots.filter(b => (!bookmarks.includes(b.id)) && new Date(b.createdAt).getTime() > lastSyncTime).length;

  // Feedback Submission Form
  const [fbContent, setFbContent] = useState("");
  const [fbAnonymous, setFbAnonymous] = useState(false);
  const [fbStatus, setFbStatus] = useState({ success: false, error: "" });

  // Bot Idea Request Submission Form
  const [reqTitle, setReqTitle] = useState("");
  const [reqType, setReqType] = useState<"GL" | "Futa">("GL");
  const [reqDesc, setReqDesc] = useState("");
  const [reqStatus, setReqStatus] = useState({ success: false, error: "" });

  // Bot comments state
  const [commentInput, setCommentInput] = useState<{ [botId: string]: string }>({});

  // Collapsed details state
  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);

  const [copiedBotId, setCopiedBotId] = useState<string | null>(null);

  // Auto expand bot if botId is provided in URL query params
  useEffect(() => {
    if (state.bots && state.bots.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const urlBotId = params.get("botId");
      if (urlBotId) {
        const target = state.bots.find(b => b.id === urlBotId);
        if (target) {
          setExpandedBotId(urlBotId);
          setTimeout(() => {
            const el = document.getElementById(`bot-card-${urlBotId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 600);
        }
      }
    }
  }, [state.bots]);

  // Custom Badge & Title states
  const [isBadgeStoreOpen, setIsBadgeStoreOpen] = useState(false);
  const [equippedBadge, setEquippedBadge] = useState<string>(() => {
    return localStorage.getItem(`selected_user_badge_${nickname || "anonymous"}`) || "";
  });
  const [equippedTitle, setEquippedTitle] = useState<string>(() => {
    return localStorage.getItem(`selected_user_title_${nickname || "anonymous"}`) || "";
  });

  // Sync state when nickname changes
  useEffect(() => {
    const userKey = nickname || "anonymous";
    setEquippedBadge(localStorage.getItem(`selected_user_badge_${userKey}`) || "");
    setEquippedTitle(localStorage.getItem(`selected_user_title_${userKey}`) || "");
  }, [nickname]);

  const handleEquipBadge = (badge: string) => {
    const userKey = nickname || "anonymous";
    localStorage.setItem(`selected_user_badge_${userKey}`, badge);
    setEquippedBadge(badge);
  };

  const handleEquipTitle = (title: string) => {
    const userKey = nickname || "anonymous";
    localStorage.setItem(`selected_user_title_${userKey}`, title);
    setEquippedTitle(title);
  };

  // Dynamic tags extraction: extract most frequent/popular tags actually used on the bots
  const getDynamicSuggestedTags = (type: "GL" | "Futa") => {
    const botsOfType = state.bots.filter(b => b.type === type);
    const tagCounts: { [tag: string]: number } = {};
    botsOfType.forEach(bot => {
      if (bot.tags) {
        (bot.tags || []).forEach(tag => {
          const cleanTag = tag.trim();
          if (cleanTag) {
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
          }
        });
      }
    });

    // Sort by frequency (most popular first) and return all tags
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  };

  const glSuggestedTags = React.useMemo(() => getDynamicSuggestedTags("GL"), [state.bots]);
  const futaSuggestedTags = React.useMemo(() => getDynamicSuggestedTags("Futa"), [state.bots]);

  // Load favorites & viewed history on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("cl_portal_bookmarks");
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }

    const savedHistory = localStorage.getItem("cl_portal_history");
    if (savedHistory) {
      setViewedHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Sync visitor logs on visit/tab changes (Removed to avoid spam)
  useEffect(() => {
    // Only fetch state on tab change if needed, but no longer posting spam logs
  }, [activeTab]);

  // Click handler to register out-link visit & bookmark view history
  const handleBotClick = async (bot: Bot) => {

    // Increment click quest stats
    const userKey = nickname || "anonymous";
    const currentClicks = parseInt(localStorage.getItem(`quest_clicks_${userKey}`) || "0", 10);
    localStorage.setItem(`quest_clicks_${userKey}`, (currentClicks + 1).toString());

    // 1. Send view metric log to server
    try {
      await fetch(`/api/bots/${bot.id}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }

    // 2. Refresh local view history
    const isAlreadyLogged = viewedHistory.some(item => item.id === bot.id);
    const updatedHistory = [{ id: bot.id, timestamp: new Date().toISOString() }, ...viewedHistory.filter(item => item.id !== bot.id)].slice(0, 50);
    setViewedHistory(updatedHistory);
    localStorage.setItem("cl_portal_history", JSON.stringify(updatedHistory));
  };

  const handleToggleBookmark = (botId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (bookmarks.includes(botId)) {
      updated = bookmarks.filter(id => id !== botId);
    } else {
      updated = [...bookmarks, botId];
    }
    setBookmarks(updated);
    localStorage.setItem("cl_portal_bookmarks", JSON.stringify(updated));
  };

  // Submit dynamic comment to bot (Optimized to be optimistic without delay)
  const handleLikeBot = async (botId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert("Bạn cần ID hợp lệ để thích bài đăng!");
      return;
    }

    // Find target bot to calculate next optimistic state
    const targetBot = state.bots.find(b => b.id === botId);
    if (!targetBot) return;

    const likedUserIds = targetBot.likedUserIds || [];
    const isLiked = likedUserIds.includes(userId);
    const newLikedUserIds = isLiked 
      ? likedUserIds.filter(id => id !== userId) 
      : [...likedUserIds, userId];
    const newLikesCount = isLiked 
      ? Math.max(0, (targetBot.likes || 0) - 1) 
      : (targetBot.likes || 0) + 1;

    // 1. Optimistically update local UI state immediately
    if (onUpdateState) {
      const updatedBots = state.bots.map(b => {
        if (b.id === botId) {
          return { ...b, likes: newLikesCount, likedUserIds: newLikedUserIds };
        }
        return b;
      });
      onUpdateState({ ...state, bots: updatedBots });
    }

    // Immediately update local liked list in localStorage
    const localLikedListKey = `liked_bots_${userId || nickname}`;
    let localLikedList: string[] = [];
    try {
      localLikedList = JSON.parse(localStorage.getItem(localLikedListKey) || "[]");
    } catch {
      localLikedList = [];
    }
    if (isLiked) {
      localLikedList = localLikedList.filter(id => id !== botId);
    } else {
      localLikedList.push(botId);
    }
    localStorage.setItem(localLikedListKey, JSON.stringify(localLikedList));

    // Save like quest stats (optional, left for backwards compatibility)
    const userKey = nickname || "anonymous";
    const currentLikes = parseInt(localStorage.getItem(`quest_likes_${userKey}`) || "0", 10);
    localStorage.setItem(`quest_likes_${userKey}`, (currentLikes + 1).toString());

    // 2. Perform background API call
    try {
      const response = await fetch(`/api/bots/${botId}/like`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nickname })
      });
      
      if (response.ok) {
        const data = await response.json(); // contains { success: true, likes, likedUserIds }
        // Silently sync exact server state
        if (onUpdateState) {
          const updatedBots = state.bots.map(b => {
            if (b.id === botId) {
              return { ...b, likes: data.likes, likedUserIds: data.likedUserIds };
            }
            return b;
          });
          onUpdateState({ ...state, bots: updatedBots });
        }
      } else {
        // Rollback state if server rejects
        if (onUpdateState) {
          const updatedBots = state.bots.map(b => {
            if (b.id === botId) {
              return { ...b, likes: targetBot.likes, likedUserIds: targetBot.likedUserIds };
            }
            return b;
          });
          onUpdateState({ ...state, bots: updatedBots });
        }
        const error = await response.json();
        alert(error.error || "Gặp lỗi khi thích!");
      }
    } catch (err) {
      console.error("Lỗi tim bài đăng:", err);
      // Rollback state if network fails
      if (onUpdateState) {
        const updatedBots = state.bots.map(b => {
          if (b.id === botId) {
            return { ...b, likes: targetBot.likes, likedUserIds: targetBot.likedUserIds };
          }
          return b;
        });
        onUpdateState({ ...state, bots: updatedBots });
      }
    }
  };

  const handlePostComment = async (botId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInput[botId];
    if (!text || !text.trim()) return;

    const userKey = nickname || "anonymous";
    const userBadge = localStorage.getItem(`selected_user_badge_${userKey}`) || "";
    const userTitle = localStorage.getItem(`selected_user_title_${userKey}`) || "";
    const encodedBadge = `${userBadge}||${userTitle}`;

    try {
      const response = await fetch(`/api/bots/${botId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          content: text.trim(),
          avatar: avatar,
          userId: userId,
          userBadge: encodedBadge
        })
      });

      if (response.ok) {
        // Increment comment quest stats
        const currentComments = parseInt(localStorage.getItem(`quest_comments_${userKey}`) || "0", 10);
        localStorage.setItem(`quest_comments_${userKey}`, (currentComments + 1).toString());

        setCommentInput({ ...commentInput, [botId]: "" });
        onRefresh(true);
      } else {
        alert("Có lỗi xảy ra khi truyền bình luận!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit like for comment (Optimized to be fully optimistic without delay)
  const handleLikeComment = async (botId: string, commentId: string) => {
    // Save/toggle in localStorage likedCommentIds
    setLikedCommentIds(prev =>
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );

    if (!userId) return;

    // Find bot and target comment
    const targetBot = state.bots.find(b => b.id === botId);
    if (!targetBot) return;
    const targetComment = targetBot.comments.find(c => c.id === commentId);
    if (!targetComment) return;

    const likedUserIds = targetComment.likedUserIds || [];
    const isLiked = likedUserIds.includes(userId);
    const newLikedUserIds = isLiked 
      ? likedUserIds.filter(id => id !== userId) 
      : [...likedUserIds, userId];
    const newLikesCount = isLiked 
      ? Math.max(0, (targetComment.likes || 0) - 1) 
      : (targetComment.likes || 0) + 1;

    // 1. Optimistically update main app state
    if (onUpdateState) {
      const updatedBots = state.bots.map(b => {
        if (b.id === botId) {
          const updatedComments = b.comments.map(c => {
            if (c.id === commentId) {
              return { ...c, likes: newLikesCount, likedUserIds: newLikedUserIds };
            }
            return c;
          });
          return { ...b, comments: updatedComments };
        }
        return b;
      });
      onUpdateState({ ...state, bots: updatedBots });
    }

    // 2. Perform background API call
    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        // Rollback on server failure
        if (onUpdateState) {
          const updatedBots = state.bots.map(b => {
            if (b.id === botId) {
              const updatedComments = b.comments.map(c => {
                if (c.id === commentId) {
                  return { ...c, likes: targetComment.likes, likedUserIds: targetComment.likedUserIds };
                }
                return c;
              });
              return { ...b, comments: updatedComments };
            }
            return b;
          });
          onUpdateState({ ...state, bots: updatedBots });
        }
      }
    } catch (err) {
      console.error("Lỗi tim bình luận:", err);
    }
  };

  // Submit like for comment reply (Optimized to be fully optimistic without delay)
  const handleLikeCommentReply = async (botId: string, commentId: string, replyId: string) => {
    // Save/toggle in localStorage likedCommentIds
    setLikedCommentIds(prev =>
      prev.includes(replyId) ? prev.filter(id => id !== replyId) : [...prev, replyId]
    );

    if (!userId) return;

    const targetBot = state.bots.find(b => b.id === botId);
    if (!targetBot) return;
    const targetComment = targetBot.comments.find(c => c.id === commentId);
    if (!targetComment) return;
    if (!targetComment.replies) return;
    const targetReply = targetComment.replies.find(r => r.id === replyId);
    if (!targetReply) return;

    const likedUserIds = targetReply.likedUserIds || [];
    const isLiked = likedUserIds.includes(userId);
    const newLikedUserIds = isLiked 
      ? likedUserIds.filter(id => id !== userId) 
      : [...likedUserIds, userId];
    const newLikesCount = isLiked 
      ? Math.max(0, (targetReply.likes || 0) - 1) 
      : (targetReply.likes || 0) + 1;

    const createUpdatedBotsState = (likesVal: number, likedUsersVal: string[]) => {
      return state.bots.map(b => {
        if (b.id === botId) {
          const updatedComments = b.comments.map(c => {
            if (c.id === commentId) {
              const updatedReplies = (c.replies || []).map(r => {
                if (r.id === replyId) {
                  return { ...r, likes: likesVal, likedUserIds: likedUsersVal };
                }
                return r;
              });
              return { ...c, replies: updatedReplies };
            }
            return c;
          });
          return { ...b, comments: updatedComments };
        }
        return b;
      });
    };

    if (onUpdateState) {
      onUpdateState({ ...state, bots: createUpdatedBotsState(newLikesCount, newLikedUserIds) });
    }

    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}/replies/${replyId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        if (onUpdateState) {
          onUpdateState({ ...state, bots: createUpdatedBotsState(targetReply.likes || 0, targetReply.likedUserIds || []) });
        }
      }
    } catch (err) {
      console.error("Lỗi tim phản hồi bình luận:", err);
    }
  };

  // Delete comment (User can delete their own; Admin can delete any)
  const handleDeleteComment = async (botId: string, commentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}?userId=${encodeURIComponent(userId)}&nickname=${encodeURIComponent(nickname)}&passcode=${encodeURIComponent(passcode || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onRefresh(true);
      } else {
        const error = await response.json();
        alert(error.error || "Gặp lỗi khi xóa bình luận!");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const [commentReplyInput, setCommentReplyInput] = useState<{ [commentId: string]: string }>({});
  const [activeCommentReplyId, setActiveCommentReplyId] = useState<string | null>(null);

  const handlePostCommentReply = async (botId: string, commentId: string) => {
    const text = commentReplyInput[commentId];
    if (!text || !text.trim()) return;

    const userKey = nickname || "anonymous";
    const userBadge = localStorage.getItem(`selected_user_badge_${userKey}`) || "";
    const userTitle = localStorage.getItem(`selected_user_title_${userKey}`) || "";
    const encodedBadge = `${userBadge}||${userTitle}`;

    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          content: text.trim(),
          avatar: avatar,
          userId: userId,
          isAdminComment: isAdminUnlocked,
          userBadge: encodedBadge
        })
      });

      if (response.ok) {
        // Increment comment quest stats
        const currentComments = parseInt(localStorage.getItem(`quest_comments_${userKey}`) || "0", 10);
        localStorage.setItem(`quest_comments_${userKey}`, (currentComments + 1).toString());

        setCommentReplyInput({ ...commentReplyInput, [commentId]: "" });
        setActiveCommentReplyId(null);
        onRefresh(true);
      } else {
        alert("Có lỗi xảy ra khi gửi trả lời!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCommentReply = async (botId: string, commentId: string, replyId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phản hồi này không?")) return;
    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}/replies/${replyId}?userId=${encodeURIComponent(userId)}&nickname=${encodeURIComponent(nickname)}&passcode=${encodeURIComponent(passcode || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onRefresh(true);
      } else {
        const error = await response.json();
        alert(error.error || "Gặp lỗi khi xóa phản hồi!");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackContent, setEditingFeedbackContent] = useState("");
  const [userReplyInput, setUserReplyInput] = useState<{ [id: string]: string }>({});

  const handleEditFeedback = async (id: string) => {
    if (!editingFeedbackContent.trim()) return;
    try {
      const response = await fetch(`/api/feedbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content: editingFeedbackContent.trim() })
      });
      if (response.ok) {
        setEditingFeedbackId(null);
        setEditingFeedbackContent("");
        onRefresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Sửa phản hồi thất bại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phản hồi này?")) return;
    try {
      const headers: Record<string, string> = { "x-nickname": nickname };
      if (isAdminUnlocked && passcode) {
        headers["x-admin-passcode"] = passcode;
      }
      const response = await fetch(`/api/feedbacks/${id}`, {
        method: "DELETE",
        headers
      });
      if (response.ok) {
        onRefresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Xóa phản hồi thất bại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserReplyFeedback = async (id: string) => {
    const replyText = userReplyInput[id];
    if (!replyText || !replyText.trim()) return;

    try {
      const response = await fetch(`/api/feedbacks/${id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nickname, 
          content: replyText.trim(), 
          avatar, 
          isAdmin: isAdminUnlocked,
          userId,
          passcode: passcode || ""
        })
      });
      if (response.ok) {
        setUserReplyInput({ ...userReplyInput, [id]: "" });
        onRefresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Gửi trả lời thất bại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Feedback Form (anonymous or not)
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbStatus({ success: false, error: "" });

    if (!fbContent.trim()) {
      setFbStatus({ success: false, error: "Nội dung phản hồi không được rỗng!" });
      return;
    }

    const userKey = nickname || "anonymous";
    const userBadge = localStorage.getItem(`selected_user_badge_${userKey}`) || "";
    const userTitle = localStorage.getItem(`selected_user_title_${userKey}`) || "";
    const encodedBadge = `${userBadge}||${userTitle}`;

    try {
      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          isAnonymous: fbAnonymous,
          content: fbContent.trim(),
          userId,
          userBadge: encodedBadge
        })
      });

      if (response.ok) {
        setFbContent("");
        setFbStatus({ success: true, error: "" });
        onRefresh();
      } else {
        setFbStatus({ success: false, error: "Gửi phản hồi thất bại." });
      }
    } catch (err) {
      setFbStatus({ success: false, error: "Không thể kết nối đến máy chủ." });
    }
  };

  // Submit Upcoming Bot proposal
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqStatus({ success: false, error: "" });

    if (!reqTitle.trim() || !reqDesc.trim()) {
      setReqStatus({ success: false, error: "Vui lòng điền đủ tên bot và mô tả gợi ý." });
      return;
    }

    const userKey = nickname || "anonymous";
    const userBadge = localStorage.getItem(`selected_user_badge_${userKey}`) || "";
    const userTitle = localStorage.getItem(`selected_user_title_${userKey}`) || "";
    const encodedBadge = `${userBadge}||${userTitle}`;

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          title: reqTitle.trim(),
          type: reqType,
          description: reqDesc.trim(),
          avatar: avatar,
          userBadge: encodedBadge
        })
      });

      if (response.ok) {
        setReqTitle("");
        setReqDesc("");
        setReqStatus({ success: true, error: "" });
        onRefresh();
      } else {
        setReqStatus({ success: false, error: "Truyền ý kiến thất bại." });
      }
    } catch (err) {
      setReqStatus({ success: false, error: "Không kết nối được server." });
    }
  };

  // Submit vote for bot suggestions
  const handleVoteRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit back-and-forth user reply to a request
  const handlePostRequestReply = async (requestId: string, content: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          content,
          isAdmin: isAdminUnlocked,
          avatar: avatar
        })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Suggestion / Recommendation Engine based on user viewing history
  // Scans history, calculates if GL or Futa is viewed more, then suggests top-rated bots of that genre that they haven't bookmarked
  const getDynamicSuggestions = (): Bot[] => {
    if (viewedHistory.length === 0) {
      // If no history, suggest the most viewed bots overalls
      return [...state.bots].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
    }

    let glCount = 0;
    let futaCount = 0;

    viewedHistory.forEach(historyItem => {
      const bot = state.bots.find(b => b.id === historyItem.id);
      if (bot) {
        if (bot.type === "GL") glCount++;
        if (bot.type === "Futa") futaCount++;
      }
    });

    const preferredType = glCount >= futaCount ? "GL" : "Futa";
    
    // Filter bots of preferredType that they haven't bookmarked yet
    const recommended = state.bots.filter(
      b => b.type === preferredType && !bookmarks.includes(b.id)
    );

    if (recommended.length > 0) {
      return recommended.slice(0, 3);
    }

    // Fallback: recommend top 3 of state
    return state.bots.slice(0, 3);
  };

  // 3-state tag toggle: Unselected -> Included (+) -> Excluded (-) -> Unselected
  const handleToggleTagFilter = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Switch from Included (+) to Excluded (-)
      setSelectedTags(prev => prev.filter(t => t !== tag));
      setExcludedTags(prev => [...prev, tag]);
    } else if (excludedTags.includes(tag)) {
      // Switch from Excluded (-) to Unselected
      setExcludedTags(prev => prev.filter(t => t !== tag));
    } else {
      // Switch from Unselected to Included (+)
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleRemoveIncludedTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleRemoveExcludedTag = (tag: string) => {
    setExcludedTags(prev => prev.filter(t => t !== tag));
  };

  // Clear all tag filters
  const handleClearTagFilter = () => {
    setSelectedTags([]);
    setExcludedTags([]);
    setTagSearchQuery("");
  };

  // Filter Logic
  const getFilteredBots = () => {
    let subset = state.bots || [];
    if (activeTab === "Bookmarks") {
      subset = (state.bots || []).filter(b => bookmarks.includes(b.id));
    } else if (activeTab === "GL") {
      subset = (state.bots || []).filter(b => b.type === "GL");
    } else if (activeTab === "Futa") {
      subset = (state.bots || []).filter(b => b.type === "Futa");
    } else {
      subset = (state.bots || []).filter(b => b.type === "GL");
    }

    let list = subset.filter(bot => {
      // 1. Check keyword inside Name, AuthorNote, or Tags
      const botName = bot.name || "";
      const botAuthorNote = bot.authorNote || "";
      const matchesKeyword = searchKeyword.trim() === "" || 
        botName.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        botAuthorNote.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (bot.tags || []).some(t => t && typeof t === "string" && t.toLowerCase().includes(searchKeyword.toLowerCase()));

      // 2. Check multiple tag intersections (Bot must have all selected tags)
      const matchesIncludedTags = selectedTags.length === 0 || 
        selectedTags.every(requiredTag => 
          (bot.tags || []).some(bt => bt && typeof bt === "string" && bt.toLowerCase() === requiredTag.toLowerCase())
        );

      // 3. Check excluded tags (Bot must NOT contain any excluded tags)
      const matchesExcludedTags = excludedTags.length === 0 ||
        !excludedTags.some(exTag =>
          (bot.tags || []).some(bt => bt && typeof bt === "string" && bt.toLowerCase() === exTag.toLowerCase())
        );

      // 4. Time Filter specific
      let matchesTime = true;
      if (timeFilter !== "all" && bot.createdAt) {
        const botDate = new Date(bot.createdAt).getTime();
        const now = Date.now();
        if (timeFilter === "today") {
          matchesTime = (now - botDate) <= 3600000 * 24;
        } else if (timeFilter === "week") {
          matchesTime = (now - botDate) <= 3600000 * 24 * 7;
        } else if (timeFilter === "month") {
          matchesTime = (now - botDate) <= 3600000 * 24 * 30;
        }
      }

      return matchesKeyword && matchesIncludedTags && matchesExcludedTags && matchesTime;
    });

    // Default sorting: Newest First
    list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return list;
  };

  const hasRecentComment = (bot: Bot): boolean => {
    if (!bot.comments || bot.comments.length === 0) return false;
    const now = Date.now();
    for (const c of bot.comments) {
      const t = new Date(c.createdAt).getTime();
      if ((now - t) < 14 * 24 * 3600 * 1000) return true;
      if (c.replies) {
        for (const r of c.replies) {
          const rt = new Date(r.createdAt).getTime();
          if ((now - rt) < 14 * 24 * 3600 * 1000) return true;
        }
      }
    }
    return false;
  };

  const currentFilteredList = React.useMemo(() => {
    return (activeTab === "GL" || activeTab === "Futa" || activeTab === "Bookmarks") ? getFilteredBots() : [];
  }, [state.bots, activeTab, bookmarks, searchKeyword, selectedTags, excludedTags, timeFilter]);

  const displayedBots = React.useMemo(() => {
    return currentFilteredList.slice(0, visibleCount);
  }, [currentFilteredList, visibleCount]);

  const renderUserBadges = (
    name: string, 
    isAuthorAdmin?: boolean, 
    customTitle?: string, 
    customBadge?: string
  ) => {
    const safeName = name || "Độc giả";
    // 1. Remove all badges for stalk zeze
    if (safeName.toLowerCase() === "stalk zeze" || safeName.toLowerCase() === "stalkzeze") {
      return <span className="text-[10px] text-stone-400 italic">Không danh hiệu</span>;
    }

    // 2. Custom Lesbian Flag badge & Founder for Zeze
    if (safeName.toLowerCase() === "zeze") {
      return (
        <span className="inline-flex items-center gap-1.5 animate-fade-in flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-[#d52d00] via-[#fd9a5a] via-white via-[#b43e8f] to-[#a30262] text-white shadow border border-pink-300 animate-pulse font-bold">
            👑 Tác Giả Zeze 🧡🤍💖
          </span>
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
            🛡️ Founder
          </span>
        </span>
      );
    }

    const isSysAdmin = isAuthorAdmin || safeName === "Admin" || safeName.toLowerCase().includes("quản trị");
    if (isSysAdmin) {
      return (
        <span className="inline-flex items-center gap-1 animate-fade-in">
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow border border-amber-400/30 animate-pulse">
            👑 Quản Trị Viên
          </span>
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
            🛡️ Founder
          </span>
        </span>
      );
    }

    const badges: React.ReactNode[] = [];

    // 3. Render Custom Title (typed by user)
    if (customTitle && customTitle.trim()) {
      badges.push(
        <span key="cust_title" className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 font-sans">
          {customTitle.trim()}
        </span>
      );
    }

    // 4. Render Custom Selected Badge
    if (customBadge) {
      const badgeList = [
        { id: "lesbian", name: "Lesbian Pride 🧡🤍💖", color: "bg-gradient-to-r from-[#d52d00] via-[#fd9a5a] via-white via-[#b43e8f] to-[#a30262] text-white border-pink-300 animate-pulse font-bold" },
        { id: "bisexual", name: "Bisexual Bold 💖💜💙", color: "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white border-purple-400" },
        { id: "transgender", name: "Transgender Hope 🩵🩷🤍", color: "bg-gradient-to-r from-sky-300 via-pink-200 to-sky-300 text-sky-950 border-sky-200" },
        { id: "rainbow", name: "Pride Ally 🌈", color: "bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500 text-white border-amber-300 animate-pulse" },
        { id: "baothu", name: "Báo Thủ Số 1 🚨", color: "bg-red-100 text-red-700 border-red-300 font-bold" },
        { id: "khia", name: "Chiến Thần Khịa Cạnh ⚔️", color: "bg-amber-100 text-amber-800 border-amber-300 font-bold" },
        { id: "anchuc", name: "Thánh Ăn Chực 🍲", color: "bg-teal-50 text-teal-700 border-teal-200" },
        { id: "ngoanxinhyeu", name: "Ngoan Xinh Yêu 🥰", color: "bg-pink-100 text-pink-700 border-pink-300 font-semibold" },
        { id: "chualenh", name: "Chúa Tể Meme 🤡", color: "bg-yellow-100 text-yellow-800 border-yellow-300 font-black" },
        { id: "timthu", name: "Tim Thủ Vô Song ❤️", color: "bg-gradient-to-r from-red-50 to-rose-100 text-rose-700 border-rose-300 font-bold" },
        { id: "chuate", name: "Chúa Tể Học Thuật 📝", color: "bg-gradient-to-r from-blue-50 to-indigo-100 text-indigo-700 border-indigo-300 font-bold" },
        { id: "duhanh", name: "Kẻ Du Hành Không Gian 🚀", color: "bg-gradient-to-r from-sky-50 to-blue-100 text-sky-800 border-sky-300 font-bold" }
      ];
      const match = badgeList.find(b => b.id === customBadge);
      if (match) {
        badges.push(
          <span key="cust_badge" className={`px-1.5 py-0.5 rounded text-[8px] border font-bold ${match.color}`}>
            {match.name}
          </span>
        );
      }
    }

    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const level = Math.abs(hash % 50) + 1; // Level 1 - 50
    
    badges.push(
      <span key="lvl" className="px-1 py-0.5 rounded text-[8px] font-bold bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-800 font-mono">
        Lv.{level}
      </span>
    );

    const roleType = Math.abs(hash % 4);
    if (roleType === 0) {
      badges.push(
        <span key="mod" className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/20">
          🐙 Độc Giả Vip
        </span>
      );
    } else if (roleType === 1) {
      badges.push(
        <span key="mod" className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/20">
          🦄 Thần Thoại
        </span>
      );
    } else if (roleType === 2) {
      badges.push(
        <span key="mod" className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/20">
          🐚 Sưu Tầm Bot
        </span>
      );
    } else {
      badges.push(
        <span key="mod" className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-pink-100 dark:bg-pink-950/45 text-pink-700 dark:text-pink-300 border border-pink-200/25">
          💖 Sủng Bot
        </span>
      );
    }

    if (name.includes("[Khách]") || name.includes("#")) {
      badges.push(
        <span key="guest" className="px-1 py-0.5 rounded text-[8px] font-semibold bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200/40 dark:border-slate-800/40">
          👤 Vãng Lai
        </span>
      );
    } else {
      badges.push(
        <span key="verified" className="px-1 py-0.5 rounded text-[8px] font-black text-blue-500 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/20">
          ✓ Verified
        </span>
      );
    }

    return <span className="inline-flex items-center gap-1 flex-wrap">{badges}</span>;
  };

  const authorSettings = state.authorSettings || {
    authorName: "Tác Giả Ẩn Danh",
    welcomeTitle: "Cổng Chia Sẻ Bot GL & FUTA chất lượng cao!",
    welcomeSubtitle: "Nơi trải nghiệm các bot AI đẳng cấp",
    welcomeIntro: "Chào mừng bạn ghé thăm trang web của mình! Hãy thoải mái tìm kiếm các Bot yêu thích và đóng góp ý kiến để mình ngày càng cải tiến nhé. Tất cả link chat đều trỏ về Google AI Studio.",
    facebookUrl: "https://facebook.com",
    discordUrl: "https://discord.com"
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto relative">
      {/* Dynamic Welcome Hero Section - Editable dynamically by the Author */}
      <div 
        id="author-welcome-banner-card"
        className="w-full bg-slate-1050 dark:bg-[#12070e] border border-pink-500/30 rounded-3xl p-5 sm:p-8 md:p-12 text-white relative overflow-hidden shadow-[0_10px_35px_rgba(244,63,94,0.18)] hover:scale-[1.01] transition-all duration-500"
      >
        {authorSettings.bannerUrl ? (
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-slate-900/60 z-10 mix-blend-multiply"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/40 z-10"></div>
             <motion.img 
               initial={{ scale: 1.05 }}
               animate={{ scale: 1 }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               src={authorSettings.bannerUrl} 
               alt="Banner Background" 
               className="w-full h-full object-cover blur-[2px] opacity-70" 
               referrerPolicy="no-referrer"
             />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-stone-950 via-[#2a111e] to-stone-950">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-[#9d174d]/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        )}
        
        <div className="relative z-10 max-w-3xl space-y-2.5 sm:space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-400/25 text-[9px] sm:text-[10px] md:text-xs text-pink-300 font-extrabold tracking-widest uppercase"
          >
            <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
            <span>Tác giả: {authorSettings.authorName}</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl sm:text-3xl md:text-5xl font-display font-black tracking-tight leading-snug sm:leading-tight bg-gradient-to-r from-pink-300 via-rose-350 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter font-extrabold pb-0.5"
          >
            {authorSettings.welcomeTitle}
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="text-pink-100/95 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider"
          >
            {authorSettings.welcomeSubtitle}
          </motion.p>
          
          {authorSettings.welcomeIntro && (
            <motion.p 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
              className="text-slate-300 text-[11px] sm:text-xs md:text-sm leading-relaxed max-w-2xl text-justify"
            >
              {authorSettings.welcomeIntro}
            </motion.p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      
      {/* LEFT COLUMN: Profile & Author Newsfeed */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Profile Card & Avatar */}
        <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-inner relative">
              {avatar && avatar.match(/^(data:|http|\/)/) ? (
                <img src={avatar} className="w-full h-full rounded-xl object-cover" alt="avatar" />
              ) : (
                <span>{avatar}</span>
              )}
              <span className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5 animate-pulse z-10"></span>
            </div>
            <div className="flex-1 truncate">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tài khoản hiện tại</p>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                {nickname}
              </h4>
              <div className="mt-1 flex flex-wrap gap-1">
                {renderUserBadges(nickname, isAdminUnlocked, equippedTitle, equippedBadge)}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-justify">
            Đổi biệt danh và avatar mạng xã hội bất cứ lúc nào bằng nút bên dưới để tối ưu bài đăng và hòm thư phản hồi.
          </p>
          <button
            id="btn-trigger-login-change"
            onClick={onOpenLogin}
            className="w-full mt-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Thiết lập nhân dạng
          </button>
          <button
            id="btn-trigger-badge-store"
            onClick={() => setIsBadgeStoreOpen(true)}
            className="w-full mt-2 py-1.5 bg-rose-500 hover:bg-rose-600 dark:bg-rose-650 dark:hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm border border-rose-400"
          >
            <Award className="w-3.5 h-3.5 text-white" /> Danh hiệu & Nhiệm vụ 🏆
          </button>
        </div>

        {/* BẢNG TIN TÁC GIẢ TỰ ĐĂNG (Vị trí nằm ngay dưới phần tài khoản hiện tại, bình luận gắn liền liền mạch) */}
        <div className="mt-4">
          <AuthorNewsfeedWidget
            announcements={state.announcements || []}
            onRefresh={() => onRefresh(true)}
            userId={userId}
            nickname={nickname}
            avatar={avatar}
            isAdminUnlocked={isAdminUnlocked}
            passcode={passcode}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Bot Explorer + Feedback + Requests */}
      <div className="lg:col-span-3 space-y-6">

        {state.polls && state.polls.length > 0 && (
          <div className="bg-pink-50/30 dark:bg-pink-950/10 backdrop-blur-xl rounded-2xl border border-pink-100 dark:border-pink-950/40 p-6 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-400 via-rose-300 to-pink-500"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-500/10 text-pink-500 dark:text-pink-400 rounded-xl">
                  <Heart className="w-4 h-4 animate-pulse fill-pink-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-pink-600 dark:text-pink-300 text-sm flex items-center gap-1">
                    Khảo sát ý kiến độc giả <Sparkles className="w-3.5 h-3.5 text-pink-400 fill-pink-400/20" />
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Tham gia bình chọn để giúp tớ cải thiện chất lượng cổng bot nhé! ✨</p>
                </div>
              </div>
              {state.polls?.some(p => p.closed) ? (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 px-2.5 py-1 rounded-full font-extrabold tracking-wider uppercase border border-amber-500/10 flex items-center gap-1 animate-pulse animate-duration-1000">
                  🏆 ĐÃ CHỐT KẾT QUẢ
                </span>
              ) : (
                <span className="text-[10px] bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 px-2.5 py-1 rounded-full font-extrabold tracking-wider uppercase border border-pink-500/10 flex items-center gap-1">
                  🌸 ACTIVE
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.polls.map((poll) => {
                const votedOptionId = poll.votedUsers ? poll.votedUsers[userId] : undefined;
                const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                
                return (
                  <div key={poll.id} className="p-4 bg-white/90 dark:bg-slate-950 rounded-2xl border border-pink-100/60 dark:border-pink-950/50 flex flex-col justify-between space-y-3.5 relative shadow-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-850 dark:text-slate-100 text-xs md:text-sm">{poll.question}</h4>
                        {isAdminUnlocked && (
                          <button
                            onClick={async () => {
                              if (confirm(`Bạn có chắc và muốn xóa khảo sát này?`)) {
                                const res = await fetch(`/api/polls/${poll.id}?passcode=${encodeURIComponent(passcode || "")}`, {
                                  method: "DELETE",
                                  headers: { "x-admin-passcode": passcode || "" }
                                });
                                if (res.ok) onRefresh();
                              }
                            }}
                            className="text-slate-450 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                            title="Xóa nhanh (Quyền Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[9.5px] text-pink-550 dark:text-pink-400/90 font-medium leading-relaxed">
                        {poll.closed ? (
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                            ⭐️ ĐÃ CHỐT KẾT QUẢ CHUNG CUỘC
                          </span>
                        ) : votedOptionId 
                          ? "✓ Đã chọn! (Bạn có thể nhấp vào đáp án khác để đổi, hoặc nhấp lại để hủy chọn)" 
                          : "Nhấp vào bất kỳ đáp án bên dưới để bình chọn nha"}
                      </p>
                    </div>

                    <div className="space-y-2 mt-2">
                      {poll.options.map((opt) => {
                        const isSelected = votedOptionId === opt.id;
                        const percent = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                        
                        // Extract voters for this option from votedUsers and votedUsersMeta
                        const optionVoters = Object.entries(poll.votedUsers || {})
                          .filter(([_, optId]) => optId === opt.id)
                          .reverse() // Reverse to show recently voting users first
                          .map(([uId]) => {
                            const meta = poll.votedUsersMeta?.[uId];
                            return {
                              userId: uId,
                              nickname: meta?.nickname || "Độc giả",
                              avatar: meta?.avatar || "🌊"
                            };
                          });

                        return (
                          <button
                            key={opt.id}
                            disabled={poll.closed}
                            onClick={async () => {
                              if (poll.closed) return;
                              try {
                                const res = await fetch(`/api/polls/${poll.id}/vote`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId, optionId: opt.id, nickname, avatar })
                                });
                                if (res.ok) {
                                  onRefresh();
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold relative transition-all duration-300 overflow-hidden flex items-center justify-between gap-3 ${
                              poll.closed
                                ? poll.winnerOptionId === opt.id
                                  ? "border-amber-400 bg-amber-500/5 text-amber-850 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300 font-extrabold ring-1 ring-amber-400/30 cursor-default"
                                  : "border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 cursor-default"
                                : isSelected
                                  ? "border-pink-300 bg-pink-500/5 text-pink-700 dark:border-pink-850 dark:bg-pink-950/20 dark:text-pink-300 font-bold cursor-pointer"
                                  : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-pink-200 dark:hover:border-pink-950 text-slate-700 dark:text-slate-300 cursor-pointer"
                            }`}
                          >
                            {/* Animated background bar matching the votes percent */}
                            <div 
                              className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out pointer-events-none rounded-l-xl ${
                                poll.closed && poll.winnerOptionId === opt.id
                                  ? "bg-amber-550/10 dark:bg-amber-500/15"
                                  : isSelected 
                                    ? "bg-pink-500/10 dark:bg-pink-500/15" 
                                    : "bg-slate-50 dark:bg-slate-800/20"
                              }`}
                              style={{ width: `${percent}%`, zIndex: 0 }}
                            ></div>

                            <span className="relative z-10 flex-1 flex items-start gap-2.5 text-wrap">
                              <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                poll.closed && poll.winnerOptionId === opt.id
                                  ? "border-amber-500 bg-amber-500 text-white"
                                  : isSelected 
                                    ? "border-pink-500 bg-pink-500 text-white" 
                                    : "border-slate-300 dark:border-slate-650"
                              }`}>
                                {(isSelected || (poll.closed && poll.winnerOptionId === opt.id)) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                              </span>
                              <span className="text-left font-semibold break-words leading-relaxed">
                                {opt.text}
                                {poll.closed && poll.winnerOptionId === opt.id && (
                                  <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] rounded-md font-extrabold animate-pulse">
                                    👑 Winner
                                  </span>
                                )}
                              </span>
                            </span>
                            
                            {/* Option voters display & percentage */}
                            <div className="flex items-center gap-2 relative z-10 shrink-0 ml-auto self-center">
                              {optionVoters.length > 0 && (
                                <div className="flex -space-x-1.5 items-center mr-1">
                                  {optionVoters.slice(0, 1).map((voter) => {
                                    const avatarSrc = voter.avatar && (voter.avatar.startsWith("data:") || voter.avatar.startsWith("http") || voter.avatar.startsWith("/"))
                                      ? voter.avatar
                                      : (voter.avatar && voter.avatar.length > 30 ? `data:image/png;base64,${voter.avatar}` : null);
                                    
                                    return (
                                      <span
                                        key={voter.userId}
                                        title={voter.nickname}
                                        className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-[10px] overflow-hidden select-none hover:scale-115 hover:z-20 transition shrink-0"
                                      >
                                        {avatarSrc ? (
                                          <img src={avatarSrc} className="w-full h-full object-cover rounded-full" alt="" referrerPolicy="no-referrer" />
                                        ) : (
                                          voter.avatar || "👤"
                                        )}
                                      </span>
                                    );
                                  })}
                                  {optionVoters.length > 1 && (
                                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-extrabold text-slate-600 dark:text-slate-300 select-none shrink-0">
                                      +{optionVoters.length - 1}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="text-[10.5px] text-right font-extrabold text-pink-600 dark:text-pink-300">
                                {percent}% ({opt.votes || 0})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Discord / Facebook style: Add Custom Option */}
                    <div className="mt-2 pt-1.5 border-t border-pink-50/50 dark:border-pink-950/20">
                      {addingOptionPollId === poll.id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const text = customOptionText[poll.id] || "";
                            if (!text.trim()) return;

                            try {
                              const res = await fetch(`/api/polls/${poll.id}/add-option`, {
                                method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId, optionText: text, nickname, avatar })
                              });
                              if (res.ok) {
                                setCustomOptionText(prev => ({ ...prev, [poll.id]: "" }));
                                setAddingOptionPollId(null);
                                onRefresh();
                              } else {
                                const data = await res.json();
                                alert(data.error || "Gặp lỗi khi thêm phương án");
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Nhập phương án của riêng bạn..."
                            value={customOptionText[poll.id] || ""}
                            onChange={(e) => setCustomOptionText(prev => ({ ...prev, [poll.id]: e.target.value }))}
                            className="flex-1 text-[11px] font-bold p-2 bg-white dark:bg-slate-900 border border-pink-150 dark:border-pink-900/30 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-950/50"
                            maxLength={100}
                            autoFocus
                          />
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="submit"
                              className="px-3 py-2 text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-pink-200 dark:shadow-none"
                            >
                              Thêm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomOptionText(prev => ({ ...prev, [poll.id]: "" }));
                                setAddingOptionPollId(null);
                              }}
                              className="px-3 py-2 text-[10px] font-extrabold bg-pink-50/50 hover:bg-pink-100/50 dark:bg-pink-950/20 dark:hover:bg-pink-950/45 text-pink-700 dark:text-pink-300 rounded-xl transition cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddingOptionPollId(poll.id)}
                          className="w-full py-2 border border-dashed border-pink-200 dark:border-pink-900/40 hover:border-pink-400 hover:bg-pink-50/10 text-pink-600 dark:text-pink-400 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm phương án tự chọn
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 text-[9px] text-slate-450 border-t border-slate-100 dark:border-slate-850">
                      <span>Tổng số phiếu: <strong className="text-slate-600 dark:text-slate-300">{totalVotes}</strong></span>
                      <span>{new Date(poll.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main tabs bar with glassy blur styling */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm flex flex-wrap gap-2">
          <button
            id="tab-btn-gl"
            onClick={() => { setActiveTab("GL"); handleClearTagFilter(); }}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "GL"
                ? "text-white drop-shadow-[0_0_12px_rgba(244,63,94,0.3)] font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "GL" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 rounded-lg -z-10 shadow-md shadow-pink-500/30"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === "GL" ? "text-pink-100 animate-pulse" : "text-pink-400"}`} />
            <span>🌸 Bot Thuần GL (Girls Love)</span>
          </button>

          <button
            id="tab-btn-futa"
            onClick={() => { setActiveTab("Futa"); handleClearTagFilter(); }}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "Futa"
                ? "text-white font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "Futa" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg -z-10 shadow-md shadow-blue-550/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <span>🔵 Bot Futa AI (Specialty)</span>
          </button>

          {/* Leaderboard Tab */}
          <button
            id="tab-btn-leaderboard"
            onClick={() => { setActiveTab("Leaderboard"); handleClearTagFilter(); }}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "Leaderboard"
                ? "text-white font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "Leaderboard" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-lg -z-10 shadow-md shadow-amber-500/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <Trophy className={`w-3.5 h-3.5 ${activeTab === "Leaderboard" ? "text-amber-100 animate-pulse" : "text-amber-500"}`} />
            <span>🏆 Bảng Xếp Hạng</span>
          </button>

          <button
            id="tab-btn-feedback"
            onClick={() => setActiveTab("Feedback")}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "Feedback"
                ? "text-white font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "Feedback" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg -z-10 shadow-md shadow-rose-550/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <span>💌 Gửi Góp Ý / Feedback</span>
          </button>

          <button
            id="tab-btn-requests"
            onClick={() => setActiveTab("Requests")}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "Requests"
                ? "text-white font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "Requests" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg -z-10 shadow-md shadow-orange-550/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <span>💡 Đề Xuất Ý Tưởng</span>
          </button>

          <button
            id="tab-btn-bookmarks"
            onClick={() => { setActiveTab("Bookmarks"); handleClearTagFilter(); }}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 z-10 ${
              activeTab === "Bookmarks"
                ? "text-white font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-150/60 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {activeTab === "Bookmarks" && (
              <motion.span
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg -z-10 shadow-md shadow-emerald-550/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <Star className={`w-4 h-4 ${activeTab === "Bookmarks" ? "text-yellow-300 fill-yellow-300" : "text-yellow-500"}`} /> 
            <span>Bot Đã Lưu</span>
          </button>
        </div>

        {/* Explorer views */}
        {(activeTab === "GL" || activeTab === "Futa" || activeTab === "Bookmarks") && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Search & Tag Filter Bar (No Sorting dropdown, No mini leaderboard) */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-3">
                {/* Keyword search */}
                <div className="relative flex-1">
                  <input
                    id="user-search-keyword"
                    type="text"
                    placeholder="Tìm kiếm từ khóa, tên bot, dặn dò tác giả..."
                    value={localSearchKeyword}
                    onChange={(e) => setLocalSearchKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {/* Tag Search Input */}
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="🔍 Lọc danh sách tag..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  {tagSearchQuery && (
                    <button
                      onClick={() => setTagSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Time filter */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    id="user-time-filter"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
                  >
                    <option value="all">Mọi lúc</option>
                    <option value="today">Hôm nay</option>
                    <option value="week">1 tuần qua</option>
                    <option value="month">1 tháng qua</option>
                  </select>
                </div>
              </div>

              {/* Multi-Tag Interactive Selector & Exclude System */}
              <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/10 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xs uppercase tracking-wide text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                      Tìm Kiếm & Lọc Theo Tag
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
                      (Nhấp để Chọn [+] / Loại trừ [-] / Bỏ chọn)
                    </span>
                  </div>

                  {(selectedTags.length > 0 || excludedTags.length > 0) && (
                    <button
                      onClick={handleClearTagFilter}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer transition flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40"
                    >
                      Xóa tất cả bộ lọc tag ({selectedTags.length + excludedTags.length}) <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Active Tag Filters Bar (Selected & Excluded) */}
                {(selectedTags.length > 0 || excludedTags.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                          Bắt buộc có (+):
                        </span>
                        {selectedTags.map(t => (
                          <span
                            key={`sel-${t}`}
                            className="font-serif italic font-medium text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 flex items-center gap-1 shadow-2xs"
                          >
                            <span>#{t}</span>
                            <button
                              onClick={() => handleRemoveIncludedTag(t)}
                              className="hover:text-rose-600 cursor-pointer font-bold ml-0.5 text-xs"
                              title="Bỏ tag này"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {excludedTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-2">
                        <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">
                          Loại trừ (-):
                        </span>
                        {excludedTags.map(t => (
                          <span
                            key={`ex-${t}`}
                            className="font-serif italic font-medium text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/50 line-through flex items-center gap-1 shadow-2xs"
                          >
                            <span>#{t}</span>
                            <button
                              onClick={() => handleRemoveExcludedTag(t)}
                              className="hover:text-emerald-600 cursor-pointer font-bold ml-0.5 text-xs no-underline inline-block"
                              title="Bỏ loại trừ tag này"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Available Suggested Tags Cloud (Compact, Italic, Elegant) */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {(activeTab === "GL"
                    ? glSuggestedTags
                    : activeTab === "Futa"
                    ? futaSuggestedTags
                    : Array.from(new Set([...glSuggestedTags, ...futaSuggestedTags]))
                  )
                    .filter(t => !tagSearchQuery.trim() || t.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    .map((tag) => {
                      const isIncluded = selectedTags.includes(tag);
                      const isExcluded = excludedTags.includes(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTagFilter(tag)}
                          className={`font-serif italic text-[11px] px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 border shadow-2xs select-none ${
                            isIncluded
                              ? "bg-pink-600 text-white font-bold border-pink-500 shadow-sm shadow-pink-500/20"
                              : isExcluded
                              ? "bg-rose-600 text-white font-bold border-rose-500 line-through shadow-sm shadow-rose-500/20"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-800"
                          }`}
                          title={isIncluded ? "Đang chọn (Nhấp để loại trừ)" : isExcluded ? "Đang loại trừ (Nhấp để bỏ lọc)" : "Nhấp để chọn tag này"}
                        >
                          <span>#{tag}</span>
                          {isIncluded && <span className="text-[10px] font-sans font-bold">✓</span>}
                          {isExcluded && <span className="text-[10px] font-sans font-bold no-underline">✕</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Main Bot Grid */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="skeleton-loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
                >
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <BotSkeleton key={idx} />
                  ))}
                </motion.div>
              ) : state.bots.length === 0 || (activeTab === "Bookmarks" && bookmarks.length === 0) ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 p-12 text-center space-y-3 w-full"
                >
                  <Compass className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-slate-700 dark:text-slate-200 font-bold text-sm uppercase">Hệ Thống Đang Chuẩn Bị</p>
                  {activeTab === "Bookmarks" ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Bạn chưa lưu bài viết nào! Hãy thả <Star className="inline w-3 h-3 text-yellow-500" /> để lưu các Bot bạn yêu thích vào sổ tay cá nhân nhé.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Tác giả Zeze đang biên dịch và cập nhật thêm các siêu phẩm Bot GL & FUTA chất lượng cao lên trang web! Xin vui lòng quay lại sau nha.
                    </p>
                  )}
                </motion.div>
              ) : currentFilteredList.length === 0 ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center w-full"
                >
                  <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                  <p className="text-slate-500 font-medium text-sm">Không tìm thấy Bot nào khớp bộ lọc!</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy thử đổi từ khóa, giảm bớt tag hoặc yêu cầu tác giả viết bot này nhé.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="real-bots-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedBots.map((bot) => {
                  const isBookmarked = bookmarks.includes(bot.id);
                  const isExpanded = expandedBotId === bot.id;
                  // Popularity based on interactions (views: 1pt, likes: 3pt, comments: 5pt). Hot if >= 25 interactions!
                  const interactions = (bot.views || 0) + (bot.likes || 0) * 3 + getBotCommentCount(bot) * 5;
                  const isHot = interactions >= 25;
                  // Check if user liked this bot using stable userId or local storage backup
                  const localLikedListKey = `liked_bots_${userId || nickname}`;
                  let localLiked = false;
                  try {
                    const localList = JSON.parse(localStorage.getItem(localLikedListKey) || "[]");
                    localLiked = localList.includes(bot.id);
                  } catch {
                    localLiked = false;
                  }
                  const isLikedByMe = bot.likedUserIds?.includes(userId) || bot.likedUserIds?.includes(nickname) || localLiked;
                  // Auto-expiring tag: only 'New' if under 3 days old (automatically hidden if above 3 days)
                  const isNew = (new Date().getTime() - new Date(bot.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  
                  // Checked modified within last 24 hours (updatedAt or createdAt matches this window)
                  const dateToCheck = bot.updatedAt || bot.createdAt;
                  const isRecentlyUpdated = dateToCheck ? (new Date().getTime() - new Date(dateToCheck).getTime()) < 24 * 60 * 60 * 1000 : false;
                  
                  // Auto badge: Has new comments within last 7 days
                  const hasRecentComment = Array.isArray(bot.comments) && bot.comments.some(c => {
                    const cTime = new Date(c.createdAt || 0).getTime();
                    const hasRecentReply = Array.isArray(c.replies) && c.replies.some(r => (Date.now() - new Date(r.createdAt || 0).getTime()) < 7 * 24 * 3600 * 1000);
                    return (Date.now() - cTime) < 7 * 24 * 3600 * 1000 || hasRecentReply;
                  });
                  
                  return (
                    <div 
                      key={bot.id}
                      id={`bot-card-${bot.id}`}
                      className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 p-5 rounded-2xl hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 ease-out flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Ambient glowing wave sweep overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-transparent to-cyan-500/0 group-hover:from-cyan-500/[0.015] group-hover:to-cyan-500/[0.035] transition-all duration-700 pointer-events-none"></div>

                      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 relative z-10">
                        
                        {/* Generous, Cinematic & High-Res Bot Cover Image */}
                        <div className="w-full sm:w-48 md:w-52 lg:w-60 xl:w-64 h-72 sm:h-80 md:h-84 lg:h-92 bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-900 dark:to-slate-950 rounded-2xl overflow-hidden shrink-0 relative border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center select-none shadow-md group-hover:shadow-2xl transition-all duration-500 ease-out">
                          {bot.imageUrl ? (
                            <>
                              <img 
                                src={getOptimizedImageUrl(bot.imageUrl, { width: 1000, height: 1200, quality: 90 })} 
                                referrerPolicy="no-referrer" 
                                alt={bot.name} 
                                className="w-full h-full object-cover object-top cursor-zoom-in group-hover:scale-105 active:scale-95 transition-all duration-500" 
                                title="Bấm vào để xem ảnh kích thước đầy đủ"
                                onClick={(e) => { e.stopPropagation(); setViewingPhotoUrl(bot.imageUrl); }}
                                loading="lazy"
                              />
                              {/* Hover Zoom hint button */}
                              <div 
                                onClick={(e) => { e.stopPropagation(); setViewingPhotoUrl(bot.imageUrl); }}
                                className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/90 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90 transition-all cursor-zoom-in shadow-sm z-20"
                                title="Bấm để phóng to ảnh"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Animated coastal ambient glow behind emblem */}
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none"></div>
                              
                              {/* Main emblem */}
                              <span className="text-4xl filter drop-shadow animate-float-slow">
                                {bot.type === "GL" ? "✨" : "⚡"}
                              </span>
                            </>
                          )}
                          
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
                            {hasRecentComment && (
                              <span className="text-[8px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-emerald-500/40 animate-pulse border border-white/20 flex items-center gap-1 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                💬 CÓ BÌNH LUẬN MỚI
                              </span>
                            )}
                            {isRecentlyUpdated && (
                              <span className="text-[8px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-purple-500/40 animate-pulse border border-white/20 flex items-center gap-0.5 whitespace-nowrap">
                                🔄 CẬP NHẬT
                              </span>
                            )}
                            {isNew && (
                              <span className="text-[8px] bg-gradient-to-r from-emerald-400 to-cyan-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-emerald-500/40 animate-bounce-slow border border-white/20 flex items-center gap-0.5">
                                ✨ NEW
                              </span>
                            )}
                            {isHot && (
                              <span className="text-[8px] bg-gradient-to-r from-rose-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-rose-500/40 animate-pulse border border-white/20 flex items-center gap-0.5">
                                🔥 HOT
                              </span>
                            )}
                          </div>
                          
                          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 z-10">
                            <span className={`text-[8.5px] px-2 py-0.5 rounded-md font-black text-white shadow-sm ${bot.type === "GL" ? "bg-blue-600" : "bg-cyan-650"}`}>
                              {bot.type}
                            </span>
                          </div>
                        </div>

                        {/* Mid content summary */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-serif italic font-bold tracking-wide text-[19px] sm:text-[23px] text-slate-900 dark:text-slate-50 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-1 flex items-center gap-1.5 leading-snug drop-shadow-xs">
                                <span>{bot.name}</span>
                                {isRecentlyUpdated && (
                                  <span className="relative flex h-2 w-2" title="Vừa cập nhật trong 24h qua">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                )}
                              </h3>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 pt-0.5">
                                {new Date(bot.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>

                            {/* Tags list: Compact, Italic, Elegant with NO truncation */}
                            <div className="flex flex-wrap gap-1 mt-2 font-serif">
                              <span className="font-serif italic text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/40 shadow-2xs">
                                {bot.type}
                              </span>
                              {Array.from(new Set(bot.tags || [])).map(t => {
                                const isIncluded = selectedTags.includes(t as string);
                                const isExcluded = excludedTags.includes(t as string);
                                return (
                                  <span 
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTagFilter(t as string);
                                    }}
                                    className={`font-serif italic text-[11px] px-2 py-0.5 rounded-full border cursor-pointer transition-all shadow-2xs ${
                                      isIncluded
                                        ? "bg-pink-600 text-white font-bold border-pink-500"
                                        : isExcluded
                                        ? "bg-rose-600 text-white font-bold border-rose-500 line-through"
                                        : "bg-slate-100/90 text-slate-600 dark:bg-slate-800/90 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:border-pink-400 hover:text-pink-600"
                                    }`}
                                    title={isIncluded ? "Đang chọn (Nhấp để loại trừ)" : isExcluded ? "Đang loại trừ (Nhấp để bỏ lọc)" : "Nhấp để lọc theo tag này"}
                                  >
                                    #{t}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Bot caption description with line clamp */}
                            <div className="mt-2.5">
                              <p className={`font-body font-normal text-[14px] sm:text-[15px] leading-[1.5] text-[#4B5563] dark:text-[#94A3B8] text-left ${expandedPrompts.includes(bot.id) ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                                {bot.authorNote || "Không có ghi chú nào của tác giả."}
                              </p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedPrompts(prev => prev.includes(bot.id) ? prev.filter(id => id !== bot.id) : [...prev, bot.id]); }}
                                className="text-[11px] text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-bold mt-1 transition-colors cursor-pointer"
                              >
                                {expandedPrompts.includes(bot.id) ? "▲ Thu gọn lời nhắc" : "▼ Xem thêm lời nhắc"}
                              </button>
                            </div>
                          </div>

                          {/* Stats and buttons bottom header */}
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3 font-sans text-[13px] font-medium text-slate-600 dark:text-slate-400 tabular-nums z-30">
                              <span className="flex items-center gap-1" title="Lượt xem">
                                <Eye className="w-3.5 h-3.5 text-cyan-500" />
                                <span>{bot.views || 0}</span>
                              </span>
                              <span 
                                className="flex items-center gap-1 cursor-pointer hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setExpandedBotId(isExpanded ? null : bot.id); }}
                                title="Bình luận"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-pink-500" />
                                <span>{getBotCommentCount(bot)}</span>
                              </span>
                              <button 
                                onClick={(e) => handleLikeBot(bot.id, e)} 
                                className={`flex items-center gap-1 transition cursor-pointer hover:text-rose-500 ${isLikedByMe ? 'text-rose-500 font-bold' : 'text-slate-500'}`}
                                title={isLikedByMe ? "Bỏ yêu thích" : "Yêu thích"}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} /> 
                                <span>{bot.likes || 0}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 z-30">
                              <button
                                onClick={(e) => handleToggleBookmark(bot.id, e)}
                                className="text-[10px] p-1 px-2 rounded bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-350 hover:text-yellow-500 dark:hover:text-yellow-400 transition cursor-pointer flex items-center gap-1 border border-slate-200/50 dark:border-white/5 font-bold shrink-0"
                                title={isBookmarked ? "Bỏ lưu trữ" : "Lưu bài viết"}
                              >
                                <Star className={`w-3 h-3 ${isBookmarked ? "text-yellow-400 fill-yellow-400" : ""}`} />
                                <span>{isBookmarked ? "Đã Lưu" : "Lưu Trữ"}</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const shareUrl = (bot.links && bot.links.length > 0) ? bot.links[0].url : `${window.location.origin}${window.location.pathname}?botId=${bot.id}`;
                                  navigator.clipboard.writeText(shareUrl)
                                    .then(() => {
                                      setCopiedBotId(bot.id);
                                      setTimeout(() => setCopiedBotId(null), 2000);
                                    })
                                    .catch(err => {
                                      console.error("Lỗi khi sao chép liên kết:", err);
                                      alert("Không thể tự động sao chép. Hãy sao chép liên kết này: " + shareUrl);
                                    });
                                }}
                                className={`text-[10px] p-1 px-2 rounded transition cursor-pointer flex items-center gap-1 border font-bold shrink-0 ${
                                  copiedBotId === bot.id
                                    ? "bg-green-500 text-white border-green-500 hover:bg-green-600"
                                    : "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 border-slate-200/50 dark:border-white/5"
                                }`}
                                title="Chia sẻ liên kết trực tiếp"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>{copiedBotId === bot.id ? "Đã chép!" : "Chia Sẻ"}</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Dynamic links attached to bot */}
                      {bot.links && bot.links.length > 0 && (
                        <div className="mt-3.5 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-white/5 space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cổng chat chuyển tiếp:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {bot.links.map((link) => (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleBotClick(bot)}
                                className="py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-400 hover:text-white border border-cyan-500/20 rounded-xl text-[11px] font-extrabold text-center flex items-center justify-center gap-1 transition-all duration-300"
                              >
                                <span>{link.label.toUpperCase()}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable interaction comments bar */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedBotId(isExpanded ? null : bot.id); }}
                          className="w-full flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-600 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Tương tác bình luận ({getBotCommentCount(bot)})
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {/* Collapsed comments tree */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                              {(!bot.comments || bot.comments.length === 0) ? (
                                <p className="text-[11px] text-slate-400 italic text-center py-2">Trải chiếu nằm chờ bình luận đầu tiên...</p>
                              ) : (
                                [...bot.comments]
                                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                                  .map((c) => (
                                  <div key={c.id} className="flex gap-2.5">
                                    {/* Avatar */}
                                    <div className="shrink-0 pt-1">
                                        {c.avatar ? (
                                          c.avatar.match(/^(data:|http|\/)/) ? (
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
                                          className={`flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer ${likedCommentIds.includes(c.id) || (userId && c.likedUserIds?.includes(userId)) ? 'text-rose-500 font-bold' : ''}`}
                                        >
                                          <Heart className={`w-3 h-3 ${likedCommentIds.includes(c.id) || (userId && c.likedUserIds?.includes(userId)) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                          <span>Thích {c.likes ? `(${c.likes})` : ''}</span>
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
                                                  reply.avatar.match(/^(data:|http|\/)/) ? (
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
                                                    onClick={() => handleLikeCommentReply(bot.id, c.id, reply.id)}
                                                    className={`flex items-center gap-0.5 hover:text-rose-500 transition-colors cursor-pointer ${likedCommentIds.includes(reply.id) || (userId && reply.likedUserIds?.includes(userId)) ? 'text-rose-500 font-bold' : ''}`}
                                                  >
                                                    <Heart className={`w-2.5 h-2.5 ${likedCommentIds.includes(reply.id) || (userId && reply.likedUserIds?.includes(userId)) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    <span>Thích {reply.likes ? `(${reply.likes})` : ''}</span>
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                      setActiveCommentReplyId(c.id);
                                                      const currentText = commentReplyInput[c.id] || "";
                                                      const cleanText = currentText.startsWith(`@${reply.nickname}`)
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
                            {/* Comment writer */}
                            <form onSubmit={(e) => handlePostComment(bot.id, e)} className="flex gap-2">
                              <input
                                type="text"
                                maxLength={150}
                                placeholder="Gõ lời chat bàn chuyện bot..."
                                value={commentInput[bot.id] || ""}
                                onChange={(e) => setCommentInput({ ...commentInput, [bot.id]: e.target.value })}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              />
                              <button
                                type="submit"
                                className="p-1 px-3.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors"
                              >
                                Gửi
                              </button>
                            </form>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
                </div>
                
                {/* Pagination load more controls */}
                {currentFilteredList.length > visibleCount && (
                  <div className="flex justify-center mt-10">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 12)}
                      className="px-8 py-3.5 bg-gradient-to-r from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 hover:from-pink-500 hover:to-rose-600 text-pink-700 dark:text-pink-300 hover:text-white border border-pink-500/20 dark:border-pink-500/40 rounded-full text-xs font-black shadow-lg shadow-pink-500/5 hover:shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <span>Tải thêm siêu phẩm Bot</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* LEADERBOARD VIEW TAB */}
        {activeTab === "Leaderboard" && (
          <LeaderboardView
            bots={state.bots}
            onBotClick={(bot) => handleBotClick(bot)}
            onOpenBotDetail={(botId) => {
              setActiveTab("GL");
              setExpandedBotId(botId);
            }}
          />
        )}

        {/* FEEDBACK VIEW TAB (Masonry Grid & Auto-resize Textarea) */}
        {activeTab === "Feedback" && (
          <MasonryFeedbackView
            feedbacks={state.feedbacks || []}
            onRefresh={() => onRefresh(true)}
            nickname={nickname}
            avatar={avatar}
            userId={userId}
            isAdminUnlocked={isAdminUnlocked}
            passcode={passcode}
          />
        )}

        {/* REQUESTS VIEW TAB (Masonry Grid & Auto-resize Textarea) */}
        {activeTab === "Requests" && (
          <MasonryRequestsView
            botRequests={state.botRequests || []}
            onRefresh={() => onRefresh(true)}
            nickname={nickname}
            avatar={avatar}
            userId={userId}
            isAdminUnlocked={isAdminUnlocked}
            passcode={passcode}
          />
        )}
        {/* --- LIGHTBOX MODAL --- */}
        {viewingPhotoUrl && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-lg cursor-zoom-out p-4 animate-fade-in"
            onClick={() => setViewingPhotoUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex flex-col items-center">
              <button 
                onClick={() => setViewingPhotoUrl(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 transition active:scale-90 z-25 cursor-pointer"
                title="Đóng ảnh"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={viewingPhotoUrl} 
                referrerPolicy="no-referrer" 
                alt="Enlarged profile backdrop" 
                className="max-w-full max-h-[80vh] object-contain rounded-xl select-none" 
              />
              <p className="text-white/60 text-xs font-semibold py-2.5 font-mono select-none">Nhấp bất kỳ chỗ nào để đóng thu phóng</p>
            </div>
          </div>
        )}

        {/* Custom Badge & Titles Store / Quests Modal */}
        <BadgeStoreModal
          isOpen={isBadgeStoreOpen}
          onClose={() => setIsBadgeStoreOpen(false)}
          nickname={nickname}
          onEquipBadge={handleEquipBadge}
          equippedBadge={equippedBadge}
          onEquipTitle={handleEquipTitle}
          equippedTitle={equippedTitle}
        />


      </div>
      </div>
    </div>
  );
}

const areUserPanelPropsEqual = (prevProps: UserPanelProps, nextProps: UserPanelProps) => {
  if (prevProps.nickname !== nextProps.nickname) return false;
  if (prevProps.avatar !== nextProps.avatar) return false;
  if (prevProps.userId !== nextProps.userId) return false;
  if (prevProps.isAdminUnlocked !== nextProps.isAdminUnlocked) return false;
  if (prevProps.passcode !== nextProps.passcode) return false;

  const prevS = prevProps.state;
  const nextS = nextProps.state;

  if (!prevS || !nextS) return prevS === nextS;

  if (prevS.bots?.length !== nextS.bots?.length) return false;
  if (prevS.announcements?.length !== nextS.announcements?.length) return false;
  if (prevS.feedbacks?.length !== nextS.feedbacks?.length) return false;
  if (prevS.botRequests?.length !== nextS.botRequests?.length) return false;
  if (prevS.polls?.length !== nextS.polls?.length) return false;

  for (let i = 0; i < (prevS.bots?.length || 0); i++) {
    const pb = prevS.bots[i];
    const nb = nextS.bots[i];
    if (pb.id !== nb.id) return false;
    if (pb.views !== nb.views) return false;
    if (pb.likes !== nb.likes) return false;
    if (pb.name !== nb.name) return false;
    if (pb.updatedAt !== nb.updatedAt) return false;
    if (pb.comments?.length !== nb.comments?.length) return false;
    if (getBotCommentCount(pb) !== getBotCommentCount(nb)) return false;
  }

  // Quick settings string comparison
  if (JSON.stringify(prevS.authorSettings) !== JSON.stringify(nextS.authorSettings)) return false;
  if (JSON.stringify(prevS.polls) !== JSON.stringify(nextS.polls)) return false;

  return true;
};

export default React.memo(UserPanel, areUserPanelPropsEqual);
