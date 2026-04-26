import { useEffect } from "react";
import { Timestamp } from "spacetimedb";

import { SPACETIME_TOKEN_KEY } from "../constants";
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
      : new Date(2000, 0, 1);
    params.setBirthYear(bday.getFullYear());
    params.setBirthMonth(bday.getMonth() + 1);
    params.setBirthDay(bday.getDate());
    params.setAgeGateGender(params.myProfile.gender || "unspecified");
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
        await params.loginAccount({ email: currentEmail, password: currentPassword });
      } else {
        await params.registerAccount({
          email: currentEmail,
          password: currentPassword,
          displayName: params.registerDisplayName.trim(),
          gender: params.registerGender,
          birthDate: undefined,
          profileNote: "",
        });
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

  const openProfileModal = () => {
    if (!params.myProfile) return;
    const bday = params.myProfile.birthDate
      ? params.myProfile.birthDate.toDate()
      : new Date(2000, 0, 1);
    params.setBirthYear(bday.getFullYear());
    params.setBirthMonth(bday.getMonth() + 1);
    params.setBirthDay(bday.getDate());
    params.setAgeGateGender(params.myProfile.gender || "unspecified");
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
        gender: params.ageGateGender,
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
        gender: params.user.gender || "unspecified",
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
    localStorage.removeItem(SPACETIME_TOKEN_KEY);
    localStorage.removeItem("LAST_USED_EMAIL");
    localStorage.removeItem(SPACETIME_KEYS_MAP);
    sessionStorage.removeItem(AUTH_PENDING_RETRY);
    sessionStorage.setItem("SKIP_BOOT_WAIT", "true");
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
        gender: params.ageGateGender,
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
