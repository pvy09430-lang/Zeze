import React, { useState } from "react";
import { AppState, Bot, Announcement, Feedback, BotRequest, BotLink, getBotCommentCount } from "../types";
import { uploadImageToCloud, getOptimizedImageUrl } from "../lib/cloudinaryUtil";
import { 
  Plus, Edit, Trash2, Key, Save, RefreshCw, Send, CheckCircle2, AlertTriangle, 
  Eye, CornerDownRight, Radio, Info, Heart, Award, Link2, X, Terminal,
  PieChart as PieChartIcon, HelpCircle, Tag, Sparkles, Flame, Eraser,
  Activity, Database, ShieldCheck, Zap, TrendingUp, Clock, AlertOctagon, Cpu
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface AdminPanelProps {
  state: AppState;
  onRefresh: () => void;
  onUpdateState: (newState: AppState) => void;
  passcode: string;
  setPasscode: (code: string) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (val: boolean) => void;
  onCleanupDuplicates?: () => void;
  totalClicksSync?: number;
  syncClickCount?: () => void;
}

function AdminPanel({
  state,
  onRefresh,
  onUpdateState,
  passcode,
  setPasscode,
  isAdminUnlocked,
  setIsAdminUnlocked,
  onCleanupDuplicates,
  totalClicksSync = 0,
  syncClickCount
}: AdminPanelProps) {
  // Authentication State
  const [authError, setAuthError] = useState("");

  // Quota Stats State
  const [fetchedQuotaStats, setFetchedQuotaStats] = useState<any>(null);
  const [isFetchingQuota, setIsFetchingQuota] = useState(false);

  const fetchQuotaStats = async () => {
    try {
      setIsFetchingQuota(true);
      const res = await fetch("/api/quota-stats");
      if (res.ok) {
        const data = await res.json();
        setFetchedQuotaStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch quota stats:", e);
    } finally {
      setIsFetchingQuota(false);
    }
  };

  const currentQuotaStats = fetchedQuotaStats || state.quotaStats;
  
  // Bot Form State
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [deletingBotRef, setDeletingBotRef] = useState<{ id: string, name: string } | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(5);

  React.useEffect(() => {
    let timerID: any;
    if (deletingBotRef) {
      setDeleteCountdown(5);
      timerID = setInterval(() => {
        setDeleteCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerID);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerID) clearInterval(timerID);
    };
  }, [deletingBotRef]);

  const [isFlushingQueue, setIsFlushingQueue] = useState(false);
  const [flushMessage, setFlushMessage] = useState("");

  const handleFlushQueue = async () => {
    setIsFlushingQueue(true);
    setFlushMessage("");
    try {
      const res = await fetch("/api/flush-pending", { method: "POST" });
      const data = await res.json();
      if (data.processed !== undefined) {
        if (data.processed > 0) {
          setFlushMessage(`✅ Đã đẩy thành công ${data.processed} mục lên Cloud!`);
        } else if (data.remaining > 0) {
          setFlushMessage(`⚠️ Vẫn còn ${data.remaining} mục chờ (Hạn ngạch Cloud có thể chưa khôi phục).`);
        } else {
          setFlushMessage("✅ Tất cả dữ liệu mới đã được lưu an toàn trên Cloud!");
        }
        onRefresh();
      } else {
        setFlushMessage("❌ Có lỗi xảy ra khi đẩy hàng đợi đệm.");
      }
    } catch (e) {
      setFlushMessage("❌ Lỗi kết nối máy chủ.");
    } finally {
      setIsFlushingQueue(false);
    }
  };
  const [botFormName, setBotFormName] = useState("");
  const [botFormImageUrl, setBotFormImageUrl] = useState("");
  const [botFormType, setBotFormType] = useState<"GL" | "Futa">("GL");
  const [botFormNote, setBotFormNote] = useState("");
  const [botFormTags, setBotFormTags] = useState("");
  const [botFormLinks, setBotFormLinks] = useState<BotLink[]>([
    { id: "1", label: "Link Google AI Studio", url: "" }
  ]);
  const [botSubmitError, setBotSubmitError] = useState("");
  const [botSubmitSuccess, setBotSubmitSuccess] = useState("");

  // Author settings Form State
  const [authorNameInput, setAuthorNameInput] = useState(state.authorSettings?.authorName || "");
  const [welcomeTitleInput, setWelcomeTitleInput] = useState(state.authorSettings?.welcomeTitle || "");
  const [welcomeSubtitleInput, setWelcomeSubtitleInput] = useState(state.authorSettings?.welcomeSubtitle || "");
  const [welcomeIntroInput, setWelcomeIntroInput] = useState(state.authorSettings?.welcomeIntro || "");
  const [bannerUrlInput, setBannerUrlInput] = useState(state.authorSettings?.bannerUrl || "");
  const [facebookUrlInput, setFacebookUrlInput] = useState(state.authorSettings?.facebookUrl || "");
  const [discordUrlInput, setDiscordUrlInput] = useState(state.authorSettings?.discordUrl || "");
  const [authorSaveSuccess, setAuthorSaveSuccess] = useState("");
  const [authorSaveError, setAuthorSaveError] = useState("");



  // Refresh local states during state updates
  React.useEffect(() => {
    if (state.authorSettings) {
      setAuthorNameInput(state.authorSettings.authorName || "");
      setWelcomeTitleInput(state.authorSettings.welcomeTitle || "");
      setWelcomeSubtitleInput(state.authorSettings.welcomeSubtitle || "");
      setWelcomeIntroInput(state.authorSettings.welcomeIntro || "");
      setBannerUrlInput(state.authorSettings.bannerUrl || "");
      setFacebookUrlInput(state.authorSettings.facebookUrl || "");
      setDiscordUrlInput(state.authorSettings.discordUrl || "");
    }
  }, [state.authorSettings]);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annError, setAnnError] = useState("");
  const [annSuccess, setAnnSuccess] = useState("");

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsText, setPollOptionsText] = useState("");
  const [pollError, setPollError] = useState("");
  const [pollSuccess, setPollSuccess] = useState("");

  // Feedback Reply State
  const [replyInput, setReplyInput] = useState<{ [feedbackId: string]: string }>({});
  // Request Reply State
  const [reqReplyInput, setReqReplyInput] = useState<{ [reqId: string]: string }>({});

  // Tag Auto-complete suggestions state
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Global Tag actions state
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [renameTagValue, setRenameTagValue] = useState("");
  const [tagActionError, setTagActionError] = useState("");
  const [tagActionSuccess, setTagActionSuccess] = useState("");


  const [tagActionLoading, setTagActionLoading] = useState(false);

  const allExistingTags = React.useMemo(() => {
    return Array.from(new Set(state.bots.flatMap(bot => bot.tags || [])))
      .map(t => t.trim())
      .filter(Boolean);
  }, [state.bots]);

  const tagsWithCounts = React.useMemo(() => {
    const counts: { [tag: string]: number } = {};
    state.bots.forEach(bot => {
      if (bot.tags) {
        bot.tags.forEach(t => {
          const clean = t.trim();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]); // sort by frequency
  }, [state.bots]);

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === "1492007") {
      setIsAdminUnlocked(true);
      setAuthError("");
      localStorage.setItem("admin_passcode", "1492007");
    } else {
      setAuthError("Mật mã bảo mật không chính xác!");
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setPasscode("");
    localStorage.removeItem("admin_passcode");
  };

  // Bot Logic
  const handleAddLinkRow = () => {
    setBotFormLinks([
      ...botFormLinks,
      { id: Date.now().toString(), label: "Link Google AI Studio", url: "" }
    ]);
  };

  const handleRemoveLinkRow = (id: string) => {
    setBotFormLinks(botFormLinks.filter(l => l.id !== id));
  };

  const handleLinkChange = (id: string, field: "label" | "url", value: string) => {
    setBotFormLinks(
      botFormLinks.map(l => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBotSubmitError("");
    setBotSubmitSuccess("");

    if (!botFormName.trim()) {
      setBotSubmitError("Vui lòng điền tên Bot!");
      return;
    }

    const tagsArray = Array.from(new Set<string>(
      botFormTags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
    ));

    const validLinks = botFormLinks.filter(l => l.url.trim().length > 0);

    try {
      let finalImageUrl = botFormImageUrl.trim();
      if (finalImageUrl.startsWith("data:")) {
        const uploadedUrl = await uploadImageToCloud(finalImageUrl, "bot_covers");
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      const botObj: Bot = {
        id: editingBotId || "",
        name: botFormName.trim(),
        imageUrl: finalImageUrl,
        type: botFormType,
        tags: tagsArray,
        authorNote: botFormNote.trim(),
        links: validLinks,
        createdAt: new Date().toISOString(),
        views: 0,
        comments: []
      };

      const response = await fetch(`/api/bots?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ bot: botObj })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gặp lỗi khi lưu Bot");
      }

      setBotSubmitSuccess(editingBotId ? "Đã cập nhật Bot thành công!" : "Đã đăng Bot mới thành công!");
      resetBotForm();
      onRefresh();
    } catch (error: any) {
      setBotSubmitError(error.message);
    }
  };

  const resetBotForm = () => {
    setEditingBotId(null);
    setBotFormName("");
    setBotFormImageUrl("");
    setBotFormType("GL");
    setBotFormNote("");
    setBotFormTags("");
    setBotFormLinks([{ id: "1", label: "Link Google AI Studio", url: "" }]);
  };

  const handleEditBot = (bot: Bot) => {
    setEditingBotId(bot.id);
    setBotFormName(bot.name);
    setBotFormImageUrl(bot.imageUrl || "");
    setBotFormType(bot.type);
    setBotFormNote(bot.authorNote);
    setBotFormTags(bot.tags.join(", "));
    setBotFormLinks(bot.links.length > 0 ? bot.links : [{ id: "1", label: "Link Google AI Studio", url: "" }]);
    
    // Scroll to form
    const el = document.getElementById("bot-editor-form-scroll");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteBot = (id: string, name: string) => {
    setDeletingBotRef({ id, name });
  };

  const handleConfirmDeleteBot = async () => {
    if (!deletingBotRef) return;
    const { id, name } = deletingBotRef;

    try {
      const response = await fetch(`/api/bots/${id}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: {
          "x-admin-passcode": passcode
        }
      });
      if (response.ok) {
        onRefresh();
        setDeletingBotRef(null);
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Xóa Bot thất bại: " + (err.error || "Mã trạng thái " + response.status));
      }
    } catch (e: any) {
      console.error(e);
      alert("Lỗi mạng khi xóa Bot: " + e.message);
    }
  };

  // Announcement Logic
  const handlePublishAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError("");
    setAnnSuccess("");

    if (!annTitle.trim() || !annContent.trim()) {
      setAnnError("Vui lòng điền đủ tiêu đề và nội dung!");
      return;
    }

    try {
      const response = await fetch(`/api/announcements?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ title: annTitle.trim(), content: annContent.trim() })
      });

      if (response.ok) {
        setAnnSuccess("Đặt thông báo thành công!");
        setAnnTitle("");
        setAnnContent("");
        onRefresh();
      } else {
        const err = await response.json();
        setAnnError(err.error || "Gửi thông báo thất bại");
      }
    } catch (e: any) {
      setAnnError(e.message);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setPollError("");
    setPollSuccess("");

    if (!pollQuestion.trim() || !pollOptionsText.trim()) {
      setPollError("Vui lòng điền câu hỏi khảo sát và đủ các lựa chọn!");
      return;
    }

    const rawOptions = pollOptionsText
      .split("\n")
      .map(o => o.trim())
      .filter(o => o.length > 0);

    if (rawOptions.length < 2) {
      setPollError("Vui lòng nhập tối thiểu 2 phương án lựa chọn, mỗi phương án nằm trên một dòng!");
      return;
    }

    try {
      const response = await fetch(`/api/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ question: pollQuestion.trim(), options: rawOptions })
      });

      if (response.ok) {
        setPollSuccess("Đăng khảo sát ý kiến thành công!");
        setPollQuestion("");
        setPollOptionsText("");
        onRefresh();
      } else {
        const err = await response.json();
        setPollError(err.error || "Gặp lỗi khi tạo khảo sát");
      }
    } catch (e: any) {
      setPollError("Gặp lỗi kết nối đến máy chủ: " + e.message);
    }
  };

  const handleDeletePoll = async (id: string, question: string) => {
    if (!confirm(`Bạn có chắc muốn xóa khảo sát ý kiến: "${question}" không?`)) return;

    try {
      const response = await fetch(`/api/polls/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-passcode": passcode
        }
      });
      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Xóa khảo sát thất bại: " + (err.error || "Lỗi không xác định"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi kết nối đến máy chủ: " + e.message);
    }
  };

  const handleDeleteAnn = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;

    try {
      const response = await fetch(`/api/announcements/${id}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode }
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAuthorSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthorSaveError("");
    setAuthorSaveSuccess("");

    try {
      const response = await fetch(`/api/author-settings?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({
          settings: {
            authorName: authorNameInput.trim() || "Tác Giả Ẩn Danh",
            welcomeTitle: welcomeTitleInput.trim() || "Cổng Chia Sẻ Bot GL & FUTA chất lượng cao!",
            welcomeSubtitle: welcomeSubtitleInput.trim() || "Nơi trải nghiệm các bot AI đẳng cấp",
            welcomeIntro: welcomeIntroInput.trim() || "",
            bannerUrl: bannerUrlInput.trim(),
            facebookUrl: facebookUrlInput.trim(),
            discordUrl: discordUrlInput.trim()
          }
        })
      });

      if (response.ok) {
        setAuthorSaveSuccess("Đã lưu thông tin giới thiệu của Tác Giả thành công!");
        onRefresh();
      } else {
        const err = await response.json();
        setAuthorSaveError(err.error || "Có lỗi bất ngờ xảy ra!");
      }
    } catch (err: any) {
      setAuthorSaveError(err.message || "Lỗi kết nối");
    }
  };

  // Feedback Reply Logic
  const handleReplyFeedback = async (id: string) => {
    const replyText = replyInput[id];
    if (!replyText || !replyText.trim()) return;

    try {
      const response = await fetch(`/api/feedbacks/${id}/reply?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ reply: replyText.trim() })
      });

      if (response.ok) {
        setReplyInput({ ...replyInput, [id]: "" });
        onRefresh();
      } else {
        alert("Gửi trả lời thất bại");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("Xóa ý kiến phản hồi này?")) return;

    try {
      const response = await fetch(`/api/feedbacks/${id}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode }
      });
      if (response.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Wish Request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Xóa yêu cầu đề xuất này?")) return;

    try {
      const response = await fetch(`/api/requests/${id}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode }
      });
      if (response.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Global Tag Rename (Admin Only)
  const handleRenameTagGlobally = async (oldTag: string) => {
    const cleanNew = renameTagValue.trim();
    if (!cleanNew) {
      setTagActionError("Nhãn mới không được bỏ trống!");
      return;
    }
    if (cleanNew.toLowerCase() === oldTag.toLowerCase()) {
      setEditingTagName(null);
      return;
    }

    setTagActionLoading(true);
    setTagActionError("");
    setTagActionSuccess("");

    try {
      const response = await fetch(`/api/admin/tags/rename?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ oldTag, newTag: cleanNew })
      });

      if (response.ok) {
        setTagActionSuccess(`Thay đổi thành công nhãn [${oldTag}] thành [${cleanNew}] toàn cầu!`);
        setEditingTagName(null);
        setRenameTagValue("");
        onRefresh();
      } else {
        const err = await response.json();
        setTagActionError(err.error || "Gặp lỗi khi sửa đổi nhãn.");
      }
    } catch (err: any) {
      setTagActionError(err.message || "Lỗi kết nối mạng.");
    } finally {
      setTagActionLoading(false);
    }
  };

  // Global Tag Delete (Admin Only)
  const handleDeleteTagGlobally = async (tag: string) => {
    if (!confirm(`Bạn có chắc muốn xóa nhãn [${tag}] toàn cục khỏi danh sách? Thẻ nhãn này sẽ biến mất khỏi toàn bộ các Bot đang gán.`)) return;

    setTagActionLoading(true);
    setTagActionError("");
    setTagActionSuccess("");

    try {
      const response = await fetch(`/api/admin/tags/delete?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ tag })
      });

      if (response.ok) {
        setTagActionSuccess(`Đã xóa sạch nhãn [${tag}] khỏi tất cả các bot AI hiện tại!`);
        onRefresh();
      } else {
        const err = await response.json();
        setTagActionError(err.error || "Gặp lỗi khi xóa nhãn.");
      }
    } catch (err: any) {
      setTagActionError(err.message || "Lỗi kết nối mạng.");
    } finally {
      setTagActionLoading(false);
    }
  };

  // Interact / Reply / Update Status for Reader Bot Request
  const handleInteractRequest = async (id: string, replyText?: string, statusValue?: string) => {
    try {
      const response = await fetch(`/api/requests/${id}/interact?passcode=${encodeURIComponent(passcode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify({ reply: replyText, status: statusValue })
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("Có lỗi xảy ra khi cập nhật yêu cầu đề xuất.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Reader Request Reply (Admin Only)
  const handleDeleteRequestReply = async (requestId: string, replyId: string) => {
    if (!confirm("Xóa phản hồi này của khách?")) return;

    try {
      const response = await fetch(`/api/requests/${requestId}/replies/${replyId}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: {
          "x-admin-passcode": passcode
        }
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("Có lỗi xảy ra khi xóa phản hồi.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Bot Comment
  const handleDeleteComment = async (botId: string, commentId: string) => {
    if (!confirm("Xóa bình luận này?")) return;

    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode }
      });
      if (response.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Comment Reply
  const handleDeleteCommentReply = async (botId: string, commentId: string, replyId: string) => {
    if (!confirm("Xóa phản hồi này?")) return;

    try {
      const response = await fetch(`/api/bots/${botId}/comments/${commentId}/replies/${replyId}?passcode=${encodeURIComponent(passcode)}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode }
      });
      if (response.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Main UI
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border border-slate-250/50 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-cyan-600 p-6 text-white text-center">
          <Terminal className="w-12 h-12 mx-auto text-cyan-200 mb-2 animate-pulse" />
          <h2 className="font-display text-xl font-bold">Xác thực Quyền Tác Giả</h2>
          <p className="text-cyan-100 text-xs mt-1">Vui lòng cung cấp khóa bí mật để đăng nhập trang quản trị chính chủ.</p>
        </div>
        <form onSubmit={handleUnlockAdmin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Mật mã bảo mật tác giả (Passcode)
            </label>
            <div className="relative">
              <input
                id="admin-passcode-input"
                type="password"
                placeholder="Nhập khóa để mở..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 pl-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-center text-lg dark:text-white"
                autoFocus
              />
              <Key className="w-5 h-5 text-cyan-500 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-450 mt-2 text-justify italic">
              *Mật mã bảo mật do Tác giả tự lưu trữ để tránh người ngoài truy cập trái phép. Vui lòng nhập đúng để mở khóa tính năng.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-250/50 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-red-600 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            id="btn-unlock-admin"
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mở Khóa Quản Trị
          </button>
        </form>
      </div>
    );
  }

  // Data for charts
  const glCount = state.bots.filter(b => b.type === "GL").length;
  const futaCount = state.bots.filter(b => b.type === "Futa").length;
  
  const botTypeData = [
    { name: 'GL', value: glCount, color: '#06b6d4' },
    { name: 'Futa', value: futaCount, color: '#a855f7' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Admin Quick Tools */}
      <div className="bg-slate-900/80 backdrop-blur-xl text-white rounded-2xl p-6 border border-cyan-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Coastal absolute glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500 text-slate-950 rounded uppercase">Tác Giả</span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Tổng Quan Hệ Thống Quản Trị
            </h2>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Chào mừng bạn trở lại, tác giả! Tại đây bạn có thể cập nhật thông báo, chỉnh sửa các bot GL & Futa hiện tại, trả lời ý kiến đóng góp của người đọc của mình.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-admin"
            onClick={onRefresh}
            className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-700 text-cyan-300 cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold"
            title="Đồng bộ lại"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới dữ liệu
          </button>
          
          <button
            id="btn-lock-admin"
            onClick={handleLockAdmin}
            className="px-3 py-2 bg-rose-950/40 text-rose-400 border border-rose-900/50 rounded-lg hover:bg-rose-900/50 cursor-pointer text-xs font-semibold transition"
          >
            Thoát chế độ tác giả
          </button>
        </div>
      </div>

      {/* Pending Queue Status Banner */}
      {((state.pendingWritesCount || 0) > 0 || flushMessage) && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300 gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 animate-ping shrink-0" />
            <span>
              {flushMessage || `Hiện có ${state.pendingWritesCount} mục dữ liệu mới đang được lưu trữ đệm trong hàng đợi. Khi Firestore khôi phục hạn ngạch, hãy bấm nút "Đẩy Cloud" để cập nhật vĩnh viễn lên Cloud.`}
            </span>
          </div>
          <button
            onClick={handleFlushQueue}
            disabled={isFlushingQueue}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 rounded-lg font-bold text-amber-200 cursor-pointer shrink-0 transition"
          >
            {isFlushingQueue ? "Đang đẩy..." : "Thử Đẩy Ngay"}
          </button>
        </div>
      )}

      {/* Admin Quick Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-500" /> Tổng Lượt Click (Hệ Thống)
          </p>
          <p className="text-3xl font-display font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {(totalClicksSync || state.bots.reduce((acc, current) => acc + (current.views || 0), 0)).toLocaleString()}
          </p>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold mt-1 flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" /> Đồng bộ từ Cloud
          </p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tổng số Bot</p>
          <p className="text-3xl font-display font-bold text-cyan-600 dark:text-cyan-400 mt-1">{state.bots.length}</p>
          <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
            <span>GL: {state.bots.filter(b => b.type === "GL").length}</span>
            <span>|</span>
            <span>Futa: {state.bots.filter(b => b.type === "Futa").length}</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Thông báo</p>
          <p className="text-3xl font-display font-bold text-amber-500 mt-1">{state.announcements.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Kênh bản tin & push Alert</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Góp ý chưa reply</p>
          <p className="text-3xl font-display font-bold text-indigo-500 mt-1">
            {state.feedbacks.filter(f => !f.reply && !(f.replies && f.replies.some(r => r.isAdmin || r.nickname?.toLowerCase() === "zeze" || r.nickname?.toLowerCase() === "admin"))).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Trên tổng số {state.feedbacks.length} cái</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Bot Management */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Bot Creator/Editor */}
          <div id="bot-editor-form-scroll" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-800 to-blue-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-200" />
                <h3 className="font-display font-bold">
                  {editingBotId ? `Sửa Bot: "${botFormName}"` : "Đăng thêm Bot mới"}
                </h3>
              </div>
              {editingBotId && (
                <button
                  id="btn-cancel-edit-bot"
                  onClick={resetBotForm}
                  className="text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-white cursor-pointer"
                >
                  Hủy sửa (Thêm mới)
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBot} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 text-xs">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">TÊN BOT AI</label>
                  <input
                    id="admin-form-bot-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Vợ Khờ Ngọt Ngào, Yuki - Học trưởng Futa..."
                    value={botFormName}
                    onChange={(e) => setBotFormName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"
                  />
                </div>

                <div className="col-span-1 text-xs">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">ẢNH ĐẠI DIỆN BOT</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const MAX_WIDTH = 1200;
                          const MAX_HEIGHT = 1200;
                          let width = img.width;
                          let height = img.height;
                          
                          if (width > height) {
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                            }
                          } else {
                            if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height;
                              height = MAX_HEIGHT;
                            }
                          }
                          
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            // Compress as WebP for beautiful high-quality resolution with optimized size
                            const dataUrl = canvas.toDataURL("image/webp", 0.95);
                            setBotFormImageUrl(dataUrl);
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
                  />
                  {botFormImageUrl && (
                    <div className="mt-2 relative inline-block">
                      <img src={botFormImageUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                      <button type="button" onClick={() => setBotFormImageUrl("")} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">KIỂU MÔ HÌNH BOT</label>
                  <select
                    id="admin-form-bot-type"
                    value={botFormType}
                    onChange={(e) => setBotFormType(e.target.value as "GL" | "Futa")}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"
                  >
                    <option value="GL">Bot thuần GL (Girls Love)</option>
                    <option value="Futa">Bot Futa (Cường bạo/Ngọt bối cảnh)</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  TAGS PHÂN LOẠI (Cách nhau bằng dấu phẩy)
                </label>
                <input
                  id="admin-form-bot-tags"
                  type="text"
                  autoComplete="off"
                  placeholder="Ví dụ: GL, Tổng Tài, Sủng Ngọt, Ngược Luyến, ABO"
                  value={botFormTags}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBotFormTags(val);
                    const parts = val.split(",");
                    const currentPart = parts[parts.length - 1].trim();
                    if (currentPart.length > 0) {
                      const lowercaseCurrent = currentPart.toLowerCase();
                      const filtered = allExistingTags.filter(tag =>
                        tag.toLowerCase().includes(lowercaseCurrent) &&
                        !parts.map(p => p.trim().toLowerCase()).slice(0, -1).includes(tag.toLowerCase())
                      );
                      setTagSuggestions(filtered);
                      setShowSuggestions(true);
                    } else {
                      setTagSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onBlur={() => {
                    // Slight delay to allow clicking suggestions before blur hides them
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"
                />
                
                {/* Autocomplete Dropdown List */}
                {showSuggestions && tagSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                    <div className="p-1 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/80">Nhãn gợi ý sẵn có</div>
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const parts = botFormTags.split(",");
                          parts[parts.length - 1] = " " + tag;
                          setBotFormTags(parts.join(",") + ", ");
                          setTagSuggestions([]);
                          setShowSuggestions(false);
                          const el = document.getElementById("admin-form-bot-tags");
                          if (el) el.focus();
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Tag className="w-3 h-3 text-cyan-500" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <span className="text-[10px] text-slate-400 block mt-1">
                  *Gợi ý tag phổ biến: GL, Futa, Tổng tài, Học đường, Oan gia, Fantasy, Ngọt sủng, ABO, Hắc hóa.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">LỜI TÁC GIẢ / THUYẾT MINH</label>
                <textarea
                  id="admin-form-bot-note"
                  rows={3}
                  placeholder="Mô tả bối cảnh, lời hướng dẫn, lời dặn dò của bạn dành cho người chat với bot..."
                  value={botFormNote}
                  onChange={(e) => setBotFormNote(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"
                ></textarea>
              </div>

              {/* Dynamic Bot Links Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    CHỖ GẮN LINK (C.ai, Janitor, Chub, Discord, v.v.)
                  </label>
                  <button
                    id="btn-add-link-row"
                    type="button"
                    onClick={handleAddLinkRow}
                    className="p-1 px-2.5 bg-cyan-50 dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm cột Link
                  </button>
                </div>

                <div className="space-y-2">
                  {botFormLinks.map((link, idx) => (
                    <div key={link.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-150 dark:border-slate-800">
                      <span className="text-xs text-slate-400 font-bold w-5">#{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Tên nút (ví dụ: Chat tại C.ai)"
                        value={link.label}
                        onChange={(e) => handleLinkChange(link.id, "label", e.target.value)}
                        className="w-1/3 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs dark:text-white"
                        required
                      />
                      <input
                        type="url"
                        placeholder="https://character.ai/chat/..."
                        value={link.url}
                        onChange={(e) => handleLinkChange(link.id, "url", e.target.value)}
                        className="flex-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs dark:text-white"
                        required
                      />
                      {botFormLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLinkRow(link.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {botSubmitError && (
                <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-lg text-xs font-medium">
                  {botSubmitError}
                </div>
              )}

              {botSubmitSuccess && (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 rounded-lg text-xs font-medium">
                  {botSubmitSuccess}
                </div>
              )}

              <button
                id="btn-submit-bot-form"
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow transition"
              >
                <Save className="w-4 h-4" />
                {editingBotId ? "Lưu thay đổi bài đăng" : "Đăng Bot Lên Hệ Thống"}
              </button>
            </form>
          </div>


          {/* Global Tag Management (Quản lý Thẻ Tag Toàn Cầu) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-500" />
                Quản Lý Bộ Thẻ Tags Toàn Cầu
              </h3>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-500 font-black">
                {tagsWithCounts.length} UNIQUE TAGS
              </span>
            </div>
            
            <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed text-justify">
              Dưới đây là thống kê tất cả các nhãn độc lạ hiện diện trên hệ thống. Bạn có thể <strong>Đổi tên</strong> (sửa đổi đồng bộ trên mọi bot AI) hoặc <strong>Xóa sạch</strong> nhãn này hoàn toàn khỏi mọi bài viết chỉ bằng một thao tác duy nhất.
            </p>

            {tagActionError && (
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-rose-600 dark:text-rose-450 rounded-lg text-xs font-semibold">
                {tagActionError}
              </div>
            )}
            {tagActionSuccess && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                {tagActionSuccess}
              </div>
            )}

            {tagsWithCounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Chưa có thẻ nhãn nào được sử dụng trong các bot.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {tagsWithCounts.map(([tag, count]) => {
                  const isEditingThis = editingTagName === tag;
                  return (
                    <div 
                      key={tag} 
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between transition hover:border-cyan-500/20"
                    >
                      {isEditingThis ? (
                        <div className="w-full flex items-center gap-2">
                          <input
                            type="text"
                            value={renameTagValue}
                            onChange={(e) => setRenameTagValue(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="Tên tag mới..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameTagGlobally(tag)}
                            disabled={tagActionLoading}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-bold cursor-pointer transition"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTagName(null)}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded text-[10px] dark:text-slate-300 cursor-pointer transition"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                              <Tag className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                              #{tag}
                            </span>
                            <span className="text-[10px] text-slate-450 mt-0.5">Sử dụng trên: <strong>{count}</strong> bot</span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTagName(tag);
                                setRenameTagValue(tag);
                              }}
                              className="p-1 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/5 rounded transition cursor-pointer"
                              title="Sửa tên tag toàn cầu"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTagGlobally(tag)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded transition cursor-pointer"
                              title="Xóa tag này toàn cầu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* Create Poll / Survey - Shifted right above bot list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-3 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-500 animate-pulse" />
              Khảo Sát Ý Kiến Độc Giả
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mb-4 text-justify">
              Đăng câu hỏi thăm dò ý kiến độc giả ngay tại đây để nhận về phản hồi. Tác giả có thể xóa khảo sát bất kỳ lúc nào sau khi đã thu được kết quả trực quan.
            </p>

            <form onSubmit={handleCreatePoll} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Câu hỏi khảo sát mới</label>
                <input
                  id="admin-poll-question"
                  type="text"
                  placeholder="Ví dụ: Bạn muốn mình ra mắt nội dung gì tiếp theo?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Các đáp án lựa chọn (mỗi dòng một đáp án)</label>
                <textarea
                  id="admin-poll-options"
                  rows={3}
                  placeholder="Phương án A&#10;Phương án B&#10;Phương án C"
                  value={pollOptionsText}
                  onChange={(e) => setPollOptionsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                ></textarea>
                <span className="text-[10px] text-slate-400 mt-1 block">Tối thiểu nhập 2 lựa chọn để tạo khảo sát hợp lệ.</span>
              </div>

              {pollError && <div className="text-[11px] text-red-500">{pollError}</div>}
              {pollSuccess && <div className="text-[11px] text-emerald-500">{pollSuccess}</div>}

              <button
                id="btn-create-poll"
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-2 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Gửi khảo sát lên cổng
              </button>
            </form>

            {/* List of active polls inside admin screen */}
            {state.polls && state.polls.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wide">Danh sách khảo sát hiện có ({state.polls.length})</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {state.polls.map((poll) => {
                    const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                    return (
                      <div key={poll.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-extrabold text-slate-800 dark:text-slate-200">{poll.question}</p>
                          <button
                            type="button"
                            onClick={() => handleDeletePoll(poll.id, poll.question)}
                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 rounded-lg cursor-pointer shrink-0 transition"
                            title="Xóa cuộc khảo sát này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {poll.options.map((opt) => {
                            const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            return (
                              <div key={opt.id} className="text-[11px]">
                                <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium mb-0.5">
                                  <span>{opt.text}</span>
                                  <span className="font-semibold">{opt.votes} lượt ({percent}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 text-right font-medium">Tổng cộng: {totalVotes} phiếu</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* List of existing bots with actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Danh sách Bot Đã Đăng ({state.bots.length})
            </h3>

            {state.bots.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Chưa có bot nào được đăng. Hãy dùng form phía trên để tự điền bài mới đầu tiên nhé!
              </div>
            ) : (
              <div className="space-y-4">
                {[...state.bots]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((bot) => (
                  <div 
                    key={bot.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bot.type === "GL" 
                            ? "bg-purple-100 dark:bg-purple-950 text-indigo-700 dark:text-purple-300" 
                            : "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300"
                        }`}>
                          {bot.type === "GL" ? "Bot Thuần GL" : "Bot Futa"}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{bot.name}</h4>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from(new Set(bot.tags)).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 flex items-center gap-4 mt-2">
                        <span>Lịch sử: {new Date(bot.createdAt).toLocaleDateString("vi-VN")}</span>
                        <span>Click link: {bot.views || 0} lần</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        id={`btn-edit-bot-${bot.id}`}
                        onClick={() => handleEditBot(bot)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer"
                        title="Chỉnh sửa bài"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-bot-${bot.id}`}
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-lg cursor-pointer"
                        title="Xóa bài"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Column 3: Announcements, Feedbacks, and Visitor Tracking */}
        <div className="space-y-8">
          
          {/* Author/Tagline Profile Config Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500 animate-pulse" />
              Cấu Hình Lời Giới Thiệu
            </h3>
            <p className="text-xs text-slate-400 mb-4 text-justify">
              Chỉnh sửa biệt danh của bạn, các tiêu đề chào mừng đón tiếp độc giả và liên kết khi vào trang web.
            </p>

            <form onSubmit={handleSaveAuthorSettings} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tên Tác Giả / Biệt Danh</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tác Giả Sóng Biển, Neko-chan..."
                  value={authorNameInput}
                  onChange={(e) => setAuthorNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tiêu Đề Chào Mừng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cổng chia sẻ bot GL & Futa..."
                  value={welcomeTitleInput}
                  onChange={(e) => setWelcomeTitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Phụ Đề Lời Chào</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nơi trải nghiệm cốt truyện đỉnh cao..."
                  value={welcomeSubtitleInput}
                  onChange={(e) => setWelcomeSubtitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Thuyết Minh Chi Tiết</label>
                <textarea
                  rows={3}
                  placeholder="Viết lời mời chào dặn độc giả..."
                  value={welcomeIntroInput}
                  onChange={(e) => setWelcomeIntroInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-widest font-bold">
                  Ảnh Nền Hồ Sơ Tác Giả (URL hình ảnh)
                </label>
                <input
                  type="url"
                  placeholder="Nhập liên kết ảnh làm hình nền hồ sơ tác giả..."
                  value={bannerUrlInput}
                  onChange={(e) => setBannerUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                {bannerUrlInput && (
                  <div className="relative h-20 w-full bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 select-none">
                    <img 
                      src={bannerUrlInput} 
                      referrerPolicy="no-referrer"
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Link Facebook</label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={facebookUrlInput}
                    onChange={(e) => setFacebookUrlInput(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Link Discord</label>
                  <input
                    type="url"
                    placeholder="https://discord.gg/..."
                    value={discordUrlInput}
                    onChange={(e) => setDiscordUrlInput(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {authorSaveError && <div className="text-[11px] text-red-500">{authorSaveError}</div>}
              {authorSaveSuccess && <div className="text-[11px] text-emerald-500">{authorSaveSuccess}</div>}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Lưu cấu hình tác giả
              </button>
            </form>
          </div>

          {/* Post Announcement */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
              Đăng Thông Báo & Báo Chuông
            </h3>
            <p className="text-xs text-slate-400 mb-4 text-justify">
              Đăng bản tin mới nhất của bạn (Update bot, link hỏng, tết nhất...). Đăng xong hệ thống sẽ báo chuông / hiển thị "Thông báo mới" cho người dùng.
            </p>

            <form onSubmit={handlePublishAnn} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tiêu Đề Thông Báo</label>
                <input
                  id="admin-ann-title"
                  type="text"
                  placeholder="Ví dụ: Bảo trì link Futa Bot ngày 28/5..."
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Nội Dung Chi Tiết</label>
                <textarea
                  id="admin-ann-content"
                  rows={3}
                  placeholder="Ghi rõ nội dung bạn muốn người đọc xem được..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                ></textarea>
              </div>

              {annError && <div className="text-[11px] text-red-500">{annError}</div>}
              {annSuccess && <div className="text-[11px] text-emerald-500">{annSuccess}</div>}

              <button
                id="btn-publish-ann"
                type="submit"
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Gửi thông báo ngay
              </button>
            </form>

            {/* List of announcements with delete */}
            {state.announcements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Thông báo đã đăng</p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  {state.announcements.map((ann) => (
                    <div key={ann.id} className="p-2 bg-slate-50 dark:bg-slate-950 rounded text-xs flex items-start justify-between gap-2">
                      <div className="truncate">
                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{ann.title}</p>
                        <p className="text-[10px] text-slate-400">{new Date(ann.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteAnn(ann.id)}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>



          {/* Manage Feedbacks & Replies */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Góc Phản Hồi Từ Độc Giả ({state.feedbacks.length})
            </h3>

            {state.feedbacks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa nhận được hòm thư góp ý / feedback nào.</p>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {[...state.feedbacks]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((fb) => (
                  <div key={fb.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 relative">
                    <button
                      onClick={() => handleDeleteFeedback(fb.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title="Xóa Feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        fb.isAnonymous ? "bg-amber-150 text-amber-700" : "bg-cyan-155 text-cyan-700 font-semibold"
                      }`}>
                        {fb.isAnonymous ? "Ẩn danh" : `${fb.nickname}`}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {new Date(fb.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                      {(() => {
                        const isReplied = fb.reply || (fb.replies && fb.replies.some(r => r.isAdmin || r.nickname?.toLowerCase() === "zeze" || r.nickname?.toLowerCase() === "admin"));
                        return (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isReplied 
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" 
                              : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          }`}>
                            {isReplied ? "✓ Đã phản hồi" : "✗ Chưa phản hồi"}
                          </span>
                        );
                      })()}
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-850">
                      {fb.content}
                    </p>

                    {/* Show Existing Legacy Reply */}
                    {fb.reply && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900 text-[11px]">
                        <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                          <CornerDownRight className="w-3 h-3" /> Trả lời của bạn:
                        </span>
                        <p className="italic text-slate-600 dark:text-slate-300 mt-1">{fb.reply}</p>
                      </div>
                    )}
                    
                    {/* Display New Back-and-forth Replies */}
                    {fb.replies && fb.replies.length > 0 && (
                      <div className="space-y-2 mt-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                        {fb.replies.map((reply) => (
                          <div key={reply.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                {reply.nickname}
                                {reply.isAdmin && <span className="bg-red-500 text-white text-[8px] px-1 rounded font-bold">Tác giả</span>}
                              </span>
                              <span className="text-[8px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Admin Back-and-forth Reply Input */}
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Phản hồi lại độc giả..."
                          id={`admin-reply-fb-${fb.id}`}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const inputEl = e.target as HTMLInputElement;
                              if (inputEl.value.trim()) {
                                await fetch(`/api/feedbacks/${fb.id}/replies`, {
                                  method: "POST",
                                  headers: { 
                                    "Content-Type": "application/json",
                                    "x-admin-passcode": passcode
                                  },
                                  body: JSON.stringify({ 
                                    nickname: "Zeze", 
                                    content: inputEl.value.trim(), 
                                    isAdmin: true,
                                    passcode: passcode
                                  })
                                });
                                inputEl.value = '';
                                onRefresh();
                              }
                            }
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] flex-1 text-slate-700 dark:text-white"
                        />
                        <button
                          onClick={async () => {
                            const inputEl = document.getElementById(`admin-reply-fb-${fb.id}`) as HTMLInputElement;
                            if (inputEl && inputEl.value.trim()) {
                              await fetch(`/api/feedbacks/${fb.id}/replies`, {
                                method: "POST",
                                headers: { 
                                  "Content-Type": "application/json",
                                  "x-admin-passcode": passcode
                                },
                                body: JSON.stringify({ 
                                  nickname: "Zeze", 
                                  content: inputEl.value.trim(), 
                                  isAdmin: true,
                                  passcode: passcode
                                })
                              });
                              inputEl.value = '';
                              onRefresh();
                            }
                          }}
                          className="p-1 px-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] font-bold cursor-pointer transition"
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Bot Request Tracker */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-500 animate-bounce-slow" />
              Yêu Cầu Từ Độc Giả ({state.botRequests.length})
            </h3>
            
            {state.botRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có ai yêu cầu ý tưởng bot sắp tới.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {[...state.botRequests]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((req) => {
                  const currentStatus = req.status || "Chờ duyệt";
                  return (
                    <div key={req.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 text-xs relative space-y-1.5">
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="absolute top-2.5 right-2.5 px-2 py-0.5 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer font-bold text-[10px] transition"
                        title="Xóa yêu cầu"
                      >
                        Xóa
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{req.title}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase">{req.type}</span>
                      </div>

                      <div className="flex flex-wrap gap-2.5 my-1 text-[10px] text-slate-500">
                        <span>Yêu cầu bởi: <strong className="text-slate-650 dark:text-slate-300">@{req.nickname}</strong></span>
                        <span>&bull;</span>
                        <span className="text-amber-600 font-bold">{req.votes} Lượt thích</span>
                        <span>&bull;</span>
                        <span>Ngày tạo: {new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-justify italic mt-1 font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/5 p-2 rounded">
                        "{req.description}"
                      </p>

                      {/* Trạng thái selector */}
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">Trạng thái:</span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleInteractRequest(req.id, req.reply, e.target.value)}
                          className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[9.5px] font-bold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Chờ duyệt">⏳ Chờ duyệt</option>
                          <option value="Đang làm">⚙️ Đang làm</option>
                          <option value="Đã xong">✅ Đã xong</option>
                          <option value="Không khả thi">❌ Không khả thi</option>
                        </select>
                      </div>

                      {/* Phản hồi nhanh */}
                      <div className="space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5 mt-1">
                        {req.reply ? (
                          <div className="bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 p-2 rounded text-[11px] flex justify-between items-start gap-1">
                            <div>
                              <strong>Của bạn:</strong> {req.reply}
                            </div>
                            <button
                              onClick={() => handleInteractRequest(req.id, "", req.status)}
                              className="text-rose-500 font-bold hover:underline cursor-pointer text-[10px]"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Chưa phản hồi ý tưởng này</p>
                        )}

                        {/* Thread of user replies inside AdminPanel */}
                        {req.userReplies && req.userReplies.length > 0 && (
                          <div className="space-y-1.5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 my-2">
                            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Phản hồi từ độc giả ({req.userReplies.length}):</p>
                            {req.userReplies.map((ur) => (
                              <div key={ur.id} className="p-2 bg-slate-100/55 dark:bg-slate-900 border border-slate-200/30 dark:border-slate-850 rounded flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400">
                                    <span className="font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                                      @{ur.nickname}
                                      {ur.isAdmin && <span className="bg-red-500 text-white text-[8px] px-1 rounded font-bold">Tác giả</span>}
                                    </span>
                                    <span>&bull;</span>
                                    <span>{new Date(ur.createdAt).toLocaleDateString("vi-VN")}</span>
                                  </div>
                                  <p className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400">{ur.content}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteRequestReply(req.id, ur.id)}
                                  className="text-rose-500 font-bold hover:bg-rose-500/10 px-1 py-0.5 rounded text-[9px] cursor-pointer shrink-0 transition"
                                  title="Xóa phản hồi"
                                >
                                  Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {/* Back-and-forth Admin Reply */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Gửi phản hồi trả lời lại cho người dùng này..."
                              id={`admin-reply-req-${req.id}`}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const inputEl = e.target as HTMLInputElement;
                                  if (inputEl.value.trim()) {
                                    await fetch(`/api/requests/${req.id}/replies`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ nickname: "Zeze", content: inputEl.value.trim(), isAdmin: true })
                                    });
                                    inputEl.value = '';
                                    onRefresh();
                                  }
                                }
                              }}
                              className="flex-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded placeholder-slate-400 dark:placeholder-slate-500 text-[10.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              onClick={async () => {
                                const inputEl = document.getElementById(`admin-reply-req-${req.id}`) as HTMLInputElement;
                                if (inputEl && inputEl.value.trim()) {
                                  await fetch(`/api/requests/${req.id}/replies`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ nickname: "Zeze", content: inputEl.value.trim(), isAdmin: true })
                                  });
                                  inputEl.value = '';
                                  onRefresh();
                                }
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition cursor-pointer shrink-0"
                            >
                              Gửi Trả Lời
                            </button>
                          </div>
                          
                          {/* Legacy Status Reply */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nhập phản hồi nhanh trạng thái dự án..."
                              value={reqReplyInput[req.id] || ""}
                              onChange={(e) => setReqReplyInput({ ...reqReplyInput, [req.id]: e.target.value })}
                              className="flex-1 py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded placeholder-slate-400 dark:placeholder-slate-500 text-[10.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              onClick={() => {
                                const val = reqReplyInput[req.id] || "";
                                if (!val.trim()) return;
                                handleInteractRequest(req.id, val.trim(), req.status);
                                setReqReplyInput({ ...reqReplyInput, [req.id]: "" });
                              }}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[10px] transition cursor-pointer shrink-0"
                            >
                              Ghim Phản hồi
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>


    </div>
  );
}

const areAdminPanelPropsEqual = (prevProps: AdminPanelProps, nextProps: AdminPanelProps) => {
  if (prevProps.passcode !== nextProps.passcode) return false;
  if (prevProps.isAdminUnlocked !== nextProps.isAdminUnlocked) return false;

  const prevS = prevProps.state;
  const nextS = nextProps.state;

  if (!prevS || !nextS) return prevS === nextS;

  if (prevS.bots?.length !== nextS.bots?.length) return false;
  if (prevS.announcements?.length !== nextS.announcements?.length) return false;
  if (prevS.feedbacks?.length !== nextS.feedbacks?.length) return false;
  if (prevS.botRequests?.length !== nextS.botRequests?.length) return false;
  if (prevS.polls?.length !== nextS.polls?.length) return false;

  // Compare each bot's interaction/metadata changes
  const len = prevS.bots ? prevS.bots.length : 0;
  for (let i = 0; i < len; i++) {
    const pb = prevS.bots[i];
    const nb = nextS.bots[i];
    if (pb.id !== nb.id) return false;
    if (pb.views !== nb.views) return false;
    if (pb.likes !== nb.likes) return false;
    if (pb.name !== nb.name) return false;
    if (pb.updatedAt !== nb.updatedAt) return false;
    if (getBotCommentCount(pb) !== getBotCommentCount(nb)) return false;
  }

  // Author settings comparison
  if (JSON.stringify(prevS.authorSettings) !== JSON.stringify(nextS.authorSettings)) return false;

  return true;
};

export default React.memo(AdminPanel, areAdminPanelPropsEqual);
