import React, { useState, useEffect } from "react";
import { 
  Award, 
  Check, 
  Lock, 
  Sparkles, 
  Flame, 
  RotateCcw, 
  Heart, 
  MessageSquare, 
  ExternalLink,
  ShieldAlert,
  Edit3
} from "lucide-react";

interface BadgeStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  onEquipBadge: (badge: string) => void;
  equippedBadge: string;
  onEquipTitle: (title: string) => void;
  equippedTitle: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  category: "lgbt" | "funny";
  color: string; // Tailwind class
  description: string;
  icon: string;
}

export function BadgeStoreModal({
  isOpen,
  onClose,
  nickname,
  onEquipBadge,
  equippedBadge,
  onEquipTitle,
  equippedTitle
}: BadgeStoreModalProps) {
  const userKey = nickname || "anonymous";

  const [customTitleInput, setCustomTitleInput] = useState(equippedTitle || "");
  const [activeTab, setActiveTab] = useState<"title" | "badge">("title");

  // Load title input from equippedTitle on open
  useEffect(() => {
    if (isOpen) {
      setCustomTitleInput(equippedTitle || "");
    }
  }, [isOpen, equippedTitle]);

  if (!isOpen) return null;

  // Predefined Badges
  const badges: BadgeItem[] = [
    // LGBT Badges
    {
      id: "lesbian",
      name: "Lesbian Pride 🧡🤍💖",
      category: "lgbt",
      color: "bg-gradient-to-r from-orange-400 via-pink-100 to-rose-500 text-rose-950 border-rose-300",
      description: "Huy hiệu đặc biệt mang màu sắc lesbian kiêu hãnh.",
      icon: "🏳️‍🌈"
    },
    {
      id: "bisexual",
      name: "Bisexual Bold 💖💜💙",
      category: "lgbt",
      color: "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white border-purple-400",
      description: "Huy hiệu thể hiện sự tự hào bisexual.",
      icon: "🏳️‍🌈"
    },
    {
      id: "transgender",
      name: "Transgender Hope 🩵🩷🤍",
      category: "lgbt",
      color: "bg-gradient-to-r from-sky-300 via-pink-200 to-sky-300 text-sky-950 border-sky-200",
      description: "Huy hiệu tự hào chuyển giới nhẹ nhàng tinh tế.",
      icon: "🏳️‍⚧️"
    },
    {
      id: "rainbow",
      name: "Pride Ally 🌈",
      category: "lgbt",
      color: "bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500 text-white border-amber-300 animate-pulse",
      description: "Đồng minh kiên định và rực rỡ nhất.",
      icon: "🏳️‍🌈"
    },

    // Funny / Troll Badges
    {
      id: "baothu",
      name: "Báo Thủ Số 1 🚨",
      category: "funny",
      color: "bg-red-100 text-red-700 border-red-300 font-bold",
      description: "Huy hiệu lầy lội cho những người chuyên quậy phá.",
      icon: "🚨"
    },
    {
      id: "khia",
      name: "Chiến Thần Khịa Cạnh ⚔️",
      category: "funny",
      color: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      description: "Được cấp cho người đam mê khịa đểu mượt mà.",
      icon: "⚔️"
    },
    {
      id: "anchuc",
      name: "Thánh Ăn Chực 🍲",
      category: "funny",
      color: "bg-teal-50 text-teal-700 border-teal-200",
      description: "Nơi nào có Bot ngon là có bóng dáng ta ăn chực.",
      icon: "🍲"
    },
    {
      id: "ngoanxinhyeu",
      name: "Ngoan Xinh Yêu 🥰",
      category: "funny",
      color: "bg-pink-100 text-pink-700 border-pink-300 font-semibold",
      description: "Em bé ngọt ngào ngoan xinh yêu của cả cổng Bot.",
      icon: "🌸"
    },
    {
      id: "chualenh",
      name: "Chúa Tể Meme 🤡",
      category: "funny",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300 font-black",
      description: "Khóc bằng tiếng máng, nói chuyện bằng meme chúa hề.",
      icon: "🤡"
    }
  ];

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = customTitleInput.trim().substring(0, 15);
    onEquipTitle(cleanTitle);
    alert(`Đã gán danh hiệu tự chọn: "${cleanTitle || "Không có"}"`);
  };

  const handleClearTitle = () => {
    setCustomTitleInput("");
    onEquipTitle("");
  };

  return (
    <div id="badge_store_modal_overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div id="badge_store_modal_container" className="bg-white rounded-3xl border border-rose-100 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <Award size={20} />
            </div>
            <div>
              <h2 className="font-bold text-rose-950 text-base">Cửa Hàng Danh Hiệu Cá Nhân 🏆</h2>
              <p className="text-[11px] text-rose-600">Tự do gán danh hiệu tự chọn hoặc lựa chọn huy hiệu độc quyền!</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-rose-500 hover:text-rose-700 text-sm font-semibold bg-white border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-rose-100">
          <button
            onClick={() => setActiveTab("title")}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
              activeTab === "title" 
                ? "border-rose-500 text-rose-700 bg-rose-50/20" 
                : "border-transparent text-rose-500 hover:text-rose-700"
            }`}
          >
            ✍️ Tự Gán Danh Hiệu
          </button>
          <button
            onClick={() => setActiveTab("badge")}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
              activeTab === "badge" 
                ? "border-rose-500 text-rose-700 bg-rose-50/20" 
                : "border-transparent text-rose-500 hover:text-rose-700"
            }`}
          >
            🏳️‍🌈 Huy Hiệu LGBT & Troll
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: SELF-ASSIGN TITLE */}
          {activeTab === "title" && (
            <div className="space-y-4">
              <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 text-xs text-rose-950 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-rose-800 text-[13px] flex items-center gap-1">
                  <Sparkles size={14} /> Bạn có quyền tự gán danh hiệu của riêng mình!
                </p>
                <p>Nhập bất kỳ danh xưng nào bạn muốn (tối đa 15 ký tự). Danh hiệu này sẽ hiển thị ngay bên cạnh biệt danh của bạn trên mọi bình luận, góp ý hay đề xuất!</p>
              </div>

              <form onSubmit={handleSaveTitle} className="space-y-3">
                <label className="block text-xs font-bold text-rose-900">Danh hiệu của bạn:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTitleInput}
                    onChange={(e) => setCustomTitleInput(e.target.value)}
                    maxLength={15}
                    placeholder="Ví dụ: Ngoan Xinh Yêu, Báo Thủ..."
                    className="flex-1 bg-rose-50/40 border border-rose-200 rounded-xl px-4 py-2 text-xs text-rose-950 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Ghi nhận
                  </button>
                  {equippedTitle && (
                    <button
                      type="button"
                      onClick={handleClearTitle}
                      className="bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </form>

              {/* Show preview */}
              <div className="pt-4 border-t border-rose-100 flex flex-col items-center justify-center py-4 bg-stone-50 rounded-2xl">
                <span className="text-[10px] text-stone-500 font-medium mb-1">Bản xem trước hiển thị bình luận:</span>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-3xs">
                  <div className="w-7 h-7 rounded-full bg-rose-200 flex items-center justify-center text-xs font-bold text-rose-800">
                    S
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-rose-950">{nickname || "Bạn"}</span>
                      {customTitleInput.trim() && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-semibold">
                          {customTitleInput.trim()}
                        </span>
                      )}
                      {equippedBadge && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                          badges.find(b => b.id === equippedBadge)?.color || "bg-stone-100 text-stone-600"
                        }`}>
                          {badges.find(b => b.id === equippedBadge)?.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-600 mt-0.5">Vừa xong • Rất thích trang web này của Zeze! 🥰</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LGBT & FUNNY BADGES */}
          {activeTab === "badge" && (
            <div className="space-y-4">
              <p className="text-xs text-rose-600">Chọn một huy hiệu đặc trưng độc đáo dưới đây để trang bị (Click <b>Trang bị</b> để chọn hoặc cởi):</p>
              
              {/* LGBT Pride Group */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-rose-950 flex items-center gap-1 border-b border-rose-100 pb-1">
                  🏳️‍🌈 Huy Hiệu Kiêu Hãnh LGBT
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {badges.filter(b => b.category === "lgbt").map((badge) => {
                    const isEquipped = equippedBadge === badge.id;
                    return (
                      <div 
                        key={badge.id}
                        className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-all bg-white shadow-3xs ${
                          isEquipped ? "border-rose-500 ring-2 ring-rose-500/20" : "border-stone-150 hover:border-stone-250"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xl">{badge.icon}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.color}`}>
                              {badge.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-600 leading-normal">{badge.description}</p>
                        </div>
                        <button
                          onClick={() => onEquipBadge(isEquipped ? "" : badge.id)}
                          className={`mt-3 w-full py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isEquipped 
                              ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600" 
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check size={10} strokeWidth={3} /> Đang trang bị
                            </>
                          ) : (
                            "Trang bị"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Funny Troll Group */}
              <div className="space-y-2.5 pt-3">
                <h3 className="text-xs font-bold text-rose-950 flex items-center gap-1 border-b border-rose-100 pb-1">
                  🤪 Huy Hiệu Hài Hước Lầy Lội
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {badges.filter(b => b.category === "funny").map((badge) => {
                    const isEquipped = equippedBadge === badge.id;
                    return (
                      <div 
                        key={badge.id}
                        className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-all bg-white shadow-3xs ${
                          isEquipped ? "border-rose-500 ring-2 ring-rose-500/20" : "border-stone-150 hover:border-stone-250"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xl">{badge.icon}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.color}`}>
                              {badge.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-600 leading-normal">{badge.description}</p>
                        </div>
                        <button
                          onClick={() => onEquipBadge(isEquipped ? "" : badge.id)}
                          className={`mt-3 w-full py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isEquipped 
                              ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600" 
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check size={10} strokeWidth={3} /> Đang trang bị
                            </>
                          ) : (
                            "Trang bị"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-6 py-3 border-t border-rose-100/60 flex items-center justify-between text-[10px] text-stone-500">
          <span>Người dùng: <b className="text-stone-800">{nickname || "Khách"}</b></span>
          <span>Dữ liệu lưu trữ tự động trên phiên duyệt</span>
        </div>

      </div>
    </div>
  );
}
