import type {
  CapsuleFavorite,
  CapsuleMessage,
  SquareFavorite,
  SquarePost,
} from "../../module_bindings/types";

export interface User {
  id: string;
  email: string;
  displayName: string;
  gender: string;
  ageYears: number;
  profileNote: string;
}

export interface Message {
  _id: string;
  senderEmail: string;
  recipientEmail?: string;
  content: string | null;
  scheduledAt: string;
  isDue: boolean;
  isWaitListVisible: boolean;
  createdAt: string;
}

export type AppView = "login" | "register" | "loading" | "dashboard";

export type AppTab =
  | "secret"
  | "new"
  | "direct"
  | "mine"
  | "inbox"
  | "outbox"
  | "favorites"
  | "chat"
  | "space"
  | "admin"
  | "admin_ops"
  | "my_reports"


export type AdminSection = "main" | "review" | "reports";

export type AdminReportFilter = "pending" | "resolved";

export type SquareReactionKind = "up" | "mid" | "down";

export type OpenedBroadcastItem = {
  id: string;
  scope: "inbox" | "outbox";
  title: string;
  subtitle: string;
};

export type CapsuleChatThreadSummary = {
  key: string;
  sourceMessageId: string;
  threadGuestHex: string;
  counterpartLabel: string;
  counterpartIdentityHex: string;
  counterpartGender: string;      // 新增的
  counterpartBirthDate?: any;     // 新增的
  sourcePreview: string;
  sourceCapsuleType: number;
  lastBody: string;
  lastAtMicros: bigint;
};
export type SpaceFeedItem =
  | {
      kind: "capsule";
      key: string;
      micros: bigint;
      capsule: CapsuleMessage;
    }
  | {
      kind: "square";
      key: string;
      micros: bigint;
      post: SquarePost;
    };

export type UnifiedFavoriteListItem =
  | {
      kind: "square";
      key: string;
      createdAtMicros: bigint;
      row: SquareFavorite;
    }
  | {
      kind: "capsule";
      key: string;
      createdAtMicros: bigint;
      row: CapsuleFavorite;
    };
