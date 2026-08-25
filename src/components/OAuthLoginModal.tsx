import React, { useState, useEffect } from "react";
import { LogIn, Sparkles, Shield, User, Lock, Unlock, Eye, EyeOff, CheckCircle, AlertTriangle, HelpCircle, Waves, Info, LogOut } from "lucide-react";

interface OAuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (nickname: string, avatarUrl: string) => void;
  onLogout?: () => void;
  currentNickname?: string;
  currentAvatar?: string;
}

export default function OAuthLoginModal({ isOpen, onClose, onLoginSuccess, onLogout, currentNickname = "Vị Khách Đại Dương", currentAvatar = "🌊" }: OAuthLoginModalProps) {
  const [activeTab, setActiveTab] = useState<"secure" | "guest">("secure");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("🌊");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const isLoggedIn = currentNickname !== "Vị Khách Đại Dương" && currentNickname !== "";

  useEffect(() => {
    if (isOpen) {
      if (isLoggedIn) {
        setNickname(currentNickname);
        setSelectedAvatar(currentAvatar);
      } else if (!nickname) {
        setNickname("");
        setSelectedAvatar("🌊");
      }
      setPassword("");
      setErrorMsg(null);
      setIsEditingProfile(false);
    }
  }, [isOpen, isLoggedIn, currentNickname, currentAvatar]);

  if (!isOpen) return null;

  const avatars = [
    "🌊", "🧜‍♀️", "🐳", "🦊", "⚡", "✨", "🔥", "🔮", "🎨", "⚓", "🐚", "👾"
  ];

  const handleSecureAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNick = nickname.trim();
    if (!cleanNick) {
      setErrorMsg("Vui lòng nhập biệt danh muốn sở hữu!");
      return;
    }
    if (cleanNick.length < 2) {
      setErrorMsg("Biệt danh quá ngắn! Tối thiểu từ 2 ký tự.");
      return;
    }
    if (!password) {
      setErrorMsg("Vui lòng thiết lập hoặc điền Mật Khẩu để bảo mật danh tính!");
      return;
    }
    if (password.length < 3) {
      setErrorMsg("Mật khẩu/Passcode tối thiểu là 3 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: cleanNick,
          password: password,
          avatar: selectedAvatar
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi trong quá trình kết nối máy chủ");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onLoginSuccess(data.nickname, data.avatar);
        setLoading(false);
        setIsSuccess(false);
        onClose();
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err.message || "Tên tài khoản không khả dụng hoặc sai thông tin.");
      setLoading(false);
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    // Generate lovely coastal system name if empty
    const prefixes = ["Khách Hải Âu", "Sóng Đại Dương", "Nhân Ngư Tinh Anh", "Độc Giả Cute", "Ẩn Danh Thân Thiện"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const finalNick = cleanNick 
      ? `[Khách] ${cleanNick}` 
      : `${randomPrefix} #${Math.floor(Math.random() * 9000 + 1000)}`;
      
    // Safe-check reserved names even for guest aliases
    const lowerNick = finalNick.toLowerCase();
    const reservedNames = ["admin", "zeze", "moderator", "quản trị", "quản trị viên", "tác giả"];
    if (reservedNames.some(name => lowerNick.includes(name))) {
      setErrorMsg("Biệt danh khách không được chứa từ khóa nhạy cảm / hệ thống bảo lưu.");
      return;
    }

    onLoginSuccess(finalNick, "🌊");
    onClose();
  };

  const handleInstantGuest = () => {
    const prefixes = ["Khách Hải Âu", "Sóng Đại Dương", "Nhân Ngư Vô Danh", "San Hô Đẹp", "Sao Biển"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const finalNick = `${randomPrefix} #${Math.floor(Math.random() * 9000 + 1000)}`;
    onLoginSuccess(finalNick, "🐚");
    onClose();
  };

  const handleUpdateAvatar = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: currentNickname, avatar: selectedAvatar })
      });
      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.nickname, data.avatar);
        setIsEditingProfile(false);
      } else {
        setErrorMsg(data.error || "Lỗi cập nhật ảnh đại diện");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div 
        id="login-modal-container"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-cyan-100 dark:border-slate-800 overflow-hidden relative"
      >
        {/* Coastal Waves Banner */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/20"></div>
          
          <div className="absolute bottom-0 left-0 right-0 opacity-15 select-none pointer-events-none">
            <svg viewBox="0 0 1440 320" className="w-full h-8 fill-current text-white">
              <path d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,122.7C672,128,768,192,864,224C960,256,1056,256,1152,224C1248,192,1344,128,1392,96L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
          
          <h3 className="font-sans text-xl font-black tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-spin-slow" />
            {isLoggedIn ? "THÔNG TIN TÀI KHOẢN" : "ĐĂNG NHẬP CỔNG TRUY CẬP"}
          </h3>
          <p className="text-cyan-100 text-xs mt-1.5 font-medium">
            {isLoggedIn ? "Tài khoản của bạn đã được kết nối" : "Thiết lập danh tính chuẩn xác để gửi bình luận, đề xuất và tương tác an toàn"}
          </p>
        </div>

        {isLoggedIn ? (
          <div className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex gap-2 items-start animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-semibold leading-snug">{errorMsg}</p>
              </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 flex items-center justify-center text-4xl shadow-lg relative overflow-hidden bg-white dark:bg-slate-800">
                {selectedAvatar && selectedAvatar.startsWith('data:') ? (
                  <img src={selectedAvatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <span>{selectedAvatar}</span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-cyan-500/80 text-white text-[8px] py-0.5 text-center font-bold">
                  AVATAR
                </div>
              </div>
              <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{currentNickname}</h4>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Đang trực tuyến
              </span>
            </div>

            {isEditingProfile ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                    <span>Chọn Huy Hiệu Nhận Diện Mới</span>
                    <label className={`text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 flex items-center gap-1 transition-colors ${isProcessingImage ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      {isProcessingImage ? (
                        <>
                          <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Đang nén...</span>
                        </>
                      ) : (
                        <span>+ Tải ảnh lên</span>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isProcessingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsProcessingImage(true);
                            setErrorMsg(null);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                try {
                                  const canvas = document.createElement("canvas");
                                  const MAX_SIZE = 320;
                                  let width = img.width;
                                  let height = img.height;
                                  if (width > height) {
                                    if (width > MAX_SIZE) {
                                      height *= MAX_SIZE / width;
                                      width = MAX_SIZE;
                                    }
                                  } else {
                                    if (height > MAX_SIZE) {
                                      width *= MAX_SIZE / height;
                                      height = MAX_SIZE;
                                    }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext("2d");
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, width, height);
                                    setSelectedAvatar(canvas.toDataURL("image/webp", 0.88));
                                  }
                                  setIsProcessingImage(false);
                                } catch (err: any) {
                                  console.error("Canvas error:", err);
                                  setErrorMsg("Không thể xử lý hình ảnh này. Hãy thử ảnh khác!");
                                  setIsProcessingImage(false);
                                }
                              };
                              img.onerror = () => {
                                setErrorMsg("Lỗi đọc định dạng hình ảnh. Thử file khác nhé!");
                                setIsProcessingImage(false);
                              };
                              if (event.target?.result) {
                                img.src = event.target.result as string;
                              } else {
                                setIsProcessingImage(false);
                              }
                            };
                            reader.onerror = () => {
                              setErrorMsg("Không thể tải file ảnh.");
                              setIsProcessingImage(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {selectedAvatar && selectedAvatar.startsWith('data:') && (
                      <button
                        type="button"
                        className="p-1 text-base rounded-xl border border-cyan-500 bg-cyan-500/10 scale-105 shadow-md font-bold transition-all cursor-pointer flex items-center justify-center overflow-hidden"
                      >
                        <img src={selectedAvatar} className="w-8 h-8 rounded-full object-cover" alt="Custom avatar" />
                      </button>
                    )}
                    {avatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`p-2 text-base rounded-xl border text-center transition-all cursor-pointer ${
                          selectedAvatar === av
                            ? "border-cyan-500 bg-cyan-500/10 scale-105 shadow-md font-bold"
                            : "border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850"
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setSelectedAvatar(currentAvatar || "🌊");
                    }}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    onClick={handleUpdateAvatar}
                    disabled={loading || selectedAvatar === currentAvatar}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Lưu Thay Đổi
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-4 animate-in fade-in zoom-in-95 duration-300">
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold text-xs cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  Đổi Ảnh Đại Diện / Cập Nhật
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      if (onLogout) onLogout();
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng Xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="flex border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setActiveTab("secure"); setErrorMsg(null); }}
                className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex justify-center items-center gap-1.5 cursor-pointer ${
                  activeTab === "secure"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Tài Khoản Cao Cấp (Khóa PIN)
              </button>
              <button
                onClick={() => { setActiveTab("guest"); setErrorMsg(null); }}
                className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex justify-center items-center gap-1.5 cursor-pointer ${
                  activeTab === "guest"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
                Khách Vô Danh (Không PIN)
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex gap-2 items-start animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-snug">{errorMsg}</p>
                </div>
              )}

              {activeTab === "secure" ? (
                /* Secure registration and login flow */
                <form onSubmit={handleSecureAuth} className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 select-none">
                    <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Nhập biệt danh và mã PIN/mật khẩu bất kỳ. Nếu biệt danh này chưa ai sở hữu, hệ thống sẽ <strong className="text-cyan-600 dark:text-cyan-400">tự động kích hoạt đăng ký mới</strong> làm của riêng bạn! Nếu đã có chủ, bạn hãy điền đúng mã PIN để đăng nhập.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Biệt Danh Độc Quyền (Không dấu/có dấu)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={20}
                        required
                        placeholder="Ví dụ: LamAnh24, HoangAnhGl..."
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-xs dark:text-white"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Mã PIN / Mật Khẩu Khóa Identity
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        maxLength={16}
                        required
                        placeholder="Nhập PIN hoặc mật khẩu dễ nhớ..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-xs dark:text-white font-mono"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-450 hover:text-slate-650 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Chọn Huy Hiệu Nhận Diện</span>
                      <label className={`text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 flex items-center gap-1 transition-colors ${isProcessingImage ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                        {isProcessingImage ? (
                          <>
                            <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Đang nén...</span>
                          </>
                        ) : (
                          <span>+ Tải ảnh lên</span>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          disabled={isProcessingImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsProcessingImage(true);
                              setErrorMsg(null);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                  try {
                                    const canvas = document.createElement("canvas");
                                    const MAX_SIZE = 320;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > height) {
                                      if (width > MAX_SIZE) {
                                        height *= MAX_SIZE / width;
                                        width = MAX_SIZE;
                                      }
                                    } else {
                                      if (height > MAX_SIZE) {
                                        width *= MAX_SIZE / height;
                                        height = MAX_SIZE;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      setSelectedAvatar(canvas.toDataURL("image/webp", 0.88));
                                    }
                                    setIsProcessingImage(false);
                                  } catch (err: any) {
                                    console.error("Canvas error:", err);
                                    setErrorMsg("Không thể xử lý hình ảnh này. Hãy thử ảnh khác!");
                                    setIsProcessingImage(false);
                                  }
                                };
                                img.onerror = () => {
                                  setErrorMsg("Lỗi đọc định dạng hình ảnh. Thử file khác nhé!");
                                  setIsProcessingImage(false);
                                };
                                if (event.target?.result) {
                                  img.src = event.target.result as string;
                                } else {
                                  setIsProcessingImage(false);
                                }
                              };
                              reader.onerror = () => {
                                setErrorMsg("Không thể tải file ảnh.");
                                setIsProcessingImage(false);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {selectedAvatar && selectedAvatar.startsWith('data:') && (
                        <button
                          type="button"
                          className="p-1 text-base rounded-xl border border-cyan-500 bg-cyan-500/10 scale-105 shadow-md font-bold transition-all cursor-pointer flex items-center justify-center overflow-hidden"
                        >
                          <img src={selectedAvatar} className="w-8 h-8 rounded-full object-cover" alt="Custom avatar" />
                        </button>
                      )}
                      {avatars.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`p-2 text-base rounded-xl border text-center transition-all cursor-pointer ${
                            selectedAvatar === av
                              ? "border-cyan-500 bg-cyan-500/10 scale-105 shadow-md font-bold"
                              : "border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850"
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    Tiến Hành Đăng Nhập & Bảo Mật
                  </button>
                </form>
              ) : (
                /* Guest configuration entry */
                <form onSubmit={handleGuestLogin} className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 select-none">
                    <HelpCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Lựa chọn đăng nhập nhanh. Danh tính khách sẽ không có mật khẩu khóa danh tính, nên người khác hoàn toàn có thể sử dụng trùng tên biệt danh của bạn. Khuyên khích đăng ký để có trải nghiệm an toàn nhất!
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Biệt Danh Khách (Để trống hệ thống sẽ tự chọn)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="Bỏ trống hoặc gõ tên khách..."
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-xs dark:text-white"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition"
                    >
                      Sử Dụng Tên Trên
                    </button>
                    <button
                      type="button"
                      onClick={handleInstantGuest}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition shadow"
                    >
                      Vào Ngẫu Nhiên 🐚
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-start gap-2 text-[10px] text-slate-400 text-justify">
                <Shield className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                <span>
                  Cơ chế bảo mật local kết nối trực tiếp với Firestore của chúng tôi đảm bảo an toàn tuyệt đối, loại bỏ những phiền phức hoặc rủi ro rò rỉ dữ liệu của các nút MXH bên ngoài.
                </span>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/65 p-4 flex justify-between border-t border-slate-100 dark:border-slate-850">
          <span className="text-[10px] text-slate-400 font-medium self-center select-none">
            Phiên bản bảo mật: v1.20
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold transition cursor-pointer"
          >
            Ẩn danh vãng lai
          </button>
        </div>

        {/* Dynamic Success handshakes overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-50 animate-fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
            <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
              KẾT NỐI DANH TÍNH THÀNH CÔNG!
            </p>
            <p className="text-xs text-slate-400 font-serif">
              Đang đồng bộ quyền hạn với máy chủ cộng đồng...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
