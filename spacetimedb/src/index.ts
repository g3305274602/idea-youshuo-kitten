import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { schema, t, table, SenderError, type Random } from "spacetimedb/server";
import { Identity, Timestamp } from "spacetimedb";
import { buildDemoSeedUsers, isDemoSeedMailbox } from "./demo_seed_users.ts";
import { secretCapsuleBodyForSlot } from "./demo_secret_capsule_posts.ts";

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** 模組沙箱常無 `crypto.getRandomValues`，勿用 `@noble/hashes` 的 `randomBytes`。 */
function bytesToHex(buf: Uint8Array): string {
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += buf[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const n = hex.length;
  if (n % 2 !== 0 || n === 0) return new Uint8Array(0);
  const out = new Uint8Array(n / 2);
  for (let i = 0; i < out.length; i++) {
    const h = hex.slice(i * 2, i * 2 + 2);
    const v = parseInt(h, 16);
    if (Number.isNaN(v)) return new Uint8Array(0);
    out[i] = v;
  }
  return out;
}

function hexEqConstTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

/** 舊版 v1：Base64（需環境有 atob）。 */
function fromB64(s: string): Uint8Array {
  if (typeof atob !== "function") return new Uint8Array(0);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * 新密碼：v6 = 單次 SHA-256（極輕量，避免雲端 reducer 逾時／實例 fatal）。
 * 仍相容驗證舊 v2（PBKDF2 hex）、v1（PBKDF2 Base64）。
 * Salt 必須用 `ctx.random`（見 SpacetimeDB `Random`），不可用 noble `randomBytes`。
 */
function hashPassword(password: string, rng: Random): string {
  const saltBuf = new Uint8Array(16);
  rng.fill(saltBuf);
  const salt = bytesToHex(saltBuf);
  const h = sha256(utf8(`v6\x1e${salt}\x1e${password}`));
  return `v6$${salt}$${bytesToHex(h)}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length < 3) return false;
  const tag = parts[0];

  if (tag === "v6" && parts.length === 3) {
    const salt = parts[1]!;
    const wantHex = parts[2]!;
    const h = sha256(utf8(`v6\x1e${salt}\x1e${password}`));
    return hexEqConstTime(bytesToHex(h), wantHex);
  }

  if ((tag === "v2" || tag === "v1") && parts.length === 4) {
    const iter = Number(parts[1]);
    if (!Number.isFinite(iter) || iter < 5000) return false;
    let salt: Uint8Array;
    let want: Uint8Array;
    if (tag === "v2") {
      salt = hexToBytes(parts[2]!);
      want = hexToBytes(parts[3]!);
    } else {
      salt = fromB64(parts[2]!);
      want = fromB64(parts[3]!);
    }
    if (salt.length < 8 || want.length < 8) return false;
    const dk = pbkdf2(sha256, utf8(password), salt, {
      c: iter,
      dkLen: want.length,
    });
    if (dk.length !== want.length) return false;
    let ok = 0;
    for (let i = 0; i < dk.length; i++) ok |= dk[i]! ^ want[i]!;
    return ok === 0;
  }

  return false;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function accountIdForEmail(rawEmail: string): string {
  const em = normalizeEmail(rawEmail);
  const h = sha256(utf8(`acct:v1:${em}`));
  return bytesToHex(h);
}

function newMessageId(rng: Random): string {
  const buf = new Uint8Array(16);
  rng.fill(buf);
  return bytesToHex(buf);
}

/** 種子膠囊每則排程信固定 id（可安全重跑同一 batch） */
function demoCapsuleScheduledMessageId(slot: number): string {
  const h = sha256(utf8(`stbd:capsule:v1:${slot}`));
  return bytesToHex(h);
}

const accountProfile = table(
  { name: "account_profile", public: true },
  {
    email: t.string().primaryKey(),
    accountId: t.string().unique(),
    ownerIdentity: t.identity().unique(),
    displayName: t.string().default(""),
    gender: t.string().default(""),
    birthDate: t.timestamp().optional(),
    profileNote: t.string().default(""),
  },
);

const accountSecret = table(
  { name: "account_secret", public: false },
  {
    email: t.string().primaryKey(),
    passwordHash: t.string(),
  },
);

const scheduledMessage = table(
  { name: "scheduled_message", public: true },
  {
    id: t.string().primaryKey(),
    senderIdentity: t.identity().index("btree"),
    senderEmail: t.string().index("btree"), // 加上索引
    recipientEmail: t.string().index("btree"), // 加上索引
    content: t.string(),
    scheduledAt: t.timestamp(),
    isWaitListVisible: t.bool(),
    exchangeLog: t.string().default(""),
    createdAt: t.timestamp(),
  },
);

// 秘密膠囊表：補齊作者的所有快照資訊
const capsuleMessage = table(
  { name: "capsule_message", public: true },
  {
    id: t.string().primaryKey(),
    authorIdentity: t.identity().index("btree"),
    authorEmail: t.string(),
    authorAccountId: t.string().default('').index('btree'), 
    authorDisplayName: t.string().default(""), // 新增：暱稱快照
    authorGender: t.string().default("unspecified"), // 新增：性別快照
    authorBirthDate: t.timestamp().optional(), // 新增：生日快照 (用來算年齡)
    content: t.string(),
    scheduledAt: t.timestamp(),
    isWaitListVisible: t.bool(),
    exchangeLog: t.string().default(""),
    createdAt: t.timestamp(),
    capsuleType: t.u8().default(4),
  },
);

// 廣場貼文表：補齊發布者的所有快照資訊
const squarePost = table(
  { name: "square_post", public: true },
  {
    sourceMessageId: t.string().primaryKey(),
    publisherIdentity: t.identity().index("btree"),
    publisherAccountId: t.string().default(""), // 新增
    snapshotPublisherName: t.string().default(""), // 已有的
    snapshotPublisherGender: t.string().default("unspecified"), // 新增
    snapshotPublisherBirthDate: t.timestamp().optional(), // 新增
    repliesPublic: t.bool(),
    includeThreadInSnapshot: t.bool().default(false),
    snapshotContent: t.string(),
    snapshotSenderEmail: t.string(),
    snapshotRecipientEmail: t.string(),
    snapshotScheduledAt: t.timestamp(),
    showSenderOnSquare: t.bool().default(true),
    showRecipientOnSquare: t.bool().default(true),
    createdAt: t.timestamp().index("btree"),
    includeCapsulePrivateInSnapshot: t.bool().default(false),
    sourceKind: t.string().default("direct"),
    sourceId: t.string().default("__legacy__"),
  },
);

/** 膠囊空間狀態（獨立新表：避免既有主表加欄位遷移衝突） */
const capsuleMessageSpaceState = table(
  { name: "capsule_message_space_state", public: true },
  {
    capsuleId: t.string().primaryKey(),
    authorIdentity: t.identity().index("btree"),
    isProfilePublic: t.bool().default(false),
    isDeleted: t.bool().default(false),
  },
);

/** 一次性模組遷移標記（不對外公開）。 */
const moduleMigrationDone = table(
  { name: "module_migration_done", public: false },
  {
    migrationId: t.string().primaryKey(),
    appliedAt: t.timestamp(),
  },
);

/** 廣場反應：每位使用者同一貼文至多一筆（讚／中立／踩） */
const squareReaction = table(
  { name: "square_reaction", public: true },
  {
    id: t.string().primaryKey(),
    postSourceMessageId: t.string().index("btree"),
    reactorIdentity: t.identity().index("btree"),
    /** 'up' | 'mid' | 'down' */
    kind: t.string(),
    createdAt: t.timestamp(),
  },
);

const squareComment = table(
  { name: "square_comment", public: true },
  {
    id: t.string().primaryKey(),
    postSourceMessageId: t.string().index("btree"),
    authorIdentity: t.identity().index("btree"),
    body: t.string(),
    /** 根留言為空字串 */
    parentCommentId: t.string(),
    createdAt: t.timestamp(),
  },
);

/**
 * 收藏快照（撤下廣場後仍保留）。
 * 設為 public 以便 TS codegen；請僅訂閱 `collectorIdentity = 當前連線`，勿訂閱全表。
 */
const squareFavorite = table(
  { name: "square_favorite", public: true },
  {
    id: t.string().primaryKey(),
    postSourceMessageId: t.string().index("btree"),
    collectorIdentity: t.identity().index("btree"),
    snapshotContent: t.string(),
    snapshotSenderEmail: t.string(),
    snapshotRecipientEmail: t.string(),
    snapshotScheduledAt: t.timestamp(),
    snapshotShowSender: t.bool().default(true),
    snapshotShowRecipient: t.bool().default(true),
    snapshotPublisherGender: t.string().default("unspecified"), // 補這行
    snapshotPublisherBirthDate: t.timestamp().optional(), // 補這行
    snapshotPublisherAccountId: t.string().default(""), // 補這行
    createdAt: t.timestamp(),
  },
);

/** 收藏膠囊本體（不依賴廣場貼文） */
const capsuleFavorite = table(
  {
    name: "capsule_favorite",
    public: true,
  },
  {
    id: t.string().primaryKey(),
    capsuleId: t.string().index("btree"),
    collectorIdentity: t.identity().index("btree"),
    snapshotContent: t.string(),
    snapshotAuthorEmail: t.string(),
    snapshotScheduledAt: t.timestamp(),
    snapshotCapsuleType: t.u8(),
    snapshotPublisherGender: t.string().default("unspecified"), // 補這行
    snapshotPublisherBirthDate: t.timestamp().optional(), // 補這行
    snapshotPublisherAccountId: t.string().default(""), // 補這行
    createdAt: t.timestamp(),
  },
);

/**
 * 秘密膠囊內私訊（與廣場 square_comment 分離）。
 * public: false；客戶端僅能透過 {@link capsule_private_for_me} view 讀取已授權列。
 */
// 🔑 找到 capsule_private_message 表，增加兩個 AccountId 欄位
const capsulePrivateMessage = table(
  { name: "capsule_private_message", public: false },
  {
    id: t.string().primaryKey(),
    sourceMessageId: t.string().index("btree"),
    threadGuestIdentity: t.identity().index("btree"),
    /** 🔑 新增：訪客的穩定帳號 ID */
    threadGuestAccountId: t.string().default("").index("btree"), 
    authorIdentity: t.identity(),
    /** 🔑 新增：發言人的穩定帳號 ID */
    authorAccountId: t.string().default("").index("btree"), 
    body: t.string(),
    createdAt: t.timestamp(),
  },
);

/** 管理員角色 */
const adminRole = table(
  { name: "admin_role", public: true },
  {
    adminIdentity: t.identity().primaryKey(),
    accountId: t.string().unique(),
    role: t.string(),
    isActive: t.bool().default(true),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

/** 管理後台審計紀錄（誰、何時、做了什麼） */
const adminAuditLog = table(
  { name: "admin_audit_log", public: true },
  {
    id: t.string().primaryKey(),
    adminIdentity: t.identity(),
    actionType: t.string(),
    targetType: t.string(),
    targetId: t.string(),
    detail: t.string().default(""),
    createdAt: t.timestamp(),
  },
);

/** 用戶舉報單 */
const reportTicket = table(
  { name: "report_ticket", public: true },
  {
    id: t.string().primaryKey(),
    reporterIdentity: t.identity().index("btree"),
    targetType: t.string(),
    targetId: t.string().index("btree"),
    reasonCode: t.string(),
    detailText: t.string(),
    evidenceJson: t.string().default(""),
    status: t.string().default("open"),
    priority: t.u8().default(1),
    assignedAdminIdentity: t.identity().optional(),
    resolutionNote: t.string().default(""),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    resolvedAt: t.timestamp().optional(),
  },
);

/** 舉報目標快照（避免內容後續被刪除而無法定位） */
const reportTargetSnapshot = table(
  { name: "report_target_snapshot", public: true },
  {
    id: t.string().primaryKey(),
    reportId: t.string().index("btree"),
    snapshotText: t.string().default(""),
    snapshotJson: t.string().default(""),
    createdAt: t.timestamp(),
  },
);

/** 管理操作紀錄（內容下架/恢復/指派等） */
const moderationActionLog = table(
  { name: "moderation_action_log", public: true },
  {
    id: t.string().primaryKey(),
    actionType: t.string(),
    targetType: t.string(),
    targetId: t.string(),
    operatorIdentity: t.identity(),
    note: t.string().default(""),
    createdAt: t.timestamp(),
  },
);

/** 待審工作池 */
const moderationQueue = table(
  { name: "moderation_queue", public: true },
  {
    reportId: t.string().primaryKey(),
    status: t.string().default("open"),
    priority: t.u8().default(1),
    assignedAdminIdentity: t.identity().optional(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

/** 對帳號的處分（禁言/封禁等） */
const userSanction = table(
  { name: "user_sanction", public: true },
  {
    id: t.string().primaryKey(),
    targetIdentity: t.identity().index("btree"),
    sanctionType: t.string(),
    reasonCode: t.string(),
    detailText: t.string().default(""),
    status: t.string().default("active"),
    startAt: t.timestamp(),
    endAt: t.timestamp().optional(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    operatorIdentity: t.identity(),
  },
);

/** 申訴單 */
const appealTicket = table(
  { name: "appeal_ticket", public: true },
  {
    id: t.string().primaryKey(),
    sanctionId: t.string().index("btree"),
    appellantIdentity: t.identity().index("btree"),
    detailText: t.string(),
    status: t.string().default("open"),
    adminNote: t.string().default(""),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    resolvedAt: t.timestamp().optional(),
  },
);

const spacetimedb = schema({
  accountProfile,
  accountSecret,
  scheduledMessage,
  capsuleMessage,
  capsuleMessageSpaceState,
  squarePost,
  squareReaction,
  squareComment,
  squareFavorite,
  capsuleFavorite,
  capsulePrivateMessage,
  adminRole,
  adminAuditLog,
  reportTicket,
  reportTargetSnapshot,
  moderationActionLog,
  moderationQueue,
  userSanction,
  appealTicket,
  moduleMigrationDone,
});

export default spacetimedb;

function deleteSquarePostCascade(ctx: { db: any }, sourceMessageId: string) {
  for (const row of [...ctx.db.squareReaction.iter()]) {
    if (row.postSourceMessageId === sourceMessageId)
      ctx.db.squareReaction.delete(row);
  }
  for (const row of [...ctx.db.squareComment.iter()]) {
    if (row.postSourceMessageId === sourceMessageId)
      ctx.db.squareComment.delete(row);
  }
  const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
  if (post) ctx.db.squarePost.delete(post);
}

function deleteCapsulePrivateForMessage(
  ctx: { db: any },
  sourceMessageId: string,
) {
  for (const row of [...ctx.db.capsulePrivateMessage.iter()]) {
    if (row.sourceMessageId === sourceMessageId)
      ctx.db.capsulePrivateMessage.delete(row);
  }
}

const MAX_MESSAGE_CONTENT_LEN = 300;
const CAPSULE_TYPE_MIN = 1;
const CAPSULE_TYPE_MAX = 10;
const MAX_EXCHANGE_APPEND = 300;
const MAX_EXCHANGE_LOG = 48000;

function isoFromMicros(micros: bigint): string {
  try {
    return new Date(Number(micros / 1000n)).toISOString();
  } catch {
    return "";
  }
}

function buildSquareSnapshotContent(
  main: string,
  includeThread: boolean,
  exchangeLog: string | undefined,
): string {
  const log = String(exchangeLog ?? "").trim();
  if (!includeThread) return main;
  const header = "\n\n────────\n雙方往來摘錄\n────────\n";
  if (!log) {
    return `${main}${header}（尚無往來紀錄；寄件與收件人可在信件內補寫，若廣場已併入往來，後續儲存會更新快照。）\n`;
  }
  return `${main}${header}${log}\n`;
}

function formatCapsulePrivateAppend(
  ctx: { db: any },
  sourceMessageId: string,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (const row of ctx.db.capsulePrivateMessage.iter()) {
    if (row.sourceMessageId === sourceMessageId) rows.push(row);
  }
  if (rows.length === 0) return "";
  rows.sort((a, b) =>
    Number(a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch),
  );
  let s = "\n\n────────\n膠囊私訊摘錄\n────────\n";
  for (const r of rows) {
    const gid = r.threadGuestIdentity.toHexString().slice(0, 10);
    const aid = r.authorIdentity.toHexString().slice(0, 10);
    s += `[訪客線 ${gid}…][說話者 ${aid}…]\n${String(r.body)}\n\n`;
  }
  return s;
}

function composeSquarePostSnapshot(
  ctx: { db: any },
  sourceMessageId: string,
  msg: { content: string; exchangeLog?: string },
  includeThreadInSnapshot: boolean,
  includeCapsulePrivateInSnapshot: boolean,
): string {
  let content = buildSquareSnapshotContent(
    msg.content,
    includeThreadInSnapshot,
    msg.exchangeLog ?? "",
  );
  if (includeCapsulePrivateInSnapshot) {
    content += formatCapsulePrivateAppend(ctx, sourceMessageId);
  }
  return content;
}

function refreshSquareSnapshotIfNeeded(
  ctx: { db: any; timestamp: { microsSinceUnixEpoch: bigint } },
  messageId: string,
) {
  const post = ctx.db.squarePost.sourceMessageId.find(messageId);
  if (!post) return;
  if (!post.includeThreadInSnapshot && !post.includeCapsulePrivateInSnapshot)
    return;
  const source = getSquareSourceRow(
    ctx,
    messageId,
    normalizeSourceKind(post.sourceKind),
  );
  if (!source) return;
  ctx.db.squarePost.sourceMessageId.update({
    ...post,
    snapshotContent: composeSquarePostSnapshot(
      ctx,
      messageId,
      source,
      post.includeThreadInSnapshot,
      post.includeCapsulePrivateInSnapshot,
    ),
    snapshotSenderEmail: source.senderEmail,
    snapshotRecipientEmail: source.recipientEmail,
    snapshotScheduledAt: source.scheduledAt,
  });
}

// 修正後：不論 Identity 怎麼變，只要 Email 對了就能回覆
function isMessageParticipant(
  pf: { email: string },
  msg: { senderEmail: string; recipientEmail: string },
  _sender: Identity, // 留著參數是為了不破壞其他地方的調用
): boolean {
  const myEmail = normalizeEmail(pf.email);
  const senderEmail = normalizeEmail(msg.senderEmail);
  const recipientEmail = normalizeEmail(msg.recipientEmail);

  return myEmail === senderEmail || myEmail === recipientEmail;
}

function recipientOwnerIdentity(
  ctx: { db: any },
  recipientEmail: string,
): Identity | null {
  const rec = ctx.db.accountProfile.email.find(normalizeEmail(recipientEmail));
  return rec ? rec.ownerIdentity : null;
}

/** 非寄件／收件之第三者（可作為膠囊私訊線之訪客） */
function isCapsuleThirdParty(
  ctx: { db: any },
  msg: {
    senderIdentity: { isEqual: (i: Identity) => boolean };
    recipientEmail: string;
  },
  guest: Identity,
): boolean {
  if (msg.senderIdentity.isEqual(guest)) return false;
  const rid = recipientOwnerIdentity(ctx, msg.recipientEmail);
  if (rid && rid.isEqual(guest)) return false;
  return true;
}

function capsuleThreadNonEmpty(
  ctx: { db: any },
  sourceMessageId: string,
  guestId: Identity,
): boolean {
  for (const row of ctx.db.capsulePrivateMessage.iter()) {
    if (
      row.sourceMessageId === sourceMessageId &&
      row.threadGuestIdentity.isEqual(guestId)
    ) {
      return true;
    }
  }
  return false;
}

// function canReadCapsulePrivateMessage(
//   ctx: { db: any },
//   pf: { email: string },
//   msg: { 
//     senderEmail: string;    // 🔑 修改這裡：將 senderIdentity 改為 senderEmail
//     recipientEmail: string; 
//   },
//   row: { threadGuestIdentity: { isEqual: (i: Identity) => boolean } },
//   viewer: Identity,
// ): boolean {
//   if (row.threadGuestIdentity.isEqual(viewer)) return true;
//   return isMessageParticipant(pf, msg, viewer);
// }

type SquareSourceKind = "direct" | "capsule";

type SquareSourceRow = {
  kind: SquareSourceKind;
  id: string;
  senderIdentity: Identity;
  senderEmail: string;
  recipientEmail: string;
  content: string;
  scheduledAt: Timestamp;
  exchangeLog: string;
  authorAccountId?: string;
};

function normalizeSourceKind(raw?: string | null): SquareSourceKind {
  return raw?.trim().toLowerCase() === "capsule" ? "capsule" : "direct";
}

function getSquareSourceRow(
  ctx: { db: any },
  sourceId: string,
  sourceKind: SquareSourceKind,
): SquareSourceRow | null {
  if (sourceKind === "capsule") {
    const row = ctx.db.capsuleMessage.id.find(sourceId);
    if (!row) return null;
    return {
      kind: "capsule",
      id: row.id,
      senderIdentity: row.authorIdentity,
      senderEmail: row.authorEmail,
      recipientEmail: "",
      content: row.content,
      scheduledAt: row.scheduledAt,
      exchangeLog: row.exchangeLog ?? "",
      authorAccountId: row.authorAccountId,
    };
  }
  const row = ctx.db.scheduledMessage.id.find(sourceId);
  if (!row) return null;
  return {
    kind: "direct",
    id: row.id,
    senderIdentity: row.senderIdentity,
    senderEmail: row.senderEmail,
    recipientEmail: row.recipientEmail,
    content: row.content,
    scheduledAt: row.scheduledAt,
    exchangeLog: row.exchangeLog ?? "",
  };
}

function isSquareSourceParticipant(
  pf: { email: string },
  source: SquareSourceRow,
  _sender: Identity, // 參數保留，但不用它做比對
): boolean {
  const myEmail = normalizeEmail(pf.email);
  const senderEmail = normalizeEmail(source.senderEmail);
  const recipientEmail = normalizeEmail(source.recipientEmail);

  if (source.kind === "capsule") {
    // 膠囊：只有發布者（作者）是參與者
    return myEmail === senderEmail;
  }
  // 定向信件：寄件人或收件人都是參與者
  return myEmail === senderEmail || myEmail === recipientEmail;
}

function insertSquarePostForMessage(
  ctx: {
    db: any;
    sender: Identity;
    timestamp: { microsSinceUnixEpoch: bigint };
  },
  sourceMessageId: string,
  sourceKind: SquareSourceKind,
  publisherIdentity: Identity,
  repliesPublic: boolean,
  includeThreadInSnapshot: boolean,
  includeCapsulePrivateInSnapshot: boolean,
  showSenderOnSquare: boolean,
  showRecipientOnSquare: boolean,
  msg: {
    content: string;
    senderEmail: string;
    recipientEmail: string;
    scheduledAt: Timestamp;
    exchangeLog: string;
  },
) {
  if (ctx.db.squarePost.sourceMessageId.find(sourceMessageId)) {
    throw new SenderError("此信已在廣場");
  }

  // 1. 抓出發布者的暱稱
  const pf = ctx.db.accountProfile.ownerIdentity.find(publisherIdentity);

  // 2. 插入資料（多存入一個 snapshotPublisherName）
  ctx.db.squarePost.insert({
    sourceMessageId,
    sourceKind,
    sourceId: sourceMessageId,
    publisherIdentity,
    repliesPublic,
    includeThreadInSnapshot,
    includeCapsulePrivateInSnapshot,
    snapshotContent: composeSquarePostSnapshot(
      ctx,
      sourceMessageId,
      msg,
      includeThreadInSnapshot,
      includeCapsulePrivateInSnapshot,
    ),
    snapshotSenderEmail: msg.senderEmail,
    snapshotRecipientEmail: msg.recipientEmail,
    snapshotScheduledAt: msg.scheduledAt,
    showSenderOnSquare,
    showRecipientOnSquare,
    createdAt: ctx.timestamp,
    publisherAccountId: pf?.accountId || "", // 存入
    snapshotPublisherName: pf?.displayName || "路人",
    snapshotPublisherGender: pf?.gender || "unspecified", // 存入
    snapshotPublisherBirthDate: pf?.birthDate, // 存入
  });
}
const MAX_DISPLAY_NAME_LEN = 32;
const MIN_PROFILE_NOTE_LEN = 10;
const MAX_PROFILE_NOTE_LEN = 400;
const ALLOWED_GENDER = new Set(["male", "female", "other", "unspecified"]);
const AGE_REQUIRED_MIN = 16;
const AGE_REQUIRED_MAX = 126;
const REPORT_DETAIL_MIN = 10;
const REPORT_DETAIL_MAX = 2000;
const REPORT_REASON_MAX = 64;
const REPORT_TARGET_TYPES = new Set([
  "capsule",
  "square_post",
  "chat_thread",
  "chat_account",
]);
const ADMIN_ROLES = new Set(["super_admin", "moderator", "reviewer"]);

function validateProfileFields(
  displayName: string,
  gender: string,
  birthDate: number,
  profileNote: string,
) {
  const dn = displayName.trim();
  if (!dn) throw new SenderError("請填寫暱稱");
  if (dn.length > MAX_DISPLAY_NAME_LEN) throw new SenderError("暱稱過長");
  const g = gender.trim().toLowerCase();
  if (!g || !ALLOWED_GENDER.has(g)) throw new SenderError("請選擇性別");
  if (
    !Number.isFinite(birthDate) ||
    birthDate < AGE_REQUIRED_MIN ||
    birthDate > AGE_REQUIRED_MAX
  ) {
    throw new SenderError(
      `請填寫有效年齡（${AGE_REQUIRED_MIN}–${AGE_REQUIRED_MAX}）`,
    );
  }
  const note = profileNote.trim();
  if (note.length > 0 && note.length < MIN_PROFILE_NOTE_LEN) {
    throw new SenderError(`自我介紹至少 ${MIN_PROFILE_NOTE_LEN} 字`);
  }
  if (note.length > MAX_PROFILE_NOTE_LEN) throw new SenderError("自我介紹過長");
  return { dn, g, note };
}

function validateProfileFieldsRegister(
  displayName: string,
  gender: string,
  birthDate: number | undefined,
  profileNote: string,
) {
  const dn = displayName.trim();
  if (!dn) throw new SenderError("請填寫暱稱");
  if (dn.length > MAX_DISPLAY_NAME_LEN) throw new SenderError("暱稱過長");
  const g = gender.trim().toLowerCase();
  if (!g || !ALLOWED_GENDER.has(g)) throw new SenderError("請選擇性別");
  const note = profileNote.trim();
  if (note.length > 0 && note.length < MIN_PROFILE_NOTE_LEN) {
    throw new SenderError(`自我介紹至少 ${MIN_PROFILE_NOTE_LEN} 字`);
  }
  if (note.length > MAX_PROFILE_NOTE_LEN) throw new SenderError("自我介紹過長");
  const age =
    birthDate == null || Number(birthDate) === 0
      ? 0
      : Number.isFinite(Number(birthDate)) &&
          Number(birthDate) >= AGE_REQUIRED_MIN &&
          Number(birthDate) <= AGE_REQUIRED_MAX
        ? Number(birthDate)
        : (() => {
            throw new SenderError(
              `年齡若填寫需在 ${AGE_REQUIRED_MIN}–${AGE_REQUIRED_MAX}`,
            );
          })();
  return { dn, g, note, age };
}

function isAdminIdentity(ctx: { db: any }, sender: Identity): boolean {
  // 1. 透過目前的 Identity 找到對應的帳號資料
  const pf = ctx.db.accountProfile.ownerIdentity.find(sender);
  if (!pf) return false;

  // 2. 用帳號的穩定 accountId 去查詢權限表
  const role = ctx.db.adminRole.accountId.find(pf.accountId);
  if (!role) return false;

  return (
    role.isActive &&
    ADMIN_ROLES.has(
      String(role.role ?? "")
        .trim()
        .toLowerCase(),
    )
  );
}

function hasAnyAdmin(ctx: { db: any }): boolean {
  for (const row of ctx.db.adminRole.iter()) {
    if (row.isActive) return true;
  }
  return false;
}

function requireAdmin(ctx: { db: any; sender: Identity }) {
  if (!isAdminIdentity(ctx, ctx.sender)) {
    throw new SenderError("僅管理員可操作");
  }
}

function requireSuperAdmin(ctx: { db: any; sender: Identity }) {
  const row = ctx.db.adminRole.adminIdentity.find(ctx.sender);
  if (!row || !row.isActive) throw new SenderError("僅超級管理員可操作");
  if (
    String(row.role ?? "")
      .trim()
      .toLowerCase() !== "super_admin"
  ) {
    throw new SenderError("僅超級管理員可操作");
  }
}

function findOrphanSuperAdmins(ctx: { db: any }): any[] {
  const rows: any[] = [];
  for (const row of ctx.db.adminRole.iter()) {
    if (!row.isActive) continue;
    if (
      String(row.role ?? "")
        .trim()
        .toLowerCase() !== "super_admin"
    )
      continue;
    const pf = ctx.db.accountProfile.ownerIdentity.find(row.adminIdentity);
    if (!pf) rows.push(row);
  }
  return rows;
}

function writeAdminAudit(
  ctx: { db: any; sender: Identity; timestamp: Timestamp; random: Random },
  actionType: string,
  targetType: string,
  targetId: string,
  detail: string,
) {
  ctx.db.adminAuditLog.insert({
    id: newMessageId(ctx.random),
    adminIdentity: ctx.sender,
    actionType,
    targetType,
    targetId,
    detail: detail.trim(),
    createdAt: ctx.timestamp,
  });
}

function writeModerationAction(
  ctx: { db: any; sender: Identity; timestamp: Timestamp; random: Random },
  actionType: string,
  targetType: string,
  targetId: string,
  note: string,
) {
  ctx.db.moderationActionLog.insert({
    id: newMessageId(ctx.random),
    actionType,
    targetType,
    targetId,
    operatorIdentity: ctx.sender,
    note: note.trim(),
    createdAt: ctx.timestamp,
  });
}

function resolveScheduledAtOrNow(
  scheduledAt: Timestamp | undefined,
  now: { microsSinceUnixEpoch: bigint },
): Timestamp {
  if (!scheduledAt) return new Timestamp(now.microsSinceUnixEpoch);
  return scheduledAt;
}

export const register_account = spacetimedb.reducer(
  {
    email: t.string(),
    password: t.string(),
    displayName: t.string(),
    gender: t.string(),
    birthDate: t.u32().optional(),
    profileNote: t.string(),
  },
  (ctx, { email, password, displayName, gender, birthDate, profileNote }) => {
    const em = normalizeEmail(email);
    if (!em || !password) throw new SenderError("請提供信箱與密碼");
    if (password.length < 6) throw new SenderError("密碼至少 6 字元");
    if (ctx.db.accountProfile.ownerIdentity.find(ctx.sender)) {
      throw new SenderError("此連線已有帳號，請先登出");
    }

    if (ctx.db.accountProfile.email.find(em)) {
      throw new SenderError("該信箱已被註冊");
    }
    if (ctx.db.accountSecret.email.find(em)) {
      throw new SenderError("該信箱已被註冊");
    }
    const { dn, g, note, age } = validateProfileFieldsRegister(
      displayName,
      gender,
      birthDate,
      profileNote,
    );
    const hash = hashPassword(password, ctx.random);
    const accountId = accountIdForEmail(em); // 產生穩定 ID
    ctx.db.accountSecret.insert({ email: em, passwordHash: hash });
    ctx.db.accountProfile.insert({
      email: em,
      accountId: accountId, // 存入 ID
      ownerIdentity: ctx.sender,
      displayName: dn,
      gender: g,
      birthDate: undefined,
      profileNote: note,
    });
  },
);

export const update_account_profile = spacetimedb.reducer(
  {
    displayName: t.string(),
    gender: t.string(),
    birthDate: t.timestamp(), // 接收時間戳
    profileNote: t.string(),
  },
  (ctx, { displayName, gender, birthDate, profileNote }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    ctx.db.accountProfile.email.update({
      ...pf,
      displayName,
      gender,
      birthDate, // 直接存入生日
      profileNote,
    });
  },
);

/** 登入後強制補齊生日（不可跳過） */
export const set_age_years = spacetimedb.reducer(
  { birthDate: t.timestamp() }, // 1. 這裡要改為 t.timestamp()
  (ctx, { birthDate }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    // 2. 直接更新資料，將傳入的 Timestamp 存入 birthDate 欄位
    ctx.db.accountProfile.email.update({
      ...pf,
      birthDate: birthDate,
    });
  },
);

/**
 * 本機／測試用：寫入或更新 100 筆 demo 帳號（信箱形如 `...@inbox.volta.test`，暱稱／性別／年齡／自我介紹一併寫入 `account_profile`）。
 * 僅執行一次（`module_migration_done` 標記 `dev_seed_demo_users_v4`）；首次執行會刪除舊版 `seed.user.*@demo.youshuo.local` 種子列再寫入新列。
 * 上線環境請勿保留或應改為僅管理員可呼叫。明文密碼見當日 `memory/` 清單或 `formatDemoSeedUsersMarkdown()`。
 */
const SEED_DEMO_USERS_MIGRATION = "dev_seed_demo_users_v4";

/** 舊版一眼假信箱（v3 執行時整批刪除對應 profile／secret） */
function cleanupLegacyDemoSeedAccounts(ctx: { db: any }) {
  const legacyRe = /^seed\.user\.\d{3}@demo\.youshuo\.local$/i;
  for (const row of [...ctx.db.accountProfile.iter()]) {
    const em = normalizeEmail(row.email);
    if (!legacyRe.test(em)) continue;
    const sec = ctx.db.accountSecret.email.find(em);
    if (sec) ctx.db.accountSecret.delete(sec);
    ctx.db.accountProfile.delete(row);
  }
}

export const dev_seed_demo_users = spacetimedb.reducer({}, (ctx) => {
  if (ctx.db.moduleMigrationDone.migrationId.find(SEED_DEMO_USERS_MIGRATION)) {
    return;
  }
  cleanupLegacyDemoSeedAccounts(ctx);
  const rows = buildDemoSeedUsers();
  for (const u of rows) {
    const em = normalizeEmail(u.email);
    const profile = ctx.db.accountProfile.email.find(em);
    const secret = ctx.db.accountSecret.email.find(em);
    const { dn, g, note } = validateProfileFields(
      u.displayName,
      u.gender,
      u.ageYears,
      u.profileNote,
    );
    const hash = hashPassword(u.plainPassword, ctx.random);

    // --- 關鍵修正：先計算 birthDate，才能給下面的 update 和 insert 使用 ---
    const birthMicros =
      ctx.timestamp.microsSinceUnixEpoch -
      BigInt(u.ageYears) * 31536000n * 1000000n;
    const birthDate = new Timestamp(birthMicros);

    if (profile && secret) {
      if (!isDemoSeedMailbox(em)) continue;
      ctx.db.accountSecret.email.update({ ...secret, passwordHash: hash });
      ctx.db.accountProfile.email.update({
        ...profile,
        displayName: dn,
        gender: g,
        birthDate: birthDate, // 修正這裡
        profileNote: note,
      });
      continue;
    }

    if (profile || secret) continue;

    // --- 修正這裡：將原本報錯的 ageYears 改為 birthDate ---
    ctx.db.accountSecret.insert({ email: em, passwordHash: hash });
    ctx.db.accountProfile.insert({
      email: em,
      accountId: accountIdForEmail(em),
      ownerIdentity: Identity.fromString(u.identityHex),
      displayName: dn,
      gender: g,
      birthDate: birthDate, // 修正這裡，不要用 ageYears
      profileNote: note,
    });
  }
  ctx.db.moduleMigrationDone.insert({
    migrationId: SEED_DEMO_USERS_MIGRATION,
    appliedAt: ctx.timestamp,
  });
});

/**
 * 本機／測試用：為種子帳（`@inbox.volta.test`）寫一則「已開啟」膠囊主文（**每次只處理一個 slot**）。
 * `slot` 為 0–299；發信者以 `slot % 100` 對應 `buildDemoSeedUsers()` 順序。`capsule_message.id` 固定（`demoCapsuleScheduledMessageId`），可重跑冪等。
 * 不自動貼廣場：此 reducer 只維護 `capsule_message`；若同 id 既有 `square_post`，會一併刪除以保持分流。
 */
export const dev_seed_secret_capsule_posts = spacetimedb.reducer(
  { slot: t.u32() },
  (ctx, { slot }) => {
    if (slot > 299) throw new SenderError("slot 僅支援 0–299");

    const users = buildDemoSeedUsers();
    const userIndex = slot % users.length;
    const u = users[userIndex]!;
    const em = normalizeEmail(u.email);
    if (!isDemoSeedMailbox(em)) return;

    // 1. 找到該種子用戶的 Profile
    const profile = ctx.db.accountProfile.email.find(em);
    if (!profile) return;

    const body = secretCapsuleBodyForSlot(slot).trim();
    if (!body) return;

    const id = demoCapsuleScheduledMessageId(slot);
    const existingMsg = ctx.db.capsuleMessage.id.find(id);
    const existingPost = ctx.db.squarePost.sourceMessageId.find(id);

    const openMicros =
      ctx.timestamp.microsSinceUnixEpoch -
      3_600_000_000n -
      BigInt(slot) * 60_000_000n;
    const scheduledAt = new Timestamp(openMicros);
    const senderIdentity = profile.ownerIdentity;

    if (!existingMsg) {
      // 2. 執行插入，補齊所有新快照欄位
      ctx.db.capsuleMessage.insert({
        id,
        authorIdentity: senderIdentity,
        authorEmail: em,
        // ▼ 補上這些新欄位，解決 TS 報錯 ▼
        authorAccountId: profile.accountId,
        authorDisplayName: profile.displayName,
        authorGender: profile.gender,
        authorBirthDate: profile.birthDate,
        // ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲
        content: body,
        scheduledAt,
        isWaitListVisible: false,
        exchangeLog: "",
        createdAt: ctx.timestamp,
        capsuleType: Number((slot % 10) + 1),
      });

      ctx.db.capsuleMessageSpaceState.insert({
        capsuleId: id,
        authorIdentity: senderIdentity,
        isProfilePublic: false,
        isDeleted: false,
      });
    }

    if (existingPost) {
      deleteSquarePostCascade(ctx, id);
    }
  },
);

/** 清理歷史遺留：舊版種子曾自動把膠囊貼到廣場，這裡一次刪除。 */
export const dev_cleanup_seed_capsule_square_posts = spacetimedb.reducer(
  {},
  (ctx) => {
    for (const post of [...ctx.db.squarePost.iter()]) {
      const kind = normalizeSourceKind(post.sourceKind);
      if (kind !== "capsule") continue;
      const senderEmail = normalizeEmail(post.snapshotSenderEmail ?? "");
      if (!isDemoSeedMailbox(senderEmail)) continue;
      deleteSquarePostCascade(ctx, post.sourceMessageId);
    }
  },
);

export const login_account = spacetimedb.reducer(
  { email: t.string(), password: t.string() },
  (ctx, { email, password }) => {
    const em = normalizeEmail(email);
    const profile = ctx.db.accountProfile.email.find(em);
    const secret = ctx.db.accountSecret.email.find(em);

    // 1. 基礎驗證
    if (!profile || !secret) throw new SenderError("信箱或密碼錯誤");
    if (!verifyPassword(password, secret.passwordHash))
      throw new SenderError("信箱或密碼錯誤");

    const currentStoredIdentity = profile.ownerIdentity; // 資料庫裡存的舊鑰匙
    const newIdentity = ctx.sender; // 目前瀏覽器手上拿的這把鑰匙

    // 2. 核心衝突檢查 (防止 Fatal Error)
    // 檢查「目前這把鑰匙」是不是正被「別人」占用
    const conflictProfile =
      ctx.db.accountProfile.ownerIdentity.find(newIdentity);
    if (conflictProfile && conflictProfile.email !== em) {
      // 發現目前連線已被帳號 B 占用，拋出標籤讓前端執行「強制更換鑰匙並重整」
      throw new SenderError(`CONFLICT_IDENTITY:${conflictProfile.email}`);
    }

    // 3. 安全檢查：封禁狀態 (保留這段，確保違規者進不來)
    for (const s of ctx.db.userSanction.targetIdentity.filter(
      currentStoredIdentity,
    )) {
      if (s.status !== "active" || s.sanctionType !== "ban") continue;
      if (
        s.endAt &&
        s.endAt.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch
      )
        continue;

      const endStr = s.endAt
        ? new Date(Number(s.endAt.microsSinceUnixEpoch / 1000n))
            .toISOString()
            .slice(0, 10)
        : "永久";
      throw new SenderError(
        `BAN:${endStr}:${s.detailText || s.reasonCode || "違反社群規範"}`,
      );
    }

    // 4. 身分遷移邏輯 (如果換了新鑰匙，且沒衝突，則更新管理權限)
     // --- 身分遷移邏輯：僅處理「主權類」數據 ---
    if (!currentStoredIdentity.isEqual(newIdentity)) {
      
      // 🔑 管理員權限必須遷移，因為 admin_role 的 Primary Key 是 Identity
      const roleRow = ctx.db.adminRole.accountId.find(profile.accountId);
      if (roleRow) {
        ctx.db.adminRole.adminIdentity.delete(currentStoredIdentity);
        ctx.db.adminRole.insert({
          adminIdentity: newIdentity,
          accountId: roleRow.accountId,
          role: roleRow.role,
          isActive: roleRow.isActive,
          createdAt: roleRow.createdAt,
          updatedAt: ctx.timestamp,
        });
      }

      // 因為 View 會自動透過 AccountId 幫我們找到舊訊息。
    }

    // 5. 最終綁定：將當前鑰匙與帳號關聯
    if (!currentStoredIdentity.isEqual(newIdentity)) {
      ctx.db.accountProfile.email.update({
        ...profile,
        ownerIdentity: newIdentity,
      });
    }
  },
);

export const change_password = spacetimedb.reducer(
  {
    oldPassword: t.string(),
    newPassword: t.string(),
  },
  (ctx, { oldPassword, newPassword }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const sec = ctx.db.accountSecret.email.find(pf.email);
    if (!sec) throw new SenderError("找不到帳號密鑰");
    if (!verifyPassword(oldPassword, sec.passwordHash)) {
      throw new SenderError("舊密碼錯誤");
    }
    const np = newPassword.trim();
    if (np.length < 6 || np.length > 128) {
      throw new SenderError("新密碼長度需 6–128 字元");
    }
    ctx.db.accountSecret.email.update({
      ...sec,
      passwordHash: hashPassword(np, ctx.random),
    });
  },
);

export const set_admin_role = spacetimedb.reducer(
  {
    adminIdentity: t.identity(),
    role: t.string(),
    isActive: t.bool(),
  },
  (ctx, { adminIdentity, role, isActive }) => {
    // 1. 先獲取「發起者」的 Profile，因為後續 insert 需要 accountId
    const senderPf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!senderPf) throw new SenderError("尚未登入，請先註冊並登入帳號");

    const nextRole = role.trim().toLowerCase();
    if (!ADMIN_ROLES.has(nextRole)) throw new SenderError("管理員角色錯誤");

    const noAdminYet = !hasAnyAdmin(ctx);
    if (noAdminYet) {
      // --- 這裡就是你報錯的地方 (Bootstrap 流程) ---
      if (!adminIdentity.isEqual(ctx.sender)) {
        throw new SenderError("系統初始狀態僅可將自己設為管理員");
      }

      // 修正：這裡的 insert 也要加上 accountId
      ctx.db.adminRole.insert({
        adminIdentity: ctx.sender,
        accountId: senderPf.accountId, // <--- 補上這一行
        role: nextRole,
        isActive: true,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });

      writeAdminAudit(
        ctx,
        "bootstrap_admin",
        "admin_role",
        ctx.sender.toHexString(),
        `${nextRole}:active:${senderPf.email}`,
      );
      return; // 結束執行
    }

    // --- 以下是你截圖中已經寫對的「一般授權」邏輯 ---
    requireSuperAdmin(ctx);

    const targetProfile =
      ctx.db.accountProfile.ownerIdentity.find(adminIdentity);
    if (!targetProfile) throw new SenderError("找不到該帳號，請確認對方已註冊");
    const aid = targetProfile.accountId;

    const existing = ctx.db.adminRole.accountId.find(aid);
    if (existing) {
      if (
        String(existing.role ?? "").toLowerCase() === "super_admin" &&
        !isActive
      ) {
        throw new SenderError("super_admin 不可直接移除管理權，請先降級");
      }
      ctx.db.adminRole.adminIdentity.delete(existing.adminIdentity);
      ctx.db.adminRole.insert({
        adminIdentity: adminIdentity,
        accountId: aid,
        role: nextRole,
        isActive,
        createdAt: existing.createdAt,
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.adminRole.insert({
        adminIdentity: adminIdentity,
        accountId: aid,
        role: nextRole,
        isActive,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }

    writeAdminAudit(
      ctx,
      "set_admin_role",
      "admin_role",
      adminIdentity.toHexString(),
      `${nextRole}:${isActive ? "active" : "inactive"}:${targetProfile.email}`,
    );
  },
);

/** 清空 `admin_role` 全部列（僅超級管理員）；清空後可由首位流程重新建立超管 */
export const admin_purge_all_roles = spacetimedb.reducer({}, (ctx) => {
  requireSuperAdmin(ctx);
  const rows = [...ctx.db.adminRole.iter()];
  let n = 0;
  for (const row of rows) {
    ctx.db.adminRole.adminIdentity.delete(row.adminIdentity);
    n += 1;
  }
  writeAdminAudit(
    ctx,
    "admin_purge_all_roles",
    "admin_role",
    ctx.sender.toHexString(),
    `purged:${n}`,
  );
});

/** 從 admin_role 刪除單筆記錄（僅超管；只允許刪除已停用的管理員記錄） */
export const admin_delete_role_record = spacetimedb.reducer(
  { adminIdentity: t.identity() },
  (ctx, { adminIdentity }) => {
    requireSuperAdmin(ctx);
    const row = ctx.db.adminRole.adminIdentity.find(adminIdentity);
    if (!row) throw new SenderError("找不到管理員記錄");
    if (row.isActive) throw new SenderError("請先移除管理權後再刪除記錄");
    ctx.db.adminRole.adminIdentity.delete(adminIdentity);
    writeAdminAudit(
      ctx,
      "delete_role_record",
      "admin_role",
      adminIdentity.toHexString(),
      "",
    );
  },
);

/**
 * 救援用：
 * - 當系統僅剩「失聯的 super_admin 記錄」時，允許目前登入帳號將其認領到自己的 Identity。
 * - 僅在「恰好一筆 orphan super_admin」且「目前 sender 尚未有管理權」時允許。
 */
export const claim_orphan_super_admin = spacetimedb.reducer((ctx) => {
  // 1. 獲取目前發起者的個人資料
  const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
  if (!pf) throw new SenderError("尚未登入，無法執行認領");

  // 2. 檢查是否已經具備管理員權限
  if (isAdminIdentity(ctx, ctx.sender)) {
    throw new SenderError("你已經具備管理員身份");
  }

  // 3. 尋找系統中的孤兒超管（Identity 已失效但權限仍在的紀錄）
  const orphanSupers = findOrphanSuperAdmins(ctx);
  if (orphanSupers.length === 0) {
    throw new SenderError("目前系統中沒有可認領的孤兒超級管理員");
  }

  const orphan = orphanSupers[0]!;

  // 4. 執行轉移：刪除舊的 Identity 紀錄
  ctx.db.adminRole.adminIdentity.delete(orphan.adminIdentity);

  // 5. 執行插入：使用目前的 Identity 並補上必填的 accountId
  ctx.db.adminRole.insert({
    adminIdentity: ctx.sender,
    accountId: pf.accountId, // <--- 修正：補上 accountId 解決 TS2345 錯誤
    role: orphan.role,
    isActive: true,
    createdAt: orphan.createdAt,
    updatedAt: ctx.timestamp,
  });

  // 6. 寫入審計日誌
  writeAdminAudit(
    ctx,
    "claim_orphan_super_admin",
    "admin_role",
    ctx.sender.toHexString(),
    `migrated_orphan:${orphan.adminIdentity.toHexString()}_to_account:${pf.email}`,
  );
});

/**
 * 管理端密碼重設（不經前端）：
 * - 若系統已有管理員：僅 super_admin 可操作
 * - 若系統無管理員：允許做救援重設
 */
export const admin_reset_password_by_email = spacetimedb.reducer(
  {
    email: t.string(),
    newPassword: t.string(),
  },
  (ctx, { email, newPassword }) => {
    if (hasAnyAdmin(ctx)) {
      requireSuperAdmin(ctx);
    }
    const em = normalizeEmail(email);
    if (!em) throw new SenderError("請提供有效信箱");
    const np = String(newPassword ?? "").trim();
    if (np.length < 6 || np.length > 128) {
      throw new SenderError("新密碼長度需 6–128 字元");
    }
    const sec = ctx.db.accountSecret.email.find(em);
    if (!sec) throw new SenderError("帳號不存在");
    ctx.db.accountSecret.email.update({
      ...sec,
      passwordHash: hashPassword(np, ctx.random),
    });
    if (hasAnyAdmin(ctx)) {
      writeAdminAudit(
        ctx,
        "admin_reset_password_by_email",
        "account_secret",
        em,
        "",
      );
    }
  },
);

export const create_report_ticket = spacetimedb.reducer(
  {
    targetType: t.string(),
    targetId: t.string(),
    reasonCode: t.string(),
    detailText: t.string(),
    evidenceJson: t.string().optional(),
  },
  (ctx, { targetType, targetId, reasonCode, detailText, evidenceJson }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    const tt = targetType.trim().toLowerCase();
    if (!REPORT_TARGET_TYPES.has(tt)) throw new SenderError("舉報目標類型錯誤");
    const tid = targetId.trim();
    if (!tid) throw new SenderError("缺少舉報目標");
    const rc = reasonCode.trim();
    if (!rc || rc.length > REPORT_REASON_MAX)
      throw new SenderError("舉報原因代碼錯誤");
    const dt = detailText.trim();
    if (dt.length < REPORT_DETAIL_MIN || dt.length > REPORT_DETAIL_MAX) {
      throw new SenderError(
        `舉報說明需 ${REPORT_DETAIL_MIN}-${REPORT_DETAIL_MAX} 字`,
      );
    }
    const ev = (evidenceJson ?? "").trim();

    let snapshotText = "";
    let snapshotJson = "";
    if (tt === "capsule") {
      const row = ctx.db.capsuleMessage.id.find(tid);
      if (!row) throw new SenderError("找不到膠囊");
      const st = ctx.db.capsuleMessageSpaceState.capsuleId.find(tid);
      snapshotText = row.content;
      snapshotJson = JSON.stringify({
        authorIdentity: row.authorIdentity.toHexString(),
        authorEmail: row.authorEmail,
        capsuleType: row.capsuleType,
        isDeleted: st?.isDeleted ?? false,
        isProfilePublic: st?.isProfilePublic ?? false,
      });
    } else if (tt === "square_post") {
      const post = ctx.db.squarePost.sourceMessageId.find(tid);
      if (!post) throw new SenderError("找不到廣場貼文");
      snapshotText = post.snapshotContent;
      snapshotJson = JSON.stringify({
        sourceKind: post.sourceKind,
        publisherIdentity: post.publisherIdentity.toHexString(),
        repliesPublic: post.repliesPublic,
      });
    } else if (tt === "chat_thread") {
      // tid 以 sourceMessageId 對應對話主串
      let count = 0;
      const samples: string[] = [];
      for (const row of ctx.db.capsulePrivateMessage.iter()) {
        if (row.sourceMessageId !== tid) continue;
        count += 1;
        if (samples.length < 5) {
          samples.push(
            `${row.authorIdentity.toHexString().slice(0, 10)}…:${row.body.slice(0, 80)}`,
          );
        }
      }
      if (count === 0) throw new SenderError("找不到聊天串");
      snapshotText = samples.join("\n");
      snapshotJson = JSON.stringify({
        messageCount: count,
        sourceMessageId: tid,
      });
    } else if (tt === "chat_account") {
      let targetIdentity: Identity;
      try {
        targetIdentity = Identity.fromString(tid);
      } catch {
        throw new SenderError("帳號識別格式錯誤");
      }
      const profile = ctx.db.accountProfile.ownerIdentity.find(targetIdentity);
      if (!profile) throw new SenderError("找不到被舉報帳號");
      snapshotText = `${profile.displayName} (${profile.email})`;
      snapshotJson = JSON.stringify({
        identity: profile.ownerIdentity.toHexString(),
        birthDate: profile.birthDate,
      });
    }

    const id = newMessageId(ctx.random);
    ctx.db.reportTicket.insert({
      id,
      reporterIdentity: ctx.sender,
      targetType: tt,
      targetId: tid,
      reasonCode: rc,
      detailText: dt,
      evidenceJson: ev,
      status: "open",
      priority: 1,
      assignedAdminIdentity: undefined,
      resolutionNote: "",
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      resolvedAt: undefined,
    });
    ctx.db.reportTargetSnapshot.insert({
      id: newMessageId(ctx.random),
      reportId: id,
      snapshotText,
      snapshotJson,
      createdAt: ctx.timestamp,
    });
    ctx.db.moderationQueue.insert({
      reportId: id,
      status: "open",
      priority: 1,
      assignedAdminIdentity: undefined,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const admin_update_report_ticket = spacetimedb.reducer(
  {
    reportId: t.string(),
    status: t.string(),
    priority: t.u8(),
    resolutionNote: t.string(),
    assignedAdminIdentity: t.identity().optional(),
  },
  (
    ctx,
    { reportId, status, priority, resolutionNote, assignedAdminIdentity },
  ) => {
    requireAdmin(ctx);
    const row = ctx.db.reportTicket.id.find(reportId);
    if (!row) throw new SenderError("找不到舉報單");
    const st = status.trim().toLowerCase();
    if (
      !["open", "in_review", "resolved", "rejected", "dismissed"].includes(st)
    ) {
      throw new SenderError("舉報狀態錯誤");
    }
    const done = st === "resolved" || st === "rejected" || st === "dismissed";
    ctx.db.reportTicket.id.update({
      ...row,
      status: st,
      priority,
      assignedAdminIdentity,
      resolutionNote: resolutionNote.trim(),
      updatedAt: ctx.timestamp,
      resolvedAt: done ? ctx.timestamp : undefined,
    });
    const mq = ctx.db.moderationQueue.reportId.find(reportId);
    if (mq) {
      ctx.db.moderationQueue.reportId.update({
        ...mq,
        status: st,
        priority,
        assignedAdminIdentity,
        updatedAt: ctx.timestamp,
      });
    }
    writeModerationAction(
      ctx,
      "update_report",
      "report_ticket",
      reportId,
      `${st}:${resolutionNote.trim()}`,
    );
    writeAdminAudit(
      ctx,
      "update_report",
      "report_ticket",
      reportId,
      `${st}:${resolutionNote.trim()}`,
    );
  },
);

/** 管理員強制刪除膠囊（不限作者） */
export const admin_delete_capsule = spacetimedb.reducer(
  { capsuleId: t.string() },
  (ctx, { capsuleId }) => {
    requireAdmin(ctx);
    const row = ctx.db.capsuleMessage.id.find(capsuleId);
    if (!row) throw new SenderError("找不到膠囊");
    const state = ctx.db.capsuleMessageSpaceState.capsuleId.find(capsuleId);
    if (state?.isDeleted) return;
    const post = ctx.db.squarePost.sourceMessageId.find(capsuleId);
    if (post) deleteSquarePostCascade(ctx, capsuleId);
    if (state) {
      ctx.db.capsuleMessageSpaceState.capsuleId.update({
        ...state,
        isProfilePublic: false,
        isDeleted: true,
      });
    } else {
      ctx.db.capsuleMessageSpaceState.insert({
        capsuleId,
        authorIdentity: row.authorIdentity,
        isProfilePublic: false,
        isDeleted: true,
      });
    }
    writeAdminAudit(ctx, "admin_delete_capsule", "capsule", capsuleId, "");
  },
);

/** 管理員強制刪除廣場貼文（不限發布者） */
export const admin_delete_square_post = spacetimedb.reducer(
  { sourceMessageId: t.string() },
  (ctx, { sourceMessageId }) => {
    requireAdmin(ctx);
    const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
    if (!post) throw new SenderError("找不到廣場貼文");
    deleteSquarePostCascade(ctx, sourceMessageId);
    writeAdminAudit(
      ctx,
      "admin_delete_square_post",
      "square_post",
      sourceMessageId,
      "",
    );
  },
);

export const admin_apply_user_sanction = spacetimedb.reducer(
  {
    targetIdentity: t.identity(),
    sanctionType: t.string(),
    reasonCode: t.string(),
    detailText: t.string(),
    endAt: t.timestamp().optional(),
  },
  (ctx, { targetIdentity, sanctionType, reasonCode, detailText, endAt }) => {
    requireAdmin(ctx);
    const st = sanctionType.trim().toLowerCase();
    if (!["mute", "ban", "warn", "limit"].includes(st)) {
      throw new SenderError("處分類型錯誤");
    }
    if (st === "ban") {
      const targetAdmin = ctx.db.adminRole.adminIdentity.find(targetIdentity);
      if (
        targetAdmin &&
        targetAdmin.isActive &&
        ADMIN_ROLES.has(
          String(targetAdmin.role ?? "")
            .trim()
            .toLowerCase(),
        )
      ) {
        throw new SenderError("管理員不可直接停權，請先降級為一般用戶");
      }
    }
    const id = newMessageId(ctx.random);
    ctx.db.userSanction.insert({
      id,
      targetIdentity,
      sanctionType: st,
      reasonCode: reasonCode.trim(),
      detailText: detailText.trim(),
      status: "active",
      startAt: ctx.timestamp,
      endAt,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      operatorIdentity: ctx.sender,
    });
    writeModerationAction(
      ctx,
      "apply_sanction",
      "chat_account",
      targetIdentity.toHexString(),
      `${st}:${reasonCode}`,
    );
    writeAdminAudit(
      ctx,
      "apply_sanction",
      "chat_account",
      targetIdentity.toHexString(),
      `${st}:${reasonCode}`,
    );
  },
);

export const admin_set_user_sanction_status = spacetimedb.reducer(
  {
    sanctionId: t.string(),
    status: t.string(),
    adminNote: t.string(),
  },
  (ctx, { sanctionId, status, adminNote }) => {
    requireAdmin(ctx);
    const row = ctx.db.userSanction.id.find(sanctionId);
    if (!row) throw new SenderError("找不到處分單");
    const st = status.trim().toLowerCase();
    if (!["active", "revoked"].includes(st)) {
      throw new SenderError("處分狀態錯誤");
    }
    if (row.status === st) return;
    ctx.db.userSanction.id.update({
      ...row,
      status: st,
      updatedAt: ctx.timestamp,
    });
    const detail = `${row.sanctionType}:${st}:${adminNote.trim()}`;
    writeModerationAction(
      ctx,
      "set_sanction_status",
      "user_sanction",
      sanctionId,
      detail,
    );
    writeAdminAudit(
      ctx,
      "set_sanction_status",
      "user_sanction",
      sanctionId,
      detail,
    );
  },
);

export const create_appeal_ticket = spacetimedb.reducer(
  {
    sanctionId: t.string(),
    detailText: t.string(),
  },
  (ctx, { sanctionId, detailText }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const sanction = ctx.db.userSanction.id.find(sanctionId);
    if (!sanction) throw new SenderError("找不到處分單");
    if (!sanction.targetIdentity.isEqual(ctx.sender))
      throw new SenderError("無權限");
    const text = detailText.trim();
    if (text.length < REPORT_DETAIL_MIN || text.length > REPORT_DETAIL_MAX) {
      throw new SenderError(
        `申訴內容需 ${REPORT_DETAIL_MIN}-${REPORT_DETAIL_MAX} 字`,
      );
    }
    ctx.db.appealTicket.insert({
      id: newMessageId(ctx.random),
      sanctionId,
      appellantIdentity: ctx.sender,
      detailText: text,
      status: "open",
      adminNote: "",
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      resolvedAt: undefined,
    });
  },
);

export const admin_update_appeal_ticket = spacetimedb.reducer(
  {
    appealId: t.string(),
    status: t.string(),
    adminNote: t.string(),
  },
  (ctx, { appealId, status, adminNote }) => {
    requireAdmin(ctx);
    const row = ctx.db.appealTicket.id.find(appealId);
    if (!row) throw new SenderError("找不到申訴單");
    const st = status.trim().toLowerCase();
    if (!["open", "in_review", "approved", "rejected"].includes(st)) {
      throw new SenderError("申訴狀態錯誤");
    }
    const done = st === "approved" || st === "rejected";
    ctx.db.appealTicket.id.update({
      ...row,
      status: st,
      adminNote: adminNote.trim(),
      updatedAt: ctx.timestamp,
      resolvedAt: done ? ctx.timestamp : undefined,
    });
    writeAdminAudit(
      ctx,
      "update_appeal",
      "appeal_ticket",
      appealId,
      `${st}:${adminNote.trim()}`,
    );
  },
);

export const send_direct_message = spacetimedb.reducer(
  {
    recipientEmail: t.string(),
    content: t.string(),
    scheduledAt: t.timestamp().optional(),
    isWaitListVisible: t.bool(),
    publishToSquare: t.bool(),
    squareRepliesPublic: t.bool(),
    squareIncludeThread: t.bool(),
    squareIncludeCapsulePrivate: t.bool(),
    squareShowSender: t.bool(),
    squareShowRecipient: t.bool(),
  },
  (
    ctx,
    {
      recipientEmail,
      content,
      scheduledAt,
      isWaitListVisible,
      publishToSquare,
      squareRepliesPublic,
      squareIncludeThread,
      squareIncludeCapsulePrivate,
      squareShowSender,
      squareShowRecipient,
    },
  ) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const rec = normalizeEmail(recipientEmail);
    if (!rec) throw new SenderError("請填寫收件人");
    const body = content.trim();
    if (!body) throw new SenderError("請填寫內容");
    if (body.length > MAX_MESSAGE_CONTENT_LEN)
      throw new SenderError("內容過長（最多 300 字）");
    const finalScheduledAt = resolveScheduledAtOrNow(
      scheduledAt,
      ctx.timestamp,
    );

    const newId = newMessageId(ctx.random);
    ctx.db.scheduledMessage.insert({
      id: newId,
      senderIdentity: ctx.sender,
      senderEmail: pf.email,
      recipientEmail: rec,
      content: body,
      scheduledAt: finalScheduledAt,
      isWaitListVisible,
      exchangeLog: "",
      createdAt: ctx.timestamp,
    });

    if (publishToSquare) {
      insertSquarePostForMessage(
        ctx,
        newId,
        "direct",
        ctx.sender,
        squareRepliesPublic,
        squareIncludeThread,
        squareIncludeCapsulePrivate,
        squareShowSender,
        squareShowRecipient,
        {
          content: body,
          senderEmail: pf.email,
          recipientEmail: rec,
          scheduledAt: finalScheduledAt,
          exchangeLog: "",
        },
      );
    }
  },
);

export const send_capsule_message = spacetimedb.reducer(
  {
    content: t.string(),
    capsuleType: t.u8(),
    scheduledAt: t.timestamp().optional(),
    isWaitListVisible: t.bool(),
    isProfilePublic: t.bool(),
    publishToSquare: t.bool(),
    squareRepliesPublic: t.bool(),
    squareIncludeThread: t.bool(),
    squareIncludeCapsulePrivate: t.bool(),
    squareShowSender: t.bool(),
    squareShowRecipient: t.bool(),
  },
  (
    ctx,
    {
      content,
      capsuleType,
      scheduledAt,
      isWaitListVisible,
      isProfilePublic,
      publishToSquare,
      squareRepliesPublic,
      squareIncludeThread,
      squareIncludeCapsulePrivate,
      squareShowSender,
      squareShowRecipient,
    },
  ) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const body = content.trim();
    if (!body) throw new SenderError("請填寫內容");
    if (body.length > MAX_MESSAGE_CONTENT_LEN)
      throw new SenderError("內容過長（最多 300 字）");
    if (capsuleType < CAPSULE_TYPE_MIN || capsuleType > CAPSULE_TYPE_MAX) {
      throw new SenderError("膠囊類型錯誤");
    }
    const finalScheduledAt = resolveScheduledAtOrNow(
      scheduledAt,
      ctx.timestamp,
    );

    const newId = newMessageId(ctx.random);
    ctx.db.capsuleMessage.insert({
      id: newId,
      authorIdentity: ctx.sender,
      authorEmail: pf.email,
      authorAccountId: pf.accountId, // 存入
      authorDisplayName: pf.displayName, // 存入
      authorGender: pf.gender, // 存入
      authorBirthDate: pf.birthDate, // 存入
      content: body,
      scheduledAt: finalScheduledAt,
      isWaitListVisible,
      exchangeLog: "",
      createdAt: ctx.timestamp,
      capsuleType,
    });
    ctx.db.capsuleMessageSpaceState.insert({
      capsuleId: newId,
      authorIdentity: ctx.sender,
      isProfilePublic,
      isDeleted: false,
    });
  },
);

export const delete_capsule_message = spacetimedb.reducer(
  { id: t.string() },
  (ctx, { id }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const row = ctx.db.capsuleMessage.id.find(id);
    if (!row) throw new SenderError("找不到膠囊");
    if (!row.authorIdentity.isEqual(ctx.sender))
      throw new SenderError("無權限");
    const state = ctx.db.capsuleMessageSpaceState.capsuleId.find(id);
    if (state?.isDeleted) return;

    const post = ctx.db.squarePost.sourceMessageId.find(id);
    if (post) {
      deleteSquarePostCascade(ctx, id);
    }

    if (state) {
      ctx.db.capsuleMessageSpaceState.capsuleId.update({
        ...state,
        isProfilePublic: false,
        isDeleted: true,
      });
    } else {
      ctx.db.capsuleMessageSpaceState.insert({
        capsuleId: id,
        authorIdentity: row.authorIdentity,
        isProfilePublic: false,
        isDeleted: true,
      });
    }
  },
);

export const restore_capsule_message = spacetimedb.reducer(
  { id: t.string() },
  (ctx, { id }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const row = ctx.db.capsuleMessage.id.find(id);
    if (!row) throw new SenderError("找不到膠囊");
    const admin = isAdminIdentity(ctx, ctx.sender);
    if (!admin && !row.authorIdentity.isEqual(ctx.sender))
      throw new SenderError("無權限");

    const state = ctx.db.capsuleMessageSpaceState.capsuleId.find(id);
    if (state) {
      if (!state.isDeleted) return;
      ctx.db.capsuleMessageSpaceState.capsuleId.update({
        ...state,
        isDeleted: false,
      });
    } else {
      ctx.db.capsuleMessageSpaceState.insert({
        capsuleId: id,
        authorIdentity: row.authorIdentity,
        isProfilePublic: row.authorIdentity.isEqual(ctx.sender),
        isDeleted: false,
      });
    }
    if (admin) {
      writeModerationAction(ctx, "restore_capsule", "capsule", id, "");
      writeAdminAudit(ctx, "restore_capsule", "capsule", id, "");
    }
  },
);

export const send_scheduled_message = spacetimedb.reducer(
  {
    recipientEmail: t.string(),
    content: t.string(),
    scheduledAt: t.timestamp(),
    isWaitListVisible: t.bool(),
    /** 寄件人：建立時一併發布至廣場（不受「須開啟後」限制） */
    publishToSquare: t.bool(),
    /** 廣場是否開放留言（關閉時仍可讚／踩／中立與收藏） */
    squareRepliesPublic: t.bool(),
    /** 廣場快照是否併入雙方往來摘錄 {@link scheduledMessage.exchangeLog} */
    squareIncludeThread: t.bool(),
    /** 廣場快照是否併入膠囊私訊摘錄 */
    squareIncludeCapsulePrivate: t.bool(),
    squareShowSender: t.bool(),
    squareShowRecipient: t.bool(),
  },
  (
    ctx,
    {
      recipientEmail,
      content,
      scheduledAt,
      isWaitListVisible,
      publishToSquare,
      squareRepliesPublic,
      squareIncludeThread,
      squareIncludeCapsulePrivate,
      squareShowSender,
      squareShowRecipient,
    },
  ) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    const rec = normalizeEmail(recipientEmail);
    if (!rec) throw new SenderError("請填寫收件人");
    const body = content.trim();
    if (!body) throw new SenderError("請填寫內容");
    if (body.length > MAX_MESSAGE_CONTENT_LEN)
      throw new SenderError("內容過長（最多 300 字）");

    if (
      scheduledAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("開啟時間須晚於現在");
    }

    const newId = newMessageId(ctx.random);
    ctx.db.scheduledMessage.insert({
      id: newId,
      senderIdentity: ctx.sender,
      senderEmail: pf.email,
      recipientEmail: rec,
      content: body,
      scheduledAt,
      isWaitListVisible,
      exchangeLog: "",
      createdAt: ctx.timestamp,
    });

    if (publishToSquare) {
      insertSquarePostForMessage(
        ctx,
        newId,
        "direct",
        ctx.sender,
        squareRepliesPublic,
        squareIncludeThread,
        squareIncludeCapsulePrivate,
        squareShowSender,
        squareShowRecipient,
        {
          content: body,
          senderEmail: pf.email,
          recipientEmail: rec,
          scheduledAt,
          exchangeLog: "",
        },
      );
    }
  },
);

export const update_scheduled_message = spacetimedb.reducer(
  {
    id: t.string(),
    recipientEmail: t.string(),
    content: t.string(),
    scheduledAt: t.timestamp(),
    isWaitListVisible: t.bool(),
    /** 寄件人：儲存時同步／取消廣場（未到開啟時間可預先上廣場） */
    publishToSquare: t.bool(),
    squareRepliesPublic: t.bool(),
    squareIncludeThread: t.bool(),
    squareIncludeCapsulePrivate: t.bool(),
    squareShowSender: t.bool(),
    squareShowRecipient: t.bool(),
  },
  (
    ctx,
    {
      id,
      recipientEmail,
      content,
      scheduledAt,
      isWaitListVisible,
      publishToSquare,
      squareRepliesPublic,
      squareIncludeThread,
      squareIncludeCapsulePrivate,
      squareShowSender,
      squareShowRecipient,
    },
  ) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    const row = ctx.db.scheduledMessage.id.find(id);
    if (!row) throw new SenderError("找不到訊息");
    if (!row.senderIdentity.isEqual(ctx.sender))
      throw new SenderError("無權限");
    if (
      row.scheduledAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("已超過開啟時間，無法編輯");
    }

    const rec = normalizeEmail(recipientEmail);
    if (!rec) throw new SenderError("請填寫收件人");
    const body = content.trim();
    if (!body) throw new SenderError("請填寫內容");
    if (
      scheduledAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("開啟時間須晚於現在");
    }

    ctx.db.scheduledMessage.id.update({
      ...row,
      recipientEmail: rec,
      content: body,
      scheduledAt,
      isWaitListVisible,
    });

    const next = ctx.db.scheduledMessage.id.find(id)!;
    if (!publishToSquare) {
      if (ctx.db.squarePost.sourceMessageId.find(id)) {
        deleteSquarePostCascade(ctx, id);
      }
      return;
    }

    const sp = ctx.db.squarePost.sourceMessageId.find(id);
    if (sp) {
      ctx.db.squarePost.sourceMessageId.update({
        ...sp,
        repliesPublic: squareRepliesPublic,
        includeThreadInSnapshot: squareIncludeThread,
        includeCapsulePrivateInSnapshot: squareIncludeCapsulePrivate,
        showSenderOnSquare: squareShowSender,
        showRecipientOnSquare: squareShowRecipient,
        snapshotContent: composeSquarePostSnapshot(
          ctx,
          id,
          next,
          squareIncludeThread,
          squareIncludeCapsulePrivate,
        ),
        snapshotSenderEmail: next.senderEmail,
        snapshotRecipientEmail: next.recipientEmail,
        snapshotScheduledAt: next.scheduledAt,
      });
    } else {
      insertSquarePostForMessage(
        ctx,
        id,
        "direct",
        ctx.sender,
        squareRepliesPublic,
        squareIncludeThread,
        squareIncludeCapsulePrivate,
        squareShowSender,
        squareShowRecipient,
        {
          content: next.content,
          senderEmail: next.senderEmail,
          recipientEmail: next.recipientEmail,
          scheduledAt: next.scheduledAt,
          exchangeLog: next.exchangeLog ?? "",
        },
      );
    }
  },
);

export const delete_scheduled_message = spacetimedb.reducer(
  { id: t.string() },
  (ctx, { id }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");

    const row = ctx.db.scheduledMessage.id.find(id);
    if (!row) throw new SenderError("找不到訊息");
    if (!row.senderIdentity.isEqual(ctx.sender))
      throw new SenderError("無權限");
    if (
      row.scheduledAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("已超過開啟時間，無法刪除");
    }

    deleteSquarePostCascade(ctx, id);
    deleteCapsulePrivateForMessage(ctx, id);
    ctx.db.scheduledMessage.delete(row);
  },
);

const MAX_SQUARE_COMMENT_LEN = 300;

export const publish_to_square = spacetimedb.reducer(
  {
    sourceMessageId: t.string(),
    sourceKind: t.string().optional(),
    repliesPublic: t.bool(),
    includeThreadInSnapshot: t.bool(),
    includeCapsulePrivateInSnapshot: t.bool(),
    showSenderOnSquare: t.bool(),
    showRecipientOnSquare: t.bool(),
  },
  (
    ctx,
    {
      sourceMessageId,
      sourceKind,
      repliesPublic,
      includeThreadInSnapshot,
      includeCapsulePrivateInSnapshot,
      showSenderOnSquare,
      showRecipientOnSquare,
    },
  ) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const kind = normalizeSourceKind(sourceKind);
    const source = getSquareSourceRow(ctx, sourceMessageId, kind);
    if (!source) throw new SenderError("找不到訊息");
    if (!isSquareSourceParticipant(pf, source, ctx.sender)) {
      throw new SenderError(
        kind === "capsule" ? "僅發文者可上廣場" : "僅寄件人或收件人可上廣場",
      );
    }
    if (
      source.scheduledAt.microsSinceUnixEpoch >
      ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError(
        "須待信件開啟後才能由此上廣場；寄件人可在撰寫／編輯排程時勾選「同步發布至廣場」",
      );
    }
    insertSquarePostForMessage(
      ctx,
      sourceMessageId,
      kind,
      ctx.sender,
      repliesPublic,
      includeThreadInSnapshot,
      includeCapsulePrivateInSnapshot,
      showSenderOnSquare,
      showRecipientOnSquare,
      {
        content: source.content,
        senderEmail: source.senderEmail,
        recipientEmail: source.recipientEmail,
        scheduledAt: source.scheduledAt,
        exchangeLog: source.exchangeLog,
      },
    );
  },
);

export const append_letter_exchange = spacetimedb.reducer(
  { messageId: t.string(), body: t.string() },
  (ctx, { messageId, body }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const msg = ctx.db.scheduledMessage.id.find(messageId);
    if (!msg) throw new SenderError("找不到訊息");
    if (!isMessageParticipant(pf, msg, ctx.sender)) {
      throw new SenderError("僅寄件人或收件人可補寫往來");
    }
    const line = body.trim();
    if (!line) throw new SenderError("請輸入內容");
    if (line.length > MAX_EXCHANGE_APPEND)
      throw new SenderError("單則往來過長（最多 300 字）");
    const stamp = isoFromMicros(ctx.timestamp.microsSinceUnixEpoch);
    const append = `[${stamp}] ${pf.email}：\n${line}\n\n`;
    const nextLog = (msg.exchangeLog ?? "") + append;
    if (nextLog.length > MAX_EXCHANGE_LOG)
      throw new SenderError("往來摘錄總長度已達上限");
    ctx.db.scheduledMessage.id.update({
      ...msg,
      exchangeLog: nextLog,
    });
    refreshSquareSnapshotIfNeeded(ctx, messageId);
  },
);

export const unpublish_from_square = spacetimedb.reducer(
  { sourceMessageId: t.string() },
  (ctx, { sourceMessageId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
    if (!post) {
      throw new SenderError("此信未在廣場公開");
    }
    const source = getSquareSourceRow(
      ctx,
      sourceMessageId,
      normalizeSourceKind(post.sourceKind),
    );
    if (!source) throw new SenderError("找不到原訊息");
    if (!isSquareSourceParticipant(pf, source, ctx.sender))
      throw new SenderError("無權限");
    deleteSquarePostCascade(ctx, sourceMessageId);
  },
);

export const set_square_reaction = spacetimedb.reducer(
  { sourceMessageId: t.string(), kind: t.string() },
  (ctx, { sourceMessageId, kind }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    if (!ctx.db.squarePost.sourceMessageId.find(sourceMessageId)) {
      throw new SenderError("此貼不在廣場");
    }
    const k = kind.trim();
    if (k !== "up" && k !== "mid" && k !== "down" && k !== "none") {
      throw new SenderError("無效的反應類型");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existing: any = null;
    for (const row of ctx.db.squareReaction.iter()) {
      if (
        row.postSourceMessageId === sourceMessageId &&
        row.reactorIdentity.isEqual(ctx.sender)
      ) {
        existing = row;
        break;
      }
    }
    if (k === "none") {
      if (existing) ctx.db.squareReaction.delete(existing);
      return;
    }
    if (existing) {
      ctx.db.squareReaction.id.update({
        ...existing,
        kind: k,
        createdAt: ctx.timestamp,
      });
    } else {
      ctx.db.squareReaction.insert({
        id: newMessageId(ctx.random),
        postSourceMessageId: sourceMessageId,
        reactorIdentity: ctx.sender,
        kind: k,
        createdAt: ctx.timestamp,
      });
    }
  },
);

export const add_square_comment = spacetimedb.reducer(
  {
    sourceMessageId: t.string(),
    body: t.string(),
    parentCommentId: t.string(),
  },
  (ctx, { sourceMessageId, body, parentCommentId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
    if (!post) throw new SenderError("此貼不在廣場");
    if (!post.repliesPublic) throw new SenderError("此貼不開放廣場留言");
    const text = body.trim();
    if (!text) throw new SenderError("請輸入內容");
    if (text.length > MAX_SQUARE_COMMENT_LEN)
      throw new SenderError("評論過長（最多 300 字）");
    const parent = parentCommentId.trim();
    if (parent) {
      const prow = ctx.db.squareComment.id.find(parent);
      if (!prow || prow.postSourceMessageId !== sourceMessageId) {
        throw new SenderError("父留言不存在");
      }
    }
    ctx.db.squareComment.insert({
      id: newMessageId(ctx.random),
      postSourceMessageId: sourceMessageId,
      authorIdentity: ctx.sender,
      body: text,
      parentCommentId: parent,
      createdAt: ctx.timestamp,
    });
  },
);

export const add_capsule_private_message = spacetimedb.reducer(
  {
    sourceMessageId: t.string(),
    threadGuestIdentity: t.identity(),
    body: t.string(),
  },
  (ctx, { sourceMessageId, threadGuestIdentity, body }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const myAccountId = pf.accountId;
    const guestPf = ctx.db.accountProfile.ownerIdentity.find(threadGuestIdentity);
    const guestAccountId = guestPf?.accountId || "";
    const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
    const source = post
      ? getSquareSourceRow(
          ctx,
          sourceMessageId,
          normalizeSourceKind(post.sourceKind),
        )
      : getSquareSourceRow(ctx, sourceMessageId, "capsule");
    if (!source) throw new SenderError("找不到訊息");
    if (
      source.scheduledAt.microsSinceUnixEpoch >
      ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("信件尚未開啟");
    }
    if (source.kind === "direct") {
      if (!isCapsuleThirdParty(ctx, source, threadGuestIdentity)) {
        throw new SenderError("膠囊私訊須以訪客身份開線");
      }
    } else if (source.senderIdentity.isEqual(threadGuestIdentity)) {
      throw new SenderError("膠囊私訊須以訪客身份開線");
    }
    const text = body.trim();
    if (!text) throw new SenderError("請輸入內容");
    if (text.length > MAX_SQUARE_COMMENT_LEN)
      throw new SenderError("內容過長（最多 300 字）");

    // 🔑 修改後的判定：使用 Email 或 AccountId 進行比對，不再依賴 Identity
    const participant = post
      ? isSquareSourceParticipant(pf, source, ctx.sender)
      : source.kind === "capsule"
        ? (source as any).authorAccountId === pf.accountId // 膠囊比對 AccountId
        : normalizeEmail(source.senderEmail) === normalizeEmail(pf.email); // 定向信比對 Email
    if (participant) {
      if (threadGuestIdentity.isEqual(ctx.sender)) {
        throw new SenderError("請指定要回覆的訪客線（訪客身份）");
      }
      if (!capsuleThreadNonEmpty(ctx, sourceMessageId, threadGuestIdentity)) {
        throw new SenderError("請待該訪客先開啟此線後再回覆");
      }
    } else {
      if (!threadGuestIdentity.isEqual(ctx.sender)) {
        throw new SenderError("訪客僅能於自己的線發言");
      }
    }

    /**
     * 前 10 句遵守「你一句我一句」：
     * - 打招呼後若對方尚未回覆，不可連續再發。
     * - 第 11 句起解除此限制。
     */
    let threadCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let latestInThread: any = null;
    for (const row of ctx.db.capsulePrivateMessage.iter()) {
      if (row.sourceMessageId !== sourceMessageId) continue;
      if (!row.threadGuestIdentity.isEqual(threadGuestIdentity)) continue;
      threadCount += 1;
      if (
        !latestInThread ||
        row.createdAt.microsSinceUnixEpoch >
          latestInThread.createdAt.microsSinceUnixEpoch
      ) {
        latestInThread = row;
      }
    }
    if (
      threadCount < 10 &&
      latestInThread?.authorIdentity?.isEqual(ctx.sender)
    ) {
      throw new SenderError("前 10 句需你一句我一句，請等對方回覆");
    }

    ctx.db.capsulePrivateMessage.insert({
      id: newMessageId(ctx.random),
      sourceMessageId,
      threadGuestIdentity,
      threadGuestAccountId: guestAccountId, // 使用查表得到的 ID
      authorIdentity: ctx.sender,
      authorAccountId: myAccountId,        // 使用查表得到的 ID
      body: body.trim(),
      createdAt: ctx.timestamp,
    });
    refreshSquareSnapshotIfNeeded(ctx, sourceMessageId);
  },
);

export const favorite_square_post = spacetimedb.reducer(
  { sourceMessageId: t.string() },
  (ctx, { sourceMessageId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const post = ctx.db.squarePost.sourceMessageId.find(sourceMessageId);
    if (!post) throw new SenderError("請先於廣場公開此信再收藏");
    for (const row of ctx.db.squareFavorite.iter()) {
      if (
        row.postSourceMessageId === sourceMessageId &&
        row.collectorIdentity.isEqual(ctx.sender)
      ) {
        throw new SenderError("已收藏");
      }
    }
    // 執行插入，補齊快照
    ctx.db.squareFavorite.insert({
      id: newMessageId(ctx.random),
      postSourceMessageId: sourceMessageId,
      collectorIdentity: ctx.sender,
      snapshotContent: post.snapshotContent,
      snapshotSenderEmail: post.snapshotSenderEmail,
      snapshotRecipientEmail: post.snapshotRecipientEmail,
      snapshotScheduledAt: post.snapshotScheduledAt,
      snapshotShowSender: post.showSenderOnSquare,
      snapshotShowRecipient: post.showRecipientOnSquare,
      snapshotPublisherGender: post.snapshotPublisherGender,
      snapshotPublisherBirthDate: post.snapshotPublisherBirthDate,
      snapshotPublisherAccountId: post.publisherAccountId,
      createdAt: ctx.timestamp,
    });
  },
);

export const unfavorite_square_post = spacetimedb.reducer(
  { sourceMessageId: t.string() },
  (ctx, { sourceMessageId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    for (const row of ctx.db.squareFavorite.iter()) {
      if (
        row.postSourceMessageId === sourceMessageId &&
        row.collectorIdentity.isEqual(ctx.sender)
      ) {
        ctx.db.squareFavorite.delete(row);
        return;
      }
    }
    throw new SenderError("未收藏");
  },
);

export const favorite_capsule = spacetimedb.reducer(
  { capsuleId: t.string() },
  (ctx, { capsuleId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    const cap = ctx.db.capsuleMessage.id.find(capsuleId);
    if (!cap) throw new SenderError("找不到膠囊");
    if (cap.authorIdentity.isEqual(ctx.sender))
      throw new SenderError("不能收藏自己的膠囊");
    const st = ctx.db.capsuleMessageSpaceState.capsuleId.find(capsuleId);
    if (st?.isDeleted) throw new SenderError("此膠囊已不可用");
    if (
      cap.scheduledAt.microsSinceUnixEpoch > ctx.timestamp.microsSinceUnixEpoch
    ) {
      throw new SenderError("尚未到開啟時間，暫時不能收藏");
    }
    // 1. 抓出作者的個人資料，用來做快照
    const authorPf = ctx.db.accountProfile.ownerIdentity.find(
      cap.authorIdentity,
    );

    for (const row of ctx.db.capsuleFavorite.capsuleId.filter(capsuleId)) {
      if (row.collectorIdentity.isEqual(ctx.sender)) {
        throw new SenderError("已收藏");
      }
    }

    // 2. 執行插入，補齊所有新欄位
    ctx.db.capsuleFavorite.insert({
      id: newMessageId(ctx.random),
      capsuleId,
      collectorIdentity: ctx.sender,
      snapshotContent: cap.content,
      snapshotAuthorEmail: cap.authorEmail,
      snapshotScheduledAt: cap.scheduledAt,
      snapshotCapsuleType: cap.capsuleType,
      // ▼ 補上這些新快照欄位 ▼
      snapshotPublisherGender: authorPf?.gender || "unspecified",
      snapshotPublisherBirthDate: authorPf?.birthDate,
      snapshotPublisherAccountId: authorPf?.accountId || "",
      createdAt: ctx.timestamp,
    });
  },
);

export const unfavorite_capsule = spacetimedb.reducer(
  { capsuleId: t.string() },
  (ctx, { capsuleId }) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) throw new SenderError("尚未登入");
    for (const row of ctx.db.capsuleFavorite.capsuleId.filter(capsuleId)) {
      if (row.collectorIdentity.isEqual(ctx.sender)) {
        ctx.db.capsuleFavorite.delete(row);
        return;
      }
    }
    throw new SenderError("未收藏");
  },
);
export const capsule_private_for_me = spacetimedb.view(
  { name: "capsule_private_for_me", public: true },
  t.array(capsulePrivateMessage.rowType),
  (ctx) => {
    const pf = ctx.db.accountProfile.ownerIdentity.find(ctx.sender);
    if (!pf) return [];

    const myAccountId = pf.accountId;
    const myEmail = normalizeEmail(pf.email);
    const outSet = new Set<any>(); // 使用 Set 防止重複加入

    // 🚀 優化 A：直接從索引抓取「我是發言人」的訊息
    for (const msg of ctx.db.capsulePrivateMessage.authorAccountId.filter(myAccountId)) {
      outSet.add(msg);
    }

    // 🚀 優化 B：直接從索引抓取「我是訪客線」的訊息
    for (const msg of ctx.db.capsulePrivateMessage.threadGuestAccountId.filter(myAccountId)) {
      outSet.add(msg);
    }

    // 🚀 優化 C：處理「我是主信主人」的情況
    // 先找出我有權管理的 sourceIds (利用索引)
    const mySourceIds = new Set<string>();
    for (const msg of ctx.db.scheduledMessage.senderEmail.filter(myEmail)) { mySourceIds.add(msg.id); }
    for (const msg of ctx.db.scheduledMessage.recipientEmail.filter(myEmail)) { mySourceIds.add(msg.id); }
    for (const cap of ctx.db.capsuleMessage.authorAccountId.filter(myAccountId)) { mySourceIds.add(cap.id); }

    // 這裡我們只針對「我有權限的信件 ID」去尋找私訊
    for (const sourceId of mySourceIds) {
      for (const msg of ctx.db.capsulePrivateMessage.sourceMessageId.filter(sourceId)) {
        outSet.add(msg);
      }
    }

    const out = [...outSet].sort((a, b) => 
      Number(a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch)
    );
    return out;
  }
);

export const recent_square_posts = spacetimedb.view(
  { name: "recent_square_posts", public: true },
  t.array(squarePost.rowType), // 回傳原本的 Table 型別
  (ctx) => {
    return [...ctx.db.squarePost.iter()]
      .sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      )
      .slice(0, 100);
  },
);

/** 修正雲端曾以錯誤預設 true 寫入之 includeCapsulePrivateInSnapshot（TS SDK falsy 預設值遺漏）。 */
const MIG_SQUARE_POST_CAPSULE_DEFAULT_V1 =
  "fix_square_post_include_capsule_private_default_v1";

export const init = spacetimedb.init(
  (ctx: { db: any; timestamp: { microsSinceUnixEpoch: bigint } }) => {
    if (
      ctx.db.moduleMigrationDone.migrationId.find(
        MIG_SQUARE_POST_CAPSULE_DEFAULT_V1,
      )
    ) {
      return;
    }
    for (const post of [...ctx.db.squarePost.iter()]) {
      if (!post.includeCapsulePrivateInSnapshot) continue;
      const source = getSquareSourceRow(
        ctx,
        post.sourceMessageId,
        normalizeSourceKind(post.sourceKind),
      );
      if (!source) continue;
      ctx.db.squarePost.sourceMessageId.update({
        ...post,
        includeCapsulePrivateInSnapshot: false,
        snapshotContent: composeSquarePostSnapshot(
          ctx,
          post.sourceMessageId,
          source,
          post.includeThreadInSnapshot,
          false,
        ),
        snapshotSenderEmail: source.senderEmail,
        snapshotRecipientEmail: source.recipientEmail,
        snapshotScheduledAt: source.scheduledAt,
      });
    }
    ctx.db.moduleMigrationDone.insert({
      migrationId: MIG_SQUARE_POST_CAPSULE_DEFAULT_V1,
      appliedAt: ctx.timestamp,
    });
  },
);
