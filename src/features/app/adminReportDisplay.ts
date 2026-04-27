import { Identity } from "spacetimedb";
import type {
  AccountProfile,
  CapsuleMessage,
  ReportTargetSnapshot,
  ReportTicket,
  SquarePost,
} from "../../module_bindings/types";

const STATUS_ZH: Record<string, string> = {
  open: "待審核",
  in_review: "審核中",
  resolved: "已結案",
  dismissed: "不予處理",
  rejected: "已駁回",
};

const TARGET_ZH: Record<string, string> = {
  capsule: "膠囊內容",
  square_post: "廣場貼文",
  chat_thread: "聊天串",
  chat_account: "用戶帳號",
};

const REASON_ZH: Record<string, string> = {
  abuse: "辱罵／騷擾",
  spam: "垃圾廣告／詐騙",
  inappropriate_content: "不當內容／色情",
  impersonation: "冒充他人",
  underage: "疑似未成年",
  hate_speech: "仇恨言論",
  other: "其他",
  report_violation: "違規（管理處置）",
};

export function reportStatusLabel(raw: string): string {
  const k = (raw ?? "").trim().toLowerCase();
  return (STATUS_ZH[k] ?? raw) || "未知狀態";
}

export function reportTargetTypeLabel(raw: string): string {
  const k = (raw ?? "").trim().toLowerCase();
  return (TARGET_ZH[k] ?? raw) || "未知類型";
}

export function reportReasonLabel(raw: string): string {
  const k = (raw ?? "").trim().toLowerCase();
  return REASON_ZH[k] ?? (raw ? `原因（${raw}）` : "未填原因");
}

/** 已結案、駁回、不予處理 — 不應再出現在「待處理」列表 */
export function isReportClosedStatus(raw: string): boolean {
  const k = (raw ?? "").trim().toLowerCase();
  return k === "resolved" || k === "dismissed" || k === "rejected";
}

/** 從舉報存證 JSON 補抓身份 hex（無檔案時當備援） */
/** 從舉報存證 JSON 取作者信箱（膠囊類目標在膠囊列被刪時仍可能顯示） */
export function snapshotAuthorEmail(
  targetType: string,
  snapshotJson: string | undefined,
): string {
  const tt = targetType.trim().toLowerCase();
  if (!snapshotJson?.trim()) return "";
  try {
    const o = JSON.parse(snapshotJson) as Record<string, unknown>;
    if (tt === "capsule" && typeof o.authorEmail === "string") {
      return o.authorEmail.trim();
    }
  } catch {
    return "";
  }
  return "";
}

export function snapshotIdentityHints(
  snapshot: ReportTargetSnapshot | null,
): { authorHex?: string; publisherHex?: string } {
  if (!snapshot?.snapshotJson?.trim()) return {};
  try {
    const o = JSON.parse(snapshot.snapshotJson) as Record<string, unknown>;
    const author =
      typeof o.authorIdentity === "string" ? o.authorIdentity : undefined;
    const publisher =
      typeof o.publisherIdentity === "string"
        ? o.publisherIdentity
        : typeof o.identity === "string"
          ? o.identity
          : undefined;
    return { authorHex: author, publisherHex: publisher };
  } catch {
    return {};
  }
}

export type PartyDisplay = {
  /** 主標題：暱稱優先，其次信箱 */
  primary: string;
  /** 副標：信箱或帳號 ID 或身份說明 */
  secondary: string;
  /** 帳號穩定 ID（有則顯示） */
  accountIdLine: string | null;
  /** 完整身份 hex（管理員對帳用；舉報單上可能為歷史鑰匙，見畫面說明） */
  identityHex: string;
  /** 供一鍵複製（可為空） */
  emailForCopy: string;
  accountIdForCopy: string;
};

/**
 * 顯示舉報當事一方：避免空白暱稱就顯示「未命名」；盡量顯示信箱、帳號 ID、身份 hex。
 */
export function formatReportParty(
  profile: AccountProfile | undefined,
  identityHex: string,
  options?: {
    emailFallback?: string;
    /** 舉報單寫入或膠囊／廣場快照，在無法以 identity 對到 profile 時補帳號 */
    accountIdFallback?: string;
    displayNameFallback?: string;
  },
): PartyDisplay {
  const hex = identityHex.trim();
  const email =
    profile?.email?.trim() ||
    options?.emailFallback?.trim() ||
    "";
  const name =
    (profile?.displayName?.trim() || options?.displayNameFallback?.trim() || "");
  const accountId =
    (profile?.accountId?.trim() ||
      options?.accountIdFallback?.trim() ||
      "");

  const primary =
    name ||
    email ||
    (accountId ? `帳號 ${accountId.slice(0, 12)}${accountId.length > 12 ? "…" : ""}` : "") ||
    (hex ? `用戶（${hex.slice(0, 10)}…）` : "未知用戶");

  const secondary = email
    ? name
      ? `登入信箱：${email}`
      : `登入信箱：${email}`
    : accountId
      ? `帳號 ID：${accountId}`
      : hex
        ? `身份識別（hex）：${hex}`
        : "—";

  const accountIdLine = accountId ? `帳號 ID：${accountId}` : null;

  return {
    primary,
    secondary,
    accountIdLine,
    identityHex: hex,
    emailForCopy: email,
    accountIdForCopy: accountId,
  };
}

/** 被舉報對象對應的 Identity hex，供查 profile／帳號審核。 */
export function resolveReportTargetIdentityHex(
  r: ReportTicket,
  capsuleMessageRows: readonly CapsuleMessage[],
  squarePostRows: readonly SquarePost[],
): string | null {
  const tt = r.targetType.trim().toLowerCase();
  const tid = r.targetId.trim();
  if (!tid) return null;
  if (tt === "chat_account") {
    try {
      return Identity.fromString(tid).toHexString();
    } catch {
      const h = tid.toLowerCase();
      return /^[0-9a-f]{64}$/i.test(h) ? h : null;
    }
  }
  if (tt === "capsule" || tt === "chat_thread") {
    const cap = capsuleMessageRows.find((c) => c.id === tid);
    if (cap) return cap.authorIdentity.toHexString();
    const post = squarePostRows.find((p) => p.sourceMessageId === tid);
    if (post) return post.publisherIdentity.toHexString();
    return null;
  }
  if (tt === "square_post") {
    const post = squarePostRows.find((p) => p.sourceMessageId === tid);
    if (post) return post.publisherIdentity.toHexString();
    return null;
  }
  return null;
}
