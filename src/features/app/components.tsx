import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  History,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Sparkles,
  ThumbsUp,
  User,
  Mars,
  Venus,
  Asterisk,
} from "lucide-react";
import { cn, emailsEqual } from "../../lib/utils";
import type { SquareComment, SquarePost } from "../../module_bindings/types";
import { squareAddressSubtitle } from "./helpers";
import type { Message, User as AppUser } from "./types";
function GenderIcon({ gender }: { gender?: string }) {
  if (!gender) return null;
  const g = gender.toLowerCase();

  if (g === "male") {
    return (
      <Mars
        className="w-3.5 h-3.5 text-blue-500 drop-shadow-[0_0_2px_rgba(59,130,246,0.3)]"
        strokeWidth={3}
      />
    );
  }
  if (g === "female") {
    return (
      <Venus
        className="w-3.5 h-3.5 text-pink-500 drop-shadow-[0_0_2px_rgba(236,72,153,0.3)]"
        strokeWidth={3}
      />
    );
  }
  if (g === "other") {
    return <Asterisk className="w-3.5 h-3.5 text-amber-500" strokeWidth={3} />;
  }
  return null;
}
export function MobileNavItem({
  active,
  onClick,
  ariaLabel,
  icon,
  onDark = false,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex min-w-[3.25rem] flex-col items-center justify-center pb-0.5 transition-colors",
        onDark
          ? active
            ? "text-[#f4dc3a]"
            : "text-white/42"
          : active
            ? "text-sky-600"
            : "text-black/38",
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center">{icon}</span>
    </button>
  );
}

function compareMessagesRecentFirst(a: Message, b: Message): number {
  const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (bc !== ac) return bc - ac;

  const as = new Date(a.scheduledAt).getTime();
  const bs = new Date(b.scheduledAt).getTime();
  if (bs !== as) return bs - as;

  return String(b._id).localeCompare(String(a._id));
}

function partitionByDue(list: Message[]): {
  sealed: Message[];
  opened: Message[];
} {
  const sorted = [...list].sort(compareMessagesRecentFirst);
  const sealed = sorted.filter((m) => !m.isDue);
  const opened = sorted.filter((m) => m.isDue);
  return { sealed, opened };
}

function MailboxSectionHeader({
  title,
  count,
  tone,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  tone: "sealed" | "opened";
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-1 py-1.5 rounded-lg text-left transition-colors",
        "hover:bg-black/[0.04] active:bg-black/[0.06]",
        tone === "sealed" ? "text-amber-900/75" : "text-sky-900/75",
      )}
    >
      <ChevronRight
        className={cn(
          "w-3.5 h-3.5 shrink-0 text-black/35 transition-transform duration-200",
          expanded && "rotate-90",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          tone === "sealed" ? "bg-amber-400" : "bg-sky-500",
        )}
        aria-hidden
      />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {title}
      </span>
      <span className="text-[10px] font-medium tabular-nums text-black/38">
        ({count})
      </span>
    </button>
  );
}

