import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Eye, EyeOff } from "lucide-react"; // 記得補上 Eye 圖標
import { cn } from "../../../lib/utils";
import type { AppView } from "../types";

type AuthSectionProps = {
  view: Extract<AppView, "login" | "register">;
  email: string;
  password: string;
  confirmPassword: string;
  registerDisplayName: string;
  registerGender: string;
  registerProfileNote: string;
  loading: boolean;
  error: string;
  onSubmit: () => void; // 這對應原先的 handleAuth
  onViewChange: (view: Extract<AppView, "login" | "register">) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onRegisterDisplayNameChange: (value: string) => void;
  onRegisterGenderChange: (value: string) => void;
  onRegisterProfileNoteChange: (value: string) => void;
  onClearTransientState: () => void;
};

export function AuthSection({
  view,
  email,
  password,
  confirmPassword,
  registerDisplayName,
  registerGender,
  registerProfileNote,
  loading,
  error,
  onSubmit,
  onViewChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onRegisterDisplayNameChange,
  onRegisterGenderChange,
  onRegisterProfileNoteChange,
  onClearTransientState,
}: AuthSectionProps) {
  // 密碼顯示狀態放在組件內部
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="min-h-screen bg-apple-black flex flex-col items-center justify-center p-6 font-sans text-white relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_50%] from-apple-blue/10 via-transparent to-transparent opacity-50" />
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-apple-blue/5 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-apple-blue/5 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[380px] text-center relative z-10"
      >
        <div className="mb-10">
          <h1 className="text-[56px] font-semibold tracking-[-0.005em] leading-[1.07] mb-2">
            有說
          </h1>
          <p className="text-[17px] font-medium text-apple-blue tracking-tight mb-4">
            {view === "login" ? "拆開屬於你的小紙條" : "留一個名字，開始丟膠囊"}
          </p>
          <p className="text-[14px] font-normal leading-relaxed text-white/40 px-4">
            悄悄話、慢慢開；寫給未來的自己，或貼到牆上讓路過的人隨手翻翻。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* 1. 暱稱 (註冊模式置頂) */}
          <AnimatePresence mode="wait">
            {view === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  marginBottom: 16,
                  // 動畫結束後，將 overflow 設為 visible，這樣聚焦時的光暈才不會被切斷
                  transitionEnd: { overflow: "visible" },
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                  // 開始關閉動畫前，要把 overflow 設回 hidden 才能縮回去
                  overflow: "hidden",
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={registerDisplayName}
                  onChange={(e) => onRegisterDisplayNameChange(e.target.value)}
                  maxLength={32}
                  className="w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none font-sans text-[17px] text-white placeholder:text-white/20"
                  placeholder="暱稱"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. 信箱 */}
          <div className="relative">
            <input
              type="email"
              value={email}
              required
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20"
              placeholder="信箱"
            />
          </div>

          {/* 3. 密碼 (附帶眼睛) */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              required
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-4 py-[18px] pr-12 bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20"
              placeholder={view === "login" ? "密碼" : "設定密碼"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* 4. 註冊額外欄位 (確認密碼 & 性別) */}
          <AnimatePresence>
            {view === "register" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                    className={cn(
                      "w-full px-4 py-[18px] pr-12 bg-white/[0.04] backdrop-blur-md border rounded-[16px] focus:ring-1 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20",
                      confirmPassword && password !== confirmPassword
                        ? "border-red-500/50 focus:ring-red-500/50"
                        : "border-white/[0.08] focus:ring-white/40",
                    )}
                    placeholder="再輸入一次密碼"
                  />
                  {/* 補上這段眼睛按鈕 */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <p
              className={cn(
                "text-[13px] font-medium tracking-tight text-center mt-2",
                error.includes("成功") ? "text-emerald-400" : "text-red-400",
              )}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[14px] mt-6 bg-white text-apple-black hover:bg-white/90 rounded-[980px] font-sans font-semibold text-[17px] tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? "連線中…"
              : view === "login"
                ? "拆開看看"
                : "我也來留一則"}
          </button>

          <button
            type="button"
            onClick={() => {
              onViewChange(view === "login" ? "register" : "login");
              onClearTransientState(); // 清除錯誤與暫存
              setShowPassword(false);
            }}
            className="w-full text-center text-[14px] font-medium text-white/60 mt-8 hover:text-white transition-all"
          >
            {view === "login" ? "還沒帳號？來註冊一個" : "已有帳號？回去登入"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
