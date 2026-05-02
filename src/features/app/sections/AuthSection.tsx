import type React from "react";
import { useEffect, useState } from "react";
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
  registerOtpCode: string;
  /** 發送信箱驗證碼進行中（顯示發碼按鈕轉圈／鎖定） */
  registerOtpSendBusy: boolean;
  registerOtpMessage: string;
  registerOtpCooldownUntilMs: number;
  registerOtpVerified: boolean;
  forgotOtpCode: string;
  /** 發送找回密碼驗證碼進行中（顯示發碼按鈕轉圈／鎖定） */
  forgotOtpSendBusy: boolean;
  forgotOtpMessage: string;
  forgotOtpCooldownUntilMs: number;
  forgotOtpVerified: boolean;
  forgotNewPassword: string;
  forgotConfirmPassword: string;
  /** 重設密碼送出進行中 */
  forgotPwdResetBusy: boolean;
  /** 驗證找回密碼驗證碼進行中 */
  forgotOtpVerifyBusy: boolean;
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
  onRegisterOtpCodeChange: (value: string) => void;
  onRequestRegisterOtp: () => void;
  onForgotOtpCodeChange: (value: string) => void;
  onForgotNewPasswordChange: (value: string) => void;
  onForgotConfirmPasswordChange: (value: string) => void;
  onRequestForgotOtp: () => void;
  onSubmitForgotPassword: () => void;
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
  registerOtpCode,
  registerOtpSendBusy,
  registerOtpMessage,
  registerOtpCooldownUntilMs,
  registerOtpVerified,
  forgotOtpCode,
  forgotOtpSendBusy,
  forgotOtpMessage,
  forgotOtpCooldownUntilMs,
  forgotOtpVerified,
  forgotNewPassword,
  forgotConfirmPassword,
  forgotPwdResetBusy,
  forgotOtpVerifyBusy,
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
  onRegisterOtpCodeChange,
  onRequestRegisterOtp,
  onForgotOtpCodeChange,
  onForgotNewPasswordChange,
  onForgotConfirmPasswordChange,
  onRequestForgotOtp,
  onSubmitForgotPassword,
  onClearTransientState,
}: AuthSectionProps) {
  // 密碼顯示狀態放在組件內部
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const otpCooldownSec = Math.max(
    0,
    Math.ceil((registerOtpCooldownUntilMs - nowMs) / 1000),
  );
  const otpCanRequest = otpCooldownSec <= 0 && !registerOtpSendBusy;
  const forgotOtpCooldownSec = Math.max(
    0,
    Math.ceil((forgotOtpCooldownUntilMs - nowMs) / 1000),
  );
  const forgotOtpCanRequest =
    forgotOtpCooldownSec <= 0 &&
    !forgotOtpSendBusy &&
    !forgotPwdResetBusy;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#121319] p-6 font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(240,98,146,0.12)_0,transparent_55%)]" />
      <div className="pointer-events-none absolute -left-[10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#FFD54F]/8 blur-[120px]" />
      <div className="pointer-events-none absolute -right-[10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-[#F06292]/8 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[380px] text-center relative z-10"
      >
        <div className="mb-10">
          <h1 className="text-[56px] font-semibold tracking-[-0.005em] leading-[1.07] mb-2">
            有說
          </h1>
          <p className="mb-4 text-[17px] font-medium tracking-tight text-[#FFD54F]">
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
                  autoComplete="nickname"
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
              autoComplete="username"
              className="w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20"
              placeholder="信箱"
            />
          </div>

          <AnimatePresence mode="wait">
            {view === "register" ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-3"
              >
                <p className="text-[12px] font-semibold text-white/75">信箱驗證</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={registerOtpCode}
                    onChange={(e) =>
                      onRegisterOtpCodeChange(e.target.value.replace(/\D+/g, "").slice(0, 6))
                    }
                    autoComplete="one-time-code"
                    className="min-w-0 flex-1 rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[15px] text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-white/40"
                    placeholder="輸入 6 位驗證碼"
                  />
                  <button
                    type="button"
                    disabled={!otpCanRequest}
                    onClick={onRequestRegisterOtp}
                    className="shrink-0 rounded-[12px] border border-white/20 bg-white/[0.08] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-45 inline-flex items-center gap-1.5"
                  >
                    {registerOtpSendBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        發送中…
                      </>
                    ) : otpCooldownSec > 0 ? (
                      `${otpCooldownSec}s`
                    ) : (
                      "發送驗證碼"
                    )}
                  </button>
                </div>
                {registerOtpMessage ? (
                  <p
                    className={cn(
                      "mt-2 text-[12px]",
                      registerOtpVerified ? "text-emerald-300" : "text-white/65",
                    )}
                  >
                    {registerOtpMessage}
                  </p>
                ) : null}
                {/* 如需額外文案：可在這裡用 registerOtpSendBusy / registerOtpVerified / registerOtpCode 做提示 */}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* 3. 密碼 (附帶眼睛) */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              required
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete={view === "login" ? "current-password" : "new-password"}
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
                    autoComplete="new-password"
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
            disabled={
              loading ||
              (view === "register" && registerOtpCode.trim().length !== 6) ||
              (view === "login" && forgotMode)
            }
            className="w-full py-[14px] mt-6 bg-white text-apple-black hover:bg-white/90 rounded-[980px] font-sans font-semibold text-[17px] tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? "連線中…"
              : view === "login"
                ? "拆開看看"
                : "我也來留一則"}
          </button>

          {view === "login" ? (
            <div className={cn("mt-3 rounded-[16px] border-white/[0.08] px-3", forgotMode ? "border bg-white/[0.03] p-3" : "")}>
              <button
                type="button"
                onClick={() => setForgotMode((v) => !v)}
                className="text-[12px] font-semibold text-[#FFD54F] block ml-auto"
              >
                {forgotMode ? "收起重設密碼" : "忘記密碼？"}
              </button>
              {forgotMode ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={forgotOtpCode}
                      onChange={(e) =>
                        onForgotOtpCodeChange(e.target.value.replace(/\D+/g, "").slice(0, 6))
                      }
                      autoComplete="one-time-code"
                      className="min-w-0 flex-1 rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[15px] text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-white/40"
                      placeholder="輸入 6 位驗證碼"
                    />
                    <button
                      type="button"
                      disabled={!forgotOtpCanRequest}
                      onClick={onRequestForgotOtp}
                      className="shrink-0 rounded-[12px] border border-white/20 bg-white/[0.08] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-45 inline-flex items-center gap-1.5"
                    >
                      {forgotOtpSendBusy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          發送中…
                        </>
                      ) : forgotOtpCooldownSec > 0 ? (
                        `${forgotOtpCooldownSec}s`
                      ) : (
                        "發送驗證碼"
                      )}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => onForgotNewPasswordChange(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[15px] text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-white/40"
                    placeholder="新密碼（6-128 字元）"
                  />
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => onForgotConfirmPasswordChange(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[15px] text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-white/40"
                    placeholder="確認新密碼"
                  />
                  <button
                    type="button"
                    onClick={onSubmitForgotPassword}
                    disabled={forgotPwdResetBusy || forgotOtpVerifyBusy}
                    className="w-full rounded-[12px] border border-[#FFD54F]/40 bg-[#FFD54F]/20 px-3 py-2 text-[12px] font-semibold text-[#FFD54F] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    {forgotPwdResetBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        處理中…
                      </>
                    ) : (
                      "確認重設密碼"
                    )}
                  </button>
                  {forgotOtpMessage ? (
                    <p className={cn("text-[12px]", forgotOtpVerified ? "text-emerald-300" : "text-white/65")}>
                      {forgotOtpMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return;
              onViewChange(view === "login" ? "register" : "login");
              onClearTransientState(); // 清除錯誤與暫存
              setShowPassword(false);
            }}
            className="w-full text-center text-[14px] font-medium text-white/60 mt-8 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {view === "login" ? "還沒帳號？來註冊一個" : "已有帳號？回去登入"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
