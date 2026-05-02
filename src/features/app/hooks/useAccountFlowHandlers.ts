import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "spacetimedb";

import { EMAIL_OTP_GATEWAY_URL, SPACETIME_TOKEN_KEY } from "../constants";
import { clearLocalSessionState } from "../sessionGuard";
import type { User as AppUser } from "../types";

const SPACETIME_KEYS_MAP = "STBD_MAILBOX_KEYS";
const AUTH_PENDING_RETRY = "STBD_AUTH_PENDING";

function getIdentityMap() {
  try {
    return JSON.parse(localStorage.getItem(SPACETIME_KEYS_MAP) || "{}");
  } catch {
    return {};
  }
}

function saveTokenForEmail(email: string, token: string) {
  const map = getIdentityMap();
  const em = email.toLowerCase().trim();
  map[em] = token;
  localStorage.setItem(SPACETIME_KEYS_MAP, JSON.stringify(map));
  localStorage.setItem("LAST_USED_EMAIL", em);
}

function getSavedTokenForEmail(email: string) {
  const map = getIdentityMap();
  return map[email.toLowerCase().trim()];
}

function normalizeBinaryGender(value: string | null | undefined): "male" | "female" {
  return value === "female" ? "female" : "male";
}

function minAllowedBirthDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
}

type UseAccountFlowHandlersParams = {
  email: string;
  password: string;
  confirmPassword: string;
  registerDisplayName: string;
  registerGender: string;
  setError: (v: string) => void;
  setLoading: (v: boolean) => void;
  setView: (v: "dashboard") => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  loginAccount: (args: { email: string; password: string }) => Promise<unknown>;
  registerAccount: (args: {
    email: string;
    password: string;
    displayName: string;
    gender: string;
    birthDate: undefined;
    profileNote: string;
  }) => Promise<unknown>;
  registerAccountWithEmailOtp: (args: {
    email: string;
    password: string;
    displayName: string;
    gender: string;
    birthDate: undefined;
    profileNote: string;
  }) => Promise<unknown>;
  requestEmailOtp: (args: { email: string; purpose: string; code: string }) => Promise<unknown>;
  verifyEmailOtp: (args: { email: string; purpose: string; code: string }) => Promise<unknown>;
  resetPasswordWithEmailOtp: (args: {
    email: string;
    newPassword: string;
  }) => Promise<unknown>;
  myProfile: any;
  user: AppUser | null;
  setBirthYear: (v: number) => void;
  setBirthMonth: (v: number) => void;
  setBirthDay: (v: number) => void;
  setAgeGateGender: (v: string) => void;
  setProfileForm: (v: { displayName: string; profileNote: string }) => void;
  setProfileError: (v: string) => void;
  setProfileActionMenuOpen: (v: boolean) => void;
  setPasswordError: (v: string) => void;
  setPasswordOld: (v: string) => void;
  setPasswordNew: (v: string) => void;
  setPasswordConfirm: (v: string) => void;
  setPasswordModalOpenWithStack: (v: boolean) => void;
  setProfileModalOpenWithStack: (v: boolean) => void;
  setIntroEditDraft: (v: string) => void;
  setIntroEditError: (v: string) => void;
  setIntroEditOpenWithStack: (v: boolean) => void;
  profileForm: { displayName: string; profileNote: string };
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  ageGateGender: string;
  updateAccountProfile: (args: {
    displayName: string;
    gender: string;
    birthDate: Timestamp;
    profileNote: string;
  }) => Promise<unknown>;
  setProfileSaving: (v: boolean) => void;
  introEditDraft: string;
  setIntroEditSaving: (v: boolean) => void;
  passwordOld: string;
  passwordNew: string;
  passwordConfirm: string;
  changePassword: (args: {
    oldPassword: string;
    newPassword: string;
  }) => Promise<unknown>;
  setPasswordSaving: (v: boolean) => void;
  needsAgeGate: boolean;
  setAgeGateError: (v: string) => void;
  calculatedAge: number;
  setAgeGateSaving: (v: boolean) => void;
  reportTargetType: "capsule" | "square_post" | "chat_thread" | "chat_account";
  setReportTargetType: (
    v: "capsule" | "square_post" | "chat_thread" | "chat_account",
  ) => void;
  reportTargetId: string;
  setReportTargetId: (v: string) => void;
  reportReasonCode: string;
  setReportReasonCode: (v: string) => void;
  reportDetail: string;
  setReportDetail: (v: string) => void;
  setReportError: (v: string) => void;
  setReportSaving: (v: boolean) => void;
  createReportTicket: (args: {
    targetType: "capsule" | "square_post" | "chat_thread" | "chat_account";
    targetId: string;
    reasonCode: string;
    detailText: string;
    evidenceJson: string;
  }) => Promise<unknown>;
  setReportModalOpenWithStack: (v: boolean) => void;
};