export function MailboxGroupedList({
  messages,
  scope,
  selectedMessageId,
  onSelectMessage,
  currentUserEmail,
  sealedOpen,
  openedOpen,
  onToggleSealed,
  onToggleOpened,
}: {
  messages: Message[];
  scope: "inbox" | "outbox";
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  currentUserEmail?: string;
  sealedOpen: boolean;
  openedOpen: boolean;
  onToggleSealed: () => void;
  onToggleOpened: () => void;
}) {
  const { sealed, opened } = partitionByDue(messages);

  return (
    <div className="space-y-0.5">
      {sealed.length > 0 ? (
        <div className="mb-0.5">
          <MailboxSectionHeader
            title="還沒拆"
            count={sealed.length}
            tone="sealed"
            expanded={sealedOpen}
            onToggle={onToggleSealed}
          />
          {sealedOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {sealed.map((msg) => (
                <React.Fragment key={msg._id}>
                  <MessageTile
                    active={selectedMessageId === msg._id}
                    msg={msg}
                    onClick={() => onSelectMessage(msg._id)}
                    currentUserEmail={currentUserEmail}
                    pillLayoutScope={scope}
                    listTone="sealed"
                  />
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {opened.length > 0 ? (
        <div
          className={cn(
            sealed.length > 0 && "mt-1.5 border-t border-black/[0.06] pt-0.5",
          )}
        >
          <MailboxSectionHeader
            title="已經拆囉"
            count={opened.length}
            tone="opened"
            expanded={openedOpen}
            onToggle={onToggleOpened}
          />
          {openedOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {opened.map((msg) => (
                <React.Fragment key={msg._id}>
                  <MessageTile
                    active={selectedMessageId === msg._id}
                    msg={msg}
                    onClick={() => onSelectMessage(msg._id)}
                    currentUserEmail={currentUserEmail}
                    pillLayoutScope={scope}
                    listTone="opened"
                  />
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SecretCapsuleDrawButton({
  onClick,
  size = "default",
  variant = "tile",
}: {
  onClick: () => void;
  size?: "default" | "hero";
  variant?: "tile" | "treasure";
}) {
  const hero = size === "hero";
  const [capPulled, setCapPulled] = useState(false);
  const pullTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pullTimerRef.current != null) clearTimeout(pullTimerRef.current);
    };
  }, []);

  const triggerTreasureOpen = () => {
    if (variant !== "treasure" || capPulled) return;
    setCapPulled(true);
    if (pullTimerRef.current != null) clearTimeout(pullTimerRef.current);
    pullTimerRef.current = setTimeout(() => {
      onClick();
      setCapPulled(false);
      pullTimerRef.current = null;
    }, 420);
  };

  if (variant === "treasure") {
    return (
      <button
        type="button"
        disabled={capPulled}
        aria-label="抽秘密膠囊"
        title="抽秘密膠囊"
        onClick={triggerTreasureOpen}
        className={cn(
          "relative mx-auto shrink-0 select-none rounded-full border-[3px] border-stone-900 text-stone-900 shadow-[5px_6px_0_0_#0f2420] transition-transform",
          "w-[26vw] min-w-[5.5rem] max-w-[8.25rem] origin-center -rotate-[9deg]",
          "h-[min(calc(26vw*1.68),15.5rem)] min-h-[9.25rem]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90",
          "active:scale-[0.97] disabled:pointer-events-none",
          capPulled && "scale-[1.02]",
        )}
      >
        <span
          className="pointer-events-none absolute inset-[2px] rounded-full bg-gradient-to-b from-[#ffe566] via-[#f4dc3a] to-[#c99812]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-[14%] right-[14%] top-[40%] z-[1] h-px bg-stone-900/30"
          aria-hidden
        />
        <span
          className={cn(
            "pointer-events-none absolute left-[2px] right-[2px] top-[2px] z-[3] h-[36%] rounded-t-full border-b-2 border-stone-900/25",
            "bg-gradient-to-b from-[#fffef5] to-[#f2d24a]",
            "shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]",
            "origin-[50%_100%] transition-transform duration-[400ms] ease-[cubic-bezier(0.33,1.15,0.48,1)]",
            capPulled && "-translate-y-[85%] -rotate-[18deg]",
          )}
          aria-hidden
        />
        <Sparkles
          className="pointer-events-none absolute left-1/2 top-[60%] z-[4] h-6 w-6 -translate-x-1/2 -translate-y-1/2 sm:h-[1.05rem] sm:w-[1.05rem]"
          strokeWidth={2.35}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-[12%] left-1/2 z-[2] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-stone-900/25 bg-black/[0.05]"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="抽秘密膠囊"
      title="抽秘密膠囊"
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[2rem] border-[3px] border-stone-900 bg-[#f4dc3a] text-stone-900 shadow-[6px_6px_0_0_#0f2420] transition-transform active:translate-y-1 active:shadow-[3px_3px_0_0_#0f2420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90",
        hero
          ? "h-[10.25rem] w-[10.25rem] md:h-[9rem] md:w-[9rem]"
          : "h-[5.5rem] w-[5.5rem]",
      )}
    >
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 rounded-br-xl border-b-[3px] border-r-[3px] border-stone-900/35 bg-[#ffe78a]"
        aria-hidden
      />
      <Sparkles
        className={cn(
          hero ? "h-[5.5rem] w-[5.5rem] md:h-16 md:w-16" : "h-12 w-12",
        )}
        strokeWidth={2.35}
        aria-hidden
      />
    </button>
  );
}

export function SecretPaperListItem({
  children,
  selected,
  onClick,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      role="button" // 增加無障礙屬性
      tabIndex={0} // 讓它可以被選取
      className={cn(
        "w-full text-left cursor-pointer transition-all duration-200", // 增加手指游標
        "group relative p-3 rounded-2xl border-[3px] border-stone-900 bg-white",
        "shadow-[4px_4px_0_0_#0f2420] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0f2420]",
        selected
          ? "ring-2 ring-violet-500 bg-violet-50/30"
          : "hover:bg-stone-50",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SecretWallSection({
  expanded,
  onToggleExpanded,
  postsVisible,
  postsSortedLength,
  selectedSquarePostId,
  onSelectPost,
  reactionCountsByPost,
  commentsByPost,
  maxListItems = 10,
  expandedBodyMaxClass = "max-h-[min(48vh,22rem)] md:max-h-[min(38vh,18rem)]",
  onOpenSpace,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  postsVisible: SquarePost[];
  postsSortedLength: number;
  selectedSquarePostId: string | null;
  onSelectPost: (id: string) => void;
  reactionCountsByPost: Map<string, { up: number; mid: number; down: number }>;
  commentsByPost: Map<string, SquareComment[]>;
  maxListItems?: number;
  expandedBodyMaxClass?: string;
  onOpenSpace: (
    accountId: string,
    name: string,
    gender: string,
    birthDate?: any,
  ) => void;
}) {
  return (
    <section className="w-full shrink-0 rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-3 shadow-[5px_5px_0_0_#0f2420] md:p-4 md:shadow-[6px_6px_0_0_#142a28]">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-b-2 border-dashed border-stone-900/35 pb-2 text-left outline-none ring-stone-900/15 transition-colors hover:bg-black/[0.03] focus-visible:ring-2 md:mb-0 md:pb-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-stone-900 bg-[#f6e7c8] text-stone-900 shadow-[2px_2px_0_0_#0f2420] md:h-9 md:w-9">
            <LayoutGrid
              className="h-4 w-4 md:h-5 md:w-5"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[12px] font-black text-stone-900 md:text-[13px]">
              廣場牆
            </p>
            <p className="text-[10px] font-bold text-stone-600 md:text-[11px]">
              {expanded
                ? `共 ${postsSortedLength} 則 · 點此收起列表`
                : `共 ${postsSortedLength} 則 · 點此展開列表`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-stone-800 transition-transform duration-200",
            expanded ? "rotate-180" : "rotate-0",
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div
          className={cn(
            "mt-3 min-h-0 overflow-y-auto apple-scroll pr-0.5",
            expandedBodyMaxClass,
          )}
        >
          {postsVisible.length === 0 ? (
            <p className="px-0.5 py-4 text-center text-[12px] font-bold leading-relaxed text-stone-500 md:text-[13px]">
              {postsSortedLength === 0
                ? "還沒有能看的公開紙條，等大家貼上廣場吧。"
                : "有貼文但尚未到預定開啟時間，晚點再來逛逛。"}
            </p>
          ) : (
            <ul className="space-y-2">
              {postsVisible.slice(0, maxListItems).map((p) => (
                <li key={p.sourceMessageId}>
                  <SecretPaperListItem
                    selected={selectedSquarePostId === p.sourceMessageId}
                    onClick={() => onSelectPost(p.sourceMessageId)}
                  >
                    {/* 1. 正文內容：限制行數並優化字體 */}
                    <p className="line-clamp-3 text-[13px] font-bold leading-snug text-stone-900">
                      {p.snapshotContent.length > 140
                        ? `${p.snapshotContent.slice(0, 140)}…`
                        : p.snapshotContent}
                    </p>

                    {/* 2. 地址行：顯示寄件與收件人關係 */}
                    {(() => {
                      const line = squareAddressSubtitle(
                        p.showSenderOnSquare,
                        p.showRecipientOnSquare,
                        p.snapshotSenderEmail,
                        p.snapshotRecipientEmail,
                        {
                          sourceKind: p.sourceKind,
                          senderDisplayName: "",
                        },
                      );
                      return line ? (
                        <p className="mt-1 truncate text-[10px] font-bold text-stone-600">
                          {line}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] font-bold text-stone-500">
                          信箱已藏起來
                        </p>
                      );
                    })()}

                    {/* 3. 底部區域：左側為空間入口，右側為互動數據 */}
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2">
                      {/* 左側：作者資訊與進入空間按鈕 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // 🔑 絕對關鍵：阻止事件冒泡，否則點按鈕會同時觸發選中卡片
                          onOpenSpace(
                            p.publisherAccountId,
                            p.snapshotPublisherName,
                            p.snapshotPublisherGender,
                            p.snapshotPublisherBirthDate,
                          );
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1 transition-colors hover:bg-stone-200 active:scale-95"
                      >
                        <span className="max-w-[70px] truncate text-[10px] font-black text-stone-600">
                          {p.snapshotPublisherName || "神秘用戶"}
                        </span>
                        <GenderIcon gender={p.snapshotPublisherGender} />
                      </button>

                      {/* 右側：互動統計數據 (讚、評論) */}
                      <div className="flex items-center gap-3 text-[11px] font-black text-stone-400">
                        {/* 讚/中立/踩 的總合數量 */}
                        <span className="inline-flex items-center gap-0.5 transition-colors group-hover:text-stone-600">
                          <ThumbsUp
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          {(() => {
                            const rc = reactionCountsByPost.get(
                              p.sourceMessageId,
                            );
                            const total =
                              (rc?.up ?? 0) + (rc?.mid ?? 0) + (rc?.down ?? 0);
                            return total;
                          })()}
                        </span>

                        {/* 評論數：僅在開放留言時顯示 */}
                        {p.repliesPublic && (
                          <span className="inline-flex items-center gap-0.5 transition-colors group-hover:text-stone-600">
                            <MessageCircle
                              className="h-3.5 w-3.5"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                            {
                              (commentsByPost.get(p.sourceMessageId) ?? [])
                                .length
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </SecretPaperListItem>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function MineProfileSummaryCard({
  user,
  onOpenActions,
  onEditIntro,
  onLogout,
}: {
  user: AppUser;
  onOpenActions: () => void;
  onEditIntro: () => void;
  onLogout: () => void;
}) {
  const genderLabel =
    user.gender === "male"
      ? "男"
      : user.gender === "female"
        ? "女"
        : user.gender === "other"
          ? "其他"
          : user.gender === "unspecified"
            ? "未透露"
            : user.gender?.trim()
              ? user.gender
              : "—";
  const ageLine = user.ageYears > 0 ? `${user.ageYears} 歲` : "年齡未填";
  const note = user.profileNote?.trim();

  return (
    <div className="relative overflow-hidden rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-4 text-stone-900 shadow-[5px_5px_0_0_#0f2420] md:shadow-[4px_4px_0_0_rgba(15,36,32,0.18)]">
      <span
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[14px] border-l-[14px] border-l-transparent border-b-stone-900/20"
        aria-hidden
      />
      <div className="relative flex gap-3">
        <button
          type="button"
          onClick={onOpenActions}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left transition-colors hover:bg-stone-900/[0.04]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-900 bg-gradient-to-br from-violet-200/90 to-fuchsia-200/80 text-stone-900 shadow-sm">
            <User className="h-7 w-7" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="truncate text-[17px] font-black tracking-tight">
              {user.displayName?.trim() ||
                user.email?.split("@")[0] ||
                "未命名"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-stone-600">
              {user.email}
            </p>
            <p className="mt-1 text-[10px] font-bold text-stone-500">
              {genderLabel} · {ageLine}
            </p>
          </div>
        </button>
      </div>
      <div className="relative mt-2.5 rounded-xl border border-stone-900/10 bg-white/70 p-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            說說
          </p>
          <button
            type="button"
            onClick={onEditIntro}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50"
          >
            <Pencil className="h-3 w-3" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {note ? (
          <p className="line-clamp-3 text-[11px] font-medium leading-snug text-stone-700">
            {note}
          </p>
        ) : (
          <p className="text-[11px] font-medium text-stone-400">
            尚未填寫，點右上角修改
          </p>
        )}
      </div>
      <button type="button" onClick={onLogout} className="hidden" />
    </div>
  );
}

export function MineHubBigCards({
  inboxCount,
  outboxCount,
  favCount,
  chatCount,
  showAdminCard,
  showSuperOpsCard,
  myReportsCount,
  onNavigate,
}: {
  inboxCount: number;
  outboxCount: number;
  favCount: number;
  chatCount: number;
  showAdminCard: boolean;
  showSuperOpsCard: boolean;
  myReportsCount: number;
  onNavigate: (
    t:
      | "inbox"
      | "outbox"
      | "favorites"
      | "chat"
      | "space"
      | "admin"
      | "admin_ops"
      | "my_reports",
  ) => void;
}) {
  const cardShell =
    "group relative overflow-hidden rounded-2xl border-[3px] text-left transition-transform active:scale-[0.99] max-md:shadow-[5px_5px_0_0_rgba(15,36,32,0.9)] md:rounded-[1.4rem] md:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]";
  const rowInner =
    "relative flex min-h-[3.75rem]  gap-2 p-3 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-4 md:min-h-[4.5rem]";

  return (
    <div className="grid grid-cols-2 gap-3 px-1 py-1 md:grid-cols-1 md:space-y-3 md:px-0.5">
      <button
        type="button"
        onClick={() => onNavigate("inbox")}
        className={cn(
          cardShell,
          "col-span-1 border-sky-400/90 bg-gradient-to-br from-sky-50 via-white to-cyan-50 ring-0 ring-sky-100/90 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-md shadow-sky-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <Inbox
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-sky-950 sm:text-[17px] md:text-[18px]">
              飄向我的
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-800/80 sm:text-[12px]">
              共 {inboxCount} 則
            </p>
          </div>
          <ChevronRight className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-sky-400/80 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("outbox")}
        className={cn(
          cardShell,
          "col-span-1 border-amber-400/90 bg-gradient-to-br from-amber-50 via-white to-orange-50 ring-0 ring-amber-100/90 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute -left-4 -bottom-8 h-28 w-28 rounded-full bg-amber-200/35 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <History
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-amber-950 sm:text-[17px] md:text-[18px]">
              我丟出的
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-900/80 sm:text-[12px]">
              共 {outboxCount} 則
            </p>
          </div>
          <ChevronRight className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-amber-400/80 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0" />
        </div>
      </button>

      <DashboardCard
        onClick={() => onNavigate("chat")}
        countLabel={`共 ${chatCount} 條可續聊`}
        title="聊聊記錄"
        colors="border-emerald-500/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 ring-0 ring-emerald-100/90 md:col-span-1 md:ring-2"
        iconWrap="from-emerald-500 to-teal-500 shadow-emerald-900/25 rotate-2"
        textColor="text-emerald-950"
        subTextColor="text-emerald-800/80"
        icon={
          <MessageCircle
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
            strokeWidth={2.25}
            aria-hidden
          />
        }
      />

      <DashboardCard
        onClick={() => onNavigate("space")}
        countLabel="膠囊，廣場"
        title="我的空間"
        colors="border-cyan-400/90 bg-gradient-to-br from-cyan-50 via-white to-sky-50 ring-0 ring-cyan-100/90 md:col-span-1 md:ring-2"
        iconWrap="from-cyan-500 to-sky-500 shadow-cyan-900/25 rotate-2"
        textColor="text-cyan-950"
        subTextColor="text-cyan-800/80"
        icon={
          <User
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
            strokeWidth={2.25}
            aria-hidden
          />
        }
      />

      <DashboardCard
        onClick={() => onNavigate("favorites")}
        countLabel={`共 ${favCount} 則偷偷收著`}
        title="藏心底"
        colors="border-violet-400/90 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-pink-50 ring-0 ring-violet-100/90 md:col-span-1 md:ring-2"
        iconWrap="from-violet-500 to-fuchsia-500 shadow-violet-900/25 -rotate-3"
        textColor="text-violet-950"
        subTextColor="text-violet-800/80"
        icon={
          <Bookmark
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
            strokeWidth={2.25}
            aria-hidden
          />
        }
      />

      <DashboardCard
        onClick={() => onNavigate("my_reports")}
        countLabel={
          myReportsCount > 0
            ? `共 ${myReportsCount} 則，點查看審核狀態`
            : "查看舉報審核結果"
        }
        title="我的舉報"
        colors="border-sky-300/90 bg-gradient-to-br from-sky-50 via-white to-indigo-50 ring-0 ring-sky-100/90 md:col-span-1 md:ring-2"
        iconWrap="from-sky-400 to-indigo-500 shadow-sky-900/25 rotate-1"
        textColor="text-sky-950"
        subTextColor="text-sky-800/80"
        icon={
          <MessagesSquare
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
            strokeWidth={2.25}
            aria-hidden
          />
        }
      />

      {showSuperOpsCard ? (
        <DashboardCard
          onClick={() => onNavigate("admin_ops")}
          countLabel="總覽 · 權限 · 維運"
          title="超管指揮台"
          colors="border-emerald-500/90 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 ring-0 ring-emerald-500/25 md:col-span-1 md:ring-2 text-white"
          iconWrap="from-emerald-400 to-cyan-500 text-slate-950 -rotate-2"
          textColor="text-white"
          subTextColor="text-emerald-100/85"
          icon={
            <LayoutDashboard
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          }
        />
      ) : null}

      {showAdminCard ? (
        <DashboardCard
          onClick={() => onNavigate("admin")}
          countLabel="舉報池與審核操作"
          title="管理後台"
          colors="border-rose-400/90 bg-gradient-to-br from-rose-50 via-white to-orange-50 ring-0 ring-rose-100/90 md:col-span-1 md:ring-2"
          iconWrap="from-rose-500 to-orange-500 shadow-rose-900/25 -rotate-2"
          textColor="text-rose-950"
          subTextColor="text-rose-800/80"
          icon={
            <Lock
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          }
        />
      ) : null}
    </div>
  );
}

function DashboardCard({
  onClick,
  title,
  countLabel,
  colors,
  iconWrap,
  textColor,
  subTextColor,
  icon,
}: {
  onClick: () => void;
  title: string;
  countLabel: string;
  colors: string;
  iconWrap: string;
  textColor: string;
  subTextColor: string;
  icon: React.ReactNode;
}) {
  const cardShell =
    "group relative col-span-2 overflow-hidden rounded-2xl border-[3px] text-left transition-transform active:scale-[0.99] max-md:shadow-[5px_5px_0_0_rgba(15,36,32,0.9)] md:rounded-[1.4rem] md:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]";
  const rowInner =
    "relative flex min-h-[5.5rem] flex-row items-center gap-2 p-3 sm:min-h-[6.75rem] sm:gap-3 sm:p-4 md:min-h-[4.5rem]";

  return (
    <button type="button" onClick={onClick} className={cn(cardShell, colors)}>
      <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-white/20 blur-2xl" />
      <div className={rowInner}>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl",
            iconWrap,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] font-black leading-tight tracking-tight sm:text-[17px] md:text-[18px]",
              textColor,
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11px] font-semibold sm:text-[12px]",
              subTextColor,
            )}
          >
            {countLabel}
          </p>
        </div>
        <ChevronRight className="ml-auto h-6 w-6 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export function NavTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1.5 text-[12px] font-medium tracking-tight transition-all duration-200 shrink-0",
        active
          ? "text-white bg-gradient-to-b from-white/[0.22] to-white/[0.06] shadow-[0_1px_10px_rgba(0,0,0,0.35)] ring-1 ring-white/15"
          : "text-white/55 hover:text-white/95 hover:bg-white/[0.07]",
      )}
    >
      {label}
    </button>
  );
}

function MessageTile({
  msg,
  active,
  onClick,
  currentUserEmail,
  pillLayoutScope,
  listTone,
}: {
  msg: Message;
  active: boolean;
  onClick: () => void;
  currentUserEmail?: string;
  pillLayoutScope: "inbox" | "outbox";
  listTone: "sealed" | "opened";
}) {
  const title =
    pillLayoutScope === "outbox"
      ? emailsEqual(msg.recipientEmail, currentUserEmail)
        ? "致未來的自己"
        : `致 ${msg.recipientEmail?.split("@")[0] ?? "收件人"}`
      : emailsEqual(msg.senderEmail, currentUserEmail) &&
          emailsEqual(msg.recipientEmail, currentUserEmail)
        ? "致未來的自己"
        : `來自 ${msg.senderEmail?.split("@")[0] ?? "寄件人"}`;
  const schedShort = new Date(msg.scheduledAt).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
  });
  const recvShort =
    msg.createdAt != null
      ? new Date(msg.createdAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : schedShort;

  const scheduleBesideTitle =
    !msg.isDue &&
    (pillLayoutScope === "inbox"
      ? `預定開啟 ${schedShort}`
      : `預定 ${schedShort}`);
  const metaLine = `開啟 ${recvShort}`;

  const toSelfByAccount =
    Boolean(msg.recipientEmail) &&
    (emailsEqual(msg.recipientEmail, currentUserEmail) ||
      emailsEqual(msg.senderEmail, msg.recipientEmail));
  const showRecipientLine =
    pillLayoutScope === "outbox" &&
    Boolean(msg.recipientEmail) &&
    !toSelfByAccount;

  const statusChip = msg.isDue ? "拆開了" : "還沒拆";

  return (
    <div
      onClick={onClick}
      className={cn(
        "pl-2.5 pr-2 py-1.5 cursor-pointer rounded-lg transition-[background-color,box-shadow] duration-200 relative group overflow-hidden border-y border-r border-black/[0.05]",
        listTone === "sealed"
          ? "border-l-[3px] border-l-amber-400/90 bg-gradient-to-br from-amber-50/95 via-white/70 to-amber-100/35 hover:from-amber-50 hover:via-white/80 hover:to-amber-100/45"
          : "border-l-[3px] border-l-sky-500/90 bg-gradient-to-br from-sky-50/90 via-white/70 to-sky-100/35 hover:from-sky-50 hover:via-white/80 hover:to-sky-100/45",
        active
          ? cn(
              "shadow-sm ring-1 ring-black/[0.06] border-y-black/[0.06] border-r-black/[0.06]",
              listTone === "sealed"
                ? "border-l-amber-400 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/25"
                : "border-l-sky-500 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/25",
            )
          : null,
      )}
    >
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[13px] font-semibold tracking-tight text-apple-near-black truncate min-w-0 flex-1 leading-snug">
              {title}
            </h3>
            {scheduleBesideTitle ? (
              <span className="text-[10px] font-medium text-black/45 tabular-nums shrink-0 whitespace-nowrap">
                {scheduleBesideTitle}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-black/38 tabular-nums truncate mt-0.5 leading-tight">
            {metaLine}
          </p>
          {showRecipientLine ? (
            <p
              className="text-[10px] text-black/40 mt-0.5 truncate"
              title={msg.recipientEmail}
            >
              寄給 {msg.recipientEmail}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center self-center">
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-1 rounded-md text-center leading-tight max-w-[4.5rem]",
              msg.isDue
                ? "bg-gradient-to-b from-sky-100/95 to-sky-50/85 text-sky-800/90 ring-1 ring-sky-200/60"
                : "bg-gradient-to-b from-amber-100/95 to-amber-50/85 text-amber-900/85 ring-1 ring-amber-200/60",
            )}
          >
            {statusChip}
          </span>
        </div>
      </div>

      {active && (
        <motion.div
          layoutId={`active-pill-${pillLayoutScope}-${listTone}`}
          className={cn(
            "absolute left-0 top-[10%] bottom-[10%] w-0.5 rounded-r-full",
            listTone === "sealed" ? "bg-amber-500" : "bg-sky-500",
          )}
        />
      )}
    </div>
  );
}

export function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-semibold text-black/35 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[13px] font-medium tracking-tight text-apple-near-black truncate">
        {value}
      </span>
    </div>
  );
}
