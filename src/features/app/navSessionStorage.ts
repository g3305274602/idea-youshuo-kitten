import type { BackTab } from "./appUiStore";
import {
  LAST_MAILBOX_NAV_KEY,
  LEGACY_LAST_ACTIVE_TAB_KEY,
} from "./constants";
import type { AdminSection, AppTab } from "./types";

const APP_TABS = new Set<string>([
  "secret",
  "new",
  "direct",
  "mine",
  "inbox",
  "outbox",
  "favorites",
  "chat",
  "space",
  "admin",
  "admin_ops",
  "my_reports",
  "mine_square",
]);

const BACK_TAB_SET = new Set<string>([
  "secret",
  "new",
  "direct",
  "mine",
  "mine_square",
  "inbox",
  "outbox",
  "favorites",
  "chat",
  "space",
  "admin",
  "admin_ops",
  "my_reports",
]);

function isAppTab(s: unknown): s is AppTab {
  return typeof s === "string" && APP_TABS.has(s);
}

function asBackTab(s: unknown): BackTab {
  if (s === null || s === undefined) return null;
  if (typeof s === "string" && BACK_TAB_SET.has(s)) return s as BackTab;
  return null;
}

function asAdminSection(s: unknown): AdminSection {
  if (s === "main" || s === "review" || s === "reports") return s;
  return "main";
}

export type MailboxNavSnapshotV1 = {
  v: 1;
  tab: AppTab;
  spaceOwnerHex: string | null;
  spaceTargetInfo: {
    accountId: string;
    displayName: string;
    gender: string;
  } | null;
  spaceBackTab: BackTab;
  chatBackTab: BackTab;
  selectedChatThreadKey: string | null;
  selectedMessageId: string | null;
  squareSelectedPostId: string | null;
  favoriteSelectedId: string | null;
  selectedAdminReportId: string | null;
  adminSection: AdminSection;
};

function emptySnapshotForTab(tab: AppTab): MailboxNavSnapshotV1 {
  return {
    v: 1,
    tab,
    spaceOwnerHex: null,
    spaceTargetInfo: null,
    spaceBackTab: null,
    chatBackTab: null,
    selectedChatThreadKey: null,
    selectedMessageId: null,
    squareSelectedPostId: null,
    favoriteSelectedId: null,
    selectedAdminReportId: null,
    adminSection: "main",
  };
}

function parseSpaceTargetInfo(raw: unknown): MailboxNavSnapshotV1["spaceTargetInfo"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const accountId = o.accountId;
  const displayName = o.displayName;
  const gender = o.gender;
  if (
    typeof accountId === "string" &&
    typeof displayName === "string" &&
    typeof gender === "string"
  ) {
    return { accountId, displayName, gender };
  }
  return null;
}

function normalizeV1(o: Record<string, unknown>): MailboxNavSnapshotV1 | null {
  if (!isAppTab(o.tab)) return null;
  return {
    v: 1,
    tab: o.tab,
    spaceOwnerHex:
      o.spaceOwnerHex === null
        ? null
        : typeof o.spaceOwnerHex === "string"
          ? o.spaceOwnerHex
          : null,
    spaceTargetInfo: parseSpaceTargetInfo(o.spaceTargetInfo),
    spaceBackTab: asBackTab(o.spaceBackTab),
    chatBackTab: asBackTab(o.chatBackTab),
    selectedChatThreadKey:
      typeof o.selectedChatThreadKey === "string" || o.selectedChatThreadKey === null
        ? (o.selectedChatThreadKey as string | null)
        : null,
    selectedMessageId:
      typeof o.selectedMessageId === "string" || o.selectedMessageId === null
        ? (o.selectedMessageId as string | null)
        : null,
    squareSelectedPostId:
      typeof o.squareSelectedPostId === "string" || o.squareSelectedPostId === null
        ? (o.squareSelectedPostId as string | null)
        : null,
    favoriteSelectedId:
      typeof o.favoriteSelectedId === "string" || o.favoriteSelectedId === null
        ? (o.favoriteSelectedId as string | null)
        : null,
    selectedAdminReportId:
      typeof o.selectedAdminReportId === "string" || o.selectedAdminReportId === null
        ? (o.selectedAdminReportId as string | null)
        : null,
    adminSection: asAdminSection(o.adminSection),
  };
}

export function readMailboxNavSnapshot(): MailboxNavSnapshotV1 | null {
  try {
    const raw = sessionStorage.getItem(LAST_MAILBOX_NAV_KEY);
    if (raw) {
      const o = JSON.parse(raw) as unknown;
      if (o && typeof o === "object") {
        const row = o as Record<string, unknown>;
        if (row.v === 1) {
          const snap = normalizeV1(row);
          if (snap) return snap;
        }
      }
    }
    const legacy = sessionStorage.getItem(LEGACY_LAST_ACTIVE_TAB_KEY);
    if (legacy && isAppTab(legacy)) {
      return emptySnapshotForTab(legacy);
    }
  } catch {
    return null;
  }
  return null;
}

export function writeMailboxNavSnapshot(snapshot: MailboxNavSnapshotV1): void {
  try {
    sessionStorage.setItem(
      LAST_MAILBOX_NAV_KEY,
      JSON.stringify(snapshot, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
  } catch {
    // 配額等：略過
  }
}

export function clearMailboxNavSession(): void {
  sessionStorage.removeItem(LAST_MAILBOX_NAV_KEY);
  sessionStorage.removeItem(LEGACY_LAST_ACTIVE_TAB_KEY);
}