export function useAccountFlowHandlers(params: UseAccountFlowHandlersParams) {
  async function withAuthTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = window.setTimeout(() => {
        reject(new Error("登入/註冊逾時，請稍後再試"));
      }, ms);
      p.then((v) => {
        window.clearTimeout(id);
        resolve(v);
      }).catch((err) => {
        window.clearTimeout(id);
        reject(err);
      });
    });
  }

  async function callOtpGateway<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${EMAIL_OTP_GATEWAY_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      data?: T;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(json.message || json.details || "OTP 服務暫時不可用");
    }
    return (json.data ?? ({} as T)) as T;
  }

  const [registerOtpCode, setRegisterOtpCode] = useState("");
  /** 發送註冊驗證碼進行中 */
  const [registerOtpSendBusy, setRegisterOtpSendBusy] = useState(false);
  /** 驗證註冊驗證碼進行中 */
  const [registerOtpVerifyBusy, setRegisterOtpVerifyBusy] = useState(false);
  const registerOtpBusy =
    registerOtpSendBusy || registerOtpVerifyBusy;
  const [registerOtpMessage, setRegisterOtpMessage] = useState("");
  const [registerOtpVerifiedEmail, setRegisterOtpVerifiedEmail] = useState("");
  const [registerOtpVerifiedCode, setRegisterOtpVerifiedCode] = useState("");
  const [registerOtpCooldownUntilMs, setRegisterOtpCooldownUntilMs] = useState(0);
  const [registerOtpRejectedCode, setRegisterOtpRejectedCode] = useState("");
  const [forgotOtpCode, setForgotOtpCode] = useState("");
  /** 發送找回密碼驗證碼進行中 */
  const [forgotOtpSendBusy, setForgotOtpSendBusy] = useState(false);
  /** 驗證找回密碼驗證碼進行中 */
  const [forgotOtpVerifyBusy, setForgotOtpVerifyBusy] = useState(false);
  /** 重設密碼提交進行中 */
  const [forgotPwdResetBusy, setForgotPwdResetBusy] = useState(false);
  const forgotOtpBusy =
    forgotOtpSendBusy || forgotOtpVerifyBusy || forgotPwdResetBusy;
  const [forgotOtpMessage, setForgotOtpMessage] = useState("");
  const [forgotOtpVerifiedEmail, setForgotOtpVerifiedEmail] = useState("");
  const [forgotOtpVerifiedCode, setForgotOtpVerifiedCode] = useState("");
  const [forgotOtpCooldownUntilMs, setForgotOtpCooldownUntilMs] = useState(0);
  const [forgotOtpRejectedCode, setForgotOtpRejectedCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  const normalizedEmail = useMemo(
    () => params.email.trim().toLowerCase(),
    [params.email],
  );

  useEffect(() => {
    if (!normalizedEmail) {
      setRegisterOtpVerifiedEmail("");
      setRegisterOtpVerifiedCode("");
      setRegisterOtpCode("");
      setRegisterOtpMessage("");
      setRegisterOtpCooldownUntilMs(0);
      setRegisterOtpRejectedCode("");
      return;
    }
    if (registerOtpVerifiedEmail && registerOtpVerifiedEmail !== normalizedEmail) {
      setRegisterOtpVerifiedEmail("");
      setRegisterOtpVerifiedCode("");
      setRegisterOtpCode("");
      setRegisterOtpMessage("信箱已變更，請重新驗證");
      setRegisterOtpRejectedCode("");
    }
  }, [normalizedEmail, registerOtpVerifiedEmail]);

  useEffect(() => {
    const code = registerOtpCode.trim();
    if (!registerOtpVerifiedCode) return;
    if (code === registerOtpVerifiedCode) return;
    setRegisterOtpVerifiedEmail("");
    setRegisterOtpVerifiedCode("");
  }, [registerOtpCode, registerOtpVerifiedCode]);

  useEffect(() => {
    if (registerOtpCode.trim() !== registerOtpRejectedCode) return;
    if (registerOtpCode.trim().length !== 6) {
      setRegisterOtpRejectedCode("");
    }
  }, [registerOtpCode, registerOtpRejectedCode]);

  useEffect(() => {
    const pending = sessionStorage.getItem(AUTH_PENDING_RETRY);
    if (pending) {
      const {
        email: pEmail,
        password: pPassword,
        isLogin: pIsLogin,
      } = JSON.parse(pending);
      sessionStorage.removeItem(AUTH_PENDING_RETRY);
      params.setEmail(pEmail);
      params.setPassword(pPassword);
      setTimeout(() => {
        void handleAuth(pIsLogin, pEmail, pPassword);
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (!params.needsAgeGate || !params.myProfile) return;
    const bday = params.myProfile.birthDate
      ? params.myProfile.birthDate.toDate()
      : minAllowedBirthDate();
    params.setBirthYear(bday.getFullYear());
    params.setBirthMonth(bday.getMonth() + 1);
    params.setBirthDay(bday.getDate());
    params.setAgeGateGender(normalizeBinaryGender(params.myProfile.gender));
    params.setAgeGateError("");
  }, [params.needsAgeGate, params.myProfile?.birthDate, params.myProfile?.gender]);

  const handleAuth = async (
    isLogin: boolean,
    overrideEmail?: string,
    overridePassword?: string,
  ) => {
    const currentEmail = (overrideEmail || params.email).trim().toLowerCase();
    const currentPassword = overridePassword || params.password;
    if (!currentEmail || !currentPassword) {
      params.setError("請填寫帳號與密碼");
      return;
    }
    if (!isLogin && currentPassword !== params.confirmPassword && !overridePassword) {
      params.setError("兩次輸入的密碼不一致");
      return;
    }

    params.setLoading(true);
    params.setError("");
    try {
      const savedToken = getSavedTokenForEmail(currentEmail);
      const activeToken = localStorage.getItem(SPACETIME_TOKEN_KEY);
      if (savedToken && savedToken !== activeToken) {
        sessionStorage.setItem(
          AUTH_PENDING_RETRY,
          JSON.stringify({
            email: currentEmail,
            password: currentPassword,
            isLogin,
          }),
        );
        localStorage.setItem(SPACETIME_TOKEN_KEY, savedToken);
        window.location.reload();
        return;
      }

      if (isLogin) {
        await withAuthTimeout(
          params.loginAccount({ email: currentEmail, password: currentPassword }),
          20_000,
        );
      } else {
        // 註冊：先嘗試驗證 OTP（尚未自動驗證時立即觸發）
        if (registerOtpVerifiedEmail !== currentEmail) {
          if (registerOtpCode.trim().length !== 6) {
            params.setError("請輸入 6 位數驗證碼");
            return;
          }
          try {
            await verifyRegisterEmailOtp(registerOtpCode);
          } catch {
            return; // verifyRegisterEmailOtp 已設定錯誤訊息
          }
          // 驗證完後再次檢查
          if (registerOtpVerifiedEmail !== currentEmail) {
            params.setError("驗證碼驗證失敗，請重試");
            return;
          }
        }
        await withAuthTimeout(
          params.registerAccountWithEmailOtp({
            email: currentEmail,
            password: currentPassword,
            displayName: params.registerDisplayName.trim(),
            gender: normalizeBinaryGender(params.registerGender),
            birthDate: undefined,
            profileNote: "",
          }),
          20_000,
        );
        setRegisterOtpVerifiedEmail("");
        setRegisterOtpVerifiedCode("");
        setRegisterOtpCode("");
        setRegisterOtpMessage("");
        setRegisterOtpCooldownUntilMs(0);
      }

      const tokenAfterLogin = localStorage.getItem(SPACETIME_TOKEN_KEY);
      if (tokenAfterLogin) saveTokenForEmail(currentEmail, tokenAfterLogin);
      params.setView("dashboard");
    } catch (err: any) {
      const msg = err.message || String(err);
      if (
        msg.includes("CONFLICT_IDENTITY") ||
        msg.includes("已有帳號") ||
        msg.includes("已綁定")
      ) {
        sessionStorage.setItem(
          AUTH_PENDING_RETRY,
          JSON.stringify({
            email: currentEmail,
            password: currentPassword,
            isLogin,
          }),
        );
        localStorage.removeItem(SPACETIME_TOKEN_KEY);
        window.location.reload();
      } else {
        params.setError(msg || "操作失敗");
      }
    } finally {
      params.setLoading(false);
    }
  };

  const requestRegisterEmailOtp = async () => {
    const em = params.email.trim().toLowerCase();
    if (!em) {
      setRegisterOtpMessage("請先輸入信箱");
      return;
    }
    setRegisterOtpSendBusy(true);
    setRegisterOtpMessage("");
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await params.requestEmailOtp({ email: em, purpose: "register", code });
      await callOtpGateway("/otp/request", { email: em, purpose: "register", code });
      setRegisterOtpVerifiedEmail("");
      setRegisterOtpVerifiedCode("");
      setRegisterOtpCode("");
      setRegisterOtpCooldownUntilMs(Date.now() + 60_000);
      setRegisterOtpRejectedCode("");
      setRegisterOtpMessage("驗證碼已送出，請查收信箱");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegisterOtpMessage(msg || "發送驗證碼失敗");
    } finally {
      setRegisterOtpSendBusy(false);
    }
  };

  const requestForgotPasswordOtp = async () => {
    const em = params.email.trim().toLowerCase();
    if (!em) {
      setForgotOtpMessage("請先輸入信箱");
      return;
    }
    setForgotOtpSendBusy(true);
    setForgotOtpMessage("");
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await params.requestEmailOtp({ email: em, purpose: "reset_password", code });
      await callOtpGateway("/otp/request", { email: em, purpose: "reset_password", code });
      setForgotOtpVerifiedEmail("");
      setForgotOtpVerifiedCode("");
      setForgotOtpCode("");
      setForgotOtpCooldownUntilMs(Date.now() + 60_000);
      setForgotOtpRejectedCode("");
      setForgotOtpMessage("重設驗證碼已送出，請查收信箱");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setForgotOtpMessage(msg || "發送驗證碼失敗");
    } finally {
      setForgotOtpSendBusy(false);
    }
  };

  const verifyRegisterEmailOtp = async (overrideCode?: string) => {
    const em = params.email.trim().toLowerCase();
    const code = (overrideCode ?? registerOtpCode).trim();
    if (!em) {
      setRegisterOtpMessage("請先輸入信箱");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setRegisterOtpMessage("請輸入 6 位數驗證碼");
      return;
    }
    setRegisterOtpVerifyBusy(true);
    setRegisterOtpMessage("");
    try {
      await params.verifyEmailOtp({ email: em, purpose: "register", code });
      setRegisterOtpVerifiedEmail(em);
      setRegisterOtpVerifiedCode(code);
      setRegisterOtpRejectedCode("");
      setRegisterOtpMessage("信箱驗證成功");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegisterOtpRejectedCode(code);
      setRegisterOtpMessage(msg || "驗證失敗");
    } finally {
      setRegisterOtpVerifyBusy(false);
    }
  };

  const verifyForgotPasswordOtp = async (overrideCode?: string) => {
    const em = params.email.trim().toLowerCase();
    const code = (overrideCode ?? forgotOtpCode).trim();
    if (!em) {
      setForgotOtpMessage("請先輸入信箱");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setForgotOtpMessage("請輸入 6 位數驗證碼");
      return;
    }
    setForgotOtpVerifyBusy(true);
    setForgotOtpMessage("");
    try {
      await params.verifyEmailOtp({ email: em, purpose: "reset_password", code });
      setForgotOtpVerifiedEmail(em);
      setForgotOtpVerifiedCode(code);
      setForgotOtpRejectedCode("");
      setForgotOtpMessage("驗證成功，請設定新密碼");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setForgotOtpRejectedCode(code);
      setForgotOtpMessage(msg || "驗證失敗");
    } finally {
      setForgotOtpVerifyBusy(false);
    }
  };

  useEffect(() => {
    if (registerOtpVerifyBusy) return;
    const code = registerOtpCode.trim();
    if (
      registerOtpVerifiedEmail === normalizedEmail &&
      !!normalizedEmail &&
      registerOtpVerifiedCode === code
    ) {
      return;
    }
    if (code.length !== 6) return;
    if (code === registerOtpRejectedCode) return;
    const t = window.setTimeout(() => {
      void verifyRegisterEmailOtp(code);
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    registerOtpCode,
    registerOtpVerifyBusy,
    registerOtpRejectedCode,
    registerOtpVerifiedEmail,
    registerOtpVerifiedCode,
    normalizedEmail,
  ]);

  useEffect(() => {
    if (forgotOtpVerifyBusy || forgotPwdResetBusy) return;
    const code = forgotOtpCode.trim();
    if (
      forgotOtpVerifiedEmail === normalizedEmail &&
      !!normalizedEmail &&
      forgotOtpVerifiedCode === code
    ) {
      return;
    }
    if (code.length !== 6) return;
    if (code === forgotOtpRejectedCode) return;
    const t = window.setTimeout(() => {
      void verifyForgotPasswordOtp(code);
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    forgotOtpCode,
    forgotOtpVerifyBusy,
    forgotPwdResetBusy,
    forgotOtpRejectedCode,
    forgotOtpVerifiedEmail,
    forgotOtpVerifiedCode,
    normalizedEmail,
  ]);

  const submitForgotPasswordReset = async () => {
    const em = params.email.trim().toLowerCase();
    if (!em) {
      setForgotOtpMessage("請先輸入信箱");
      return;
    }
    if (!(forgotOtpVerifiedEmail === em && forgotOtpVerifiedCode === forgotOtpCode.trim())) {
      setForgotOtpMessage("請先完成驗證碼驗證");
      return;
    }
    const np = forgotNewPassword.trim();
    if (np.length < 6 || np.length > 128) {
      setForgotOtpMessage("新密碼長度需 6–128 字元");
      return;
    }
    if (np !== forgotConfirmPassword) {
      setForgotOtpMessage("兩次新密碼不一致");
      return;
    }
    setForgotPwdResetBusy(true);
    setForgotOtpMessage("");
    try {
      await params.resetPasswordWithEmailOtp({ email: em, newPassword: np });
      setForgotOtpMessage("重設成功，請使用新密碼登入");
      setForgotOtpCode("");
      setForgotOtpVerifiedCode("");
      setForgotOtpVerifiedEmail("");
      setForgotOtpRejectedCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setForgotOtpMessage(msg || "重設密碼失敗");
    } finally {
      setForgotPwdResetBusy(false);
    }
  };

  const openProfileModal = () => {
    if (!params.myProfile) return;
    const bday = params.myProfile.birthDate
      ? params.myProfile.birthDate.toDate()
      : minAllowedBirthDate();
    params.setBirthYear(bday.getFullYear());
    params.setBirthMonth(bday.getMonth() + 1);
    params.setBirthDay(bday.getDate());
    params.setAgeGateGender(normalizeBinaryGender(params.myProfile.gender));
    params.setProfileForm({
      displayName: params.myProfile.displayName,
      profileNote: params.myProfile.profileNote,
    });
    params.setProfileError("");
    params.setProfileModalOpenWithStack(true);
  };

  const openProfileActionMenu = () => params.setProfileActionMenuOpen(true);
  const openAccountProfile = () => {
    params.setProfileActionMenuOpen(false);
    openProfileModal();
  };
  const openPasswordModal = () => {
    params.setProfileActionMenuOpen(false);
    params.setPasswordError("");
    params.setPasswordOld("");
    params.setPasswordNew("");
    params.setPasswordConfirm("");
    params.setPasswordModalOpenWithStack(true);
  };
  const openIntroEditor = () => {
    if (!params.user) return;
    params.setIntroEditDraft(params.user.profileNote ?? "");
    params.setIntroEditError("");
    params.setIntroEditOpenWithStack(true);
  };

  const submitProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!params.profileForm.displayName.trim()) {
      params.setProfileError("請填寫暱稱");
      return;
    }
    const finalBirthDate = Timestamp.fromDate(
      new Date(params.birthYear, params.birthMonth - 1, params.birthDay),
    );
    params.setProfileSaving(true);
    params.setProfileError("");
    try {
      await params.updateAccountProfile({
        displayName: params.profileForm.displayName.trim(),
        gender: normalizeBinaryGender(params.ageGateGender),
        birthDate: finalBirthDate,
        profileNote: params.profileForm.profileNote.trim(),
      });
      params.setProfileModalOpenWithStack(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setProfileError(msg || "儲存失敗");
    } finally {
      params.setProfileSaving(false);
    }
  };

  const submitIntroEdit = async () => {
    if (!params.user) return;
    const note = params.introEditDraft.trim();
    if (note.length < 10 || note.length > 400) {
      params.setIntroEditError("自我介紹需 10–400 字");
      return;
    }
    params.setIntroEditSaving(true);
    params.setIntroEditError("");
    try {
      await params.updateAccountProfile({
        displayName: params.user.displayName,
        gender: normalizeBinaryGender(params.user.gender),
        birthDate: params.myProfile?.birthDate!,
        profileNote: note,
      });
      params.setIntroEditOpenWithStack(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setIntroEditError(msg || "更新自我介紹失敗");
    } finally {
      params.setIntroEditSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    const oldPassword = params.passwordOld;
    const newPassword = params.passwordNew;
    if (!oldPassword || !newPassword) {
      params.setPasswordError("請填寫舊密碼與新密碼");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      params.setPasswordError("新密碼長度需 6–128 字元");
      return;
    }
    if (newPassword !== params.passwordConfirm) {
      params.setPasswordError("兩次新密碼不一致");
      return;
    }
    params.setPasswordSaving(true);
    params.setPasswordError("");
    try {
      await params.changePassword({ oldPassword, newPassword });
      params.setPasswordModalOpenWithStack(false);
      params.setPasswordOld("");
      params.setPasswordNew("");
      params.setPasswordConfirm("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setPasswordError(msg || "修改秘密失敗");
    } finally {
      params.setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    clearLocalSessionState();
    window.location.href = window.location.origin;
  };

  const submitAgeGate = async () => {
    if (params.calculatedAge < 16 || params.calculatedAge > 126) {
      params.setAgeGateError("年龄需在 16–126 之间");
      return;
    }
    params.setAgeGateSaving(true);
    try {
      const utcDate = new Date(
        Date.UTC(params.birthYear, params.birthMonth - 1, params.birthDay),
      );
      await params.updateAccountProfile({
        displayName: params.myProfile?.displayName || "",
        gender: normalizeBinaryGender(params.ageGateGender),
        birthDate: Timestamp.fromDate(utcDate),
        profileNote: params.myProfile?.profileNote || "",
      });
    } catch (err: any) {
      params.setAgeGateError(err.message || "提交失败");
    } finally {
      params.setAgeGateSaving(false);
    }
  };

  const openReportModal = (
    targetType: "capsule" | "square_post" | "chat_thread" | "chat_account",
    targetId: string,
  ) => {
    if (!targetId.trim()) return;
    params.setReportTargetType(targetType);
    params.setReportTargetId(targetId.trim());
    params.setReportReasonCode("abuse");
    params.setReportDetail("");
    params.setReportError("");
    params.setReportModalOpenWithStack(true);
  };

  const submitReport = async () => {
    const detail = params.reportDetail.trim();
    if (detail.length < 10 || detail.length > 2000) {
      params.setReportError("舉報說明需 10–2000 字");
      return;
    }
    params.setReportSaving(true);
    params.setReportError("");
    try {
      await params.createReportTicket({
        targetType: params.reportTargetType,
        targetId: params.reportTargetId,
        reasonCode: params.reportReasonCode.trim(),
        detailText: detail,
        evidenceJson: "",
      });
      params.setReportModalOpenWithStack(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setReportError(msg || "送出舉報失敗");
    } finally {
      params.setReportSaving(false);
    }
  };

  return {
    handleAuth,
    registerOtpCode,
    setRegisterOtpCode,
    registerOtpSendBusy,
    registerOtpVerifyBusy,
    registerOtpBusy,
    registerOtpMessage,
    registerOtpCooldownUntilMs,
    registerOtpVerified: registerOtpVerifiedEmail === normalizedEmail && !!normalizedEmail,
    requestRegisterEmailOtp,
    verifyRegisterEmailOtp,
    forgotOtpCode,
    setForgotOtpCode,
    forgotOtpSendBusy,
    forgotOtpVerifyBusy,
    forgotPwdResetBusy,
    forgotOtpBusy,
    forgotOtpMessage,
    forgotOtpCooldownUntilMs,
    forgotOtpVerified:
      forgotOtpVerifiedEmail === normalizedEmail && !!normalizedEmail,
    forgotNewPassword,
    setForgotNewPassword,
    forgotConfirmPassword,
    setForgotConfirmPassword,
    requestForgotPasswordOtp,
    submitForgotPasswordReset,
    openProfileModal,
    openProfileActionMenu,
    openAccountProfile,
    openPasswordModal,
    openIntroEditor,
    submitProfile,
    submitIntroEdit,
    submitPasswordChange,
    handleLogout,
    submitAgeGate,
    openReportModal,
    submitReport,
  };
}
