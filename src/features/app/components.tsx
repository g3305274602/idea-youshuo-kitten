import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  History,
  Inbox,
  LayoutDashboard,
  Lock,
  MessageCircle,
  MessageSquare,
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
import capsuleDrawFab from "../../assets/images/app/secret/capsule-draw-fab.png";
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
            ? "text-[#FFD54F]"
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
        "flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left transition-colors",
        "hover:bg-white/[0.06] active:bg-white/[0.08]",
        tone === "sealed" ? "text-[#fde68a]/90" : "text-sky-200/90",
      )}
    >
      <ChevronRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-white/40 transition-transform duration-200",
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
      <span className="text-[10px] font-medium tabular-nums text-white/45">
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
    <div className="space-y-0.5 px-0.5 pb-3">
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
          "ys-gold-glow group relative mx-auto max-w-[min(88vw,20rem)] shrink-0 select-none",
          "transition-transform",
          "origin-center  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90",
          "active:scale-[0.98] disabled:pointer-events-none",
          capPulled && "scale-[1.02]",
        )}
      >
        <img
          src={capsuleDrawFab}
          alt=""
          width={512}
          height={512}
          draggable={false}
          loading="eager"
          decoding="async"
          className={cn(
            "pointer-events-none mx-auto block h-auto w-full max-w-[min(72vw,16rem)] object-contain",
            "max-h-[min(52vw,15.5rem)] min-h-[9rem] sm:max-h-[15.5rem]",
            "drop-shadow-[0_10px_32px_rgba(0,0,0,0.5)] transition-[transform,filter] duration-300 ease-out",
            capPulled && "scale-[1.06] -rotate-2",
          )}
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
        "ys-gold-glow relative flex shrink-0 items-center justify-center rounded-[2rem] border border-white/25 bg-[#FFD54F] text-stone-900 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90 active:scale-95",
        hero
          ? "h-[10.25rem] w-[10.25rem] md:h-[9rem] md:w-[9rem]"
          : "h-[5.5rem] w-[5.5rem]",
      )}
    >
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 rounded-br-xl border-b border-r border-white/20 bg-[#ffe78a]/90"
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "ys-square-wall-item group",
        selected && "ys-square-wall-item--selected",
        "hover:brightness-[1.04] active:scale-[0.992]",
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
    <section className="ys-square-wall w-full p-3 md:p-4">
      <div className="ys-square-wall__glow" aria-hidden />
      <div className="ys-square-wall__glow2" aria-hidden />
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="ys-square-wall__head mb-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-[15px] font-black tracking-tight text-white">
                廣場牆
              </p>
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-200/90 tabular-nums">
                {postsSortedLength} 則
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-white/55">
              全站即時上牆的紙條 · 去看看吧
            </p>
          </div>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/35 to-fuchsia-600/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <MessageSquare
              className="h-5 w-5"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
      </button>
      {expanded ? (
        <div
          className={cn(
            "ys-square-wall__list relative z-[1] mt-1",
            expandedBodyMaxClass,
          )}
        >
          {postsVisible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-1 py-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.04] text-white/35">
                <Sparkles className="h-6 w-6" strokeWidth={2.2} aria-hidden />
              </span>
              <p className="max-w-xs text-[13px] font-semibold leading-relaxed text-white/55">
                {postsSortedLength === 0
                  ? "還沒有公開紙條。先丟一顆或等大家上牆吧。"
                  : "有貼文但尚未到預定開啟時間，晚點再來逛逛。"}
              </p>
            </div>
          ) : (
            <ul className="list-none space-y-2.5 p-0">
              {postsVisible.slice(0, maxListItems).map((p) => {
                const onWall = p.createdAt
                  .toDate()
                  .toLocaleString("zh-TW", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                const scheduled = p.snapshotScheduledAt
                  .toDate()
                  .toLocaleString("zh-TW", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                return (
                <li key={p.sourceMessageId}>
                  <SecretPaperListItem
                    selected={selectedSquarePostId === p.sourceMessageId}
                    onClick={() => onSelectPost(p.sourceMessageId)}
                  >
                    <div className="px-3.5 py-3 pl-3">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-bold text-white/45">
                        <span className="text-violet-200/60">
                          上牆 {onWall}
                        </span>
                        <span className="text-white/35">預定 {scheduled}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[14px] font-semibold leading-[1.55] text-white/95">
                        {p.snapshotContent.length > 120
                          ? `${p.snapshotContent.slice(0, 120)}…`
                          : p.snapshotContent}
                      </p>
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
                          <p className="mt-1.5 line-clamp-1 text-[11px] text-white/50">
                            {line}
                          </p>
                        ) : (
                          <p className="mt-1.5 line-clamp-1 text-[11px] text-white/40">
                            寄件人／收件人未公開
                          </p>
                        );
                      })()}

                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSpace(
                              p.publisherAccountId,
                              p.snapshotPublisherName,
                              p.snapshotPublisherGender,
                              p.snapshotPublisherBirthDate,
                            );
                          }}
                          className="flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 pl-1 pr-2 py-0.5 text-left transition hover:bg-violet-500/20"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-fuchsia-500/30 to-violet-600/20 text-white/90">
                            <User className="h-3.5 w-3.5" strokeWidth={2.3} />
                          </span>
                          <span className="min-w-0 truncate text-[11px] font-black text-violet-100/95">
                            {p.snapshotPublisherName || "神秘用戶"}
                          </span>
                          <GenderIcon gender={p.snapshotPublisherGender} />
                        </button>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 px-1.5 py-0.5 text-[10px] font-black text-amber-200/80 tabular-nums">
                            <ThumbsUp
                              className="h-3 w-3 text-amber-300/90"
                              strokeWidth={2.4}
                              aria-hidden
                            />
                            {(() => {
                              const rc = reactionCountsByPost.get(
                                p.sourceMessageId,
                              );
                              return (
                                (rc?.up ?? 0) +
                                (rc?.mid ?? 0) +
                                (rc?.down ?? 0)
                              );
                            })()}
                          </span>
                          {p.repliesPublic ? (
                            <span className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 px-1.5 py-0.5 text-[10px] font-black text-sky-200/85 tabular-nums">
                              <MessageCircle
                                className="h-3 w-3 text-sky-300/90"
                                strokeWidth={2.4}
                                aria-hidden
                              />
                              {
                                (commentsByPost.get(p.sourceMessageId) ?? [])
                                  .length
                              }
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </SecretPaperListItem>
                </li>
                );
              })}
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
    <div className="ys-mine-profile-card p-4 text-white">
      <div className="relative flex gap-3">
        <button
          type="button"
          onClick={onOpenActions}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left transition-colors hover:bg-white/[0.04]"
        >
          <div className="ys-mine-avatar-slot flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/50 to-[#ff85a2]/30">
            <User className="h-7 w-7" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="truncate text-[17px] font-black tracking-tight text-white">
              {user.displayName?.trim() ||
                user.email?.split("@")[0] ||
                "未命名"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-white/60">
              {user.email}
            </p>
            <p className="mt-1 text-[10px] font-bold text-white/50">
              {genderLabel} · {ageLine}
            </p>
          </div>
        </button>
      </div>
      <div className="relative mt-2.5 rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
            說說
          </p>
          <button
            type="button"
            onClick={onEditIntro}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold text-white/80 hover:bg-white/15"
          >
            <Pencil className="h-3 w-3" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {note ? (
          <p className="line-clamp-3 text-[11px] font-medium leading-snug text-white/75">
            {note}
          </p>
        ) : (
          <p className="text-[11px] font-medium text-white/40">
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
    "group relative overflow-hidden rounded-[24px] border text-left transition-transform active:scale-[0.99] max-md:shadow-[0_8px_32px_rgba(0,0,0,0.45)] md:rounded-[1.4rem] md:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)]";
  const rowInner =
    "relative flex min-h-[3.75rem]  gap-2 p-3 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-4 md:min-h-[4.5rem]";

  return (
    <div className="grid grid-cols-2 gap-3 px-1 py-1 md:grid-cols-1 md:space-y-3 md:px-0.5">
      <button
        type="button"
        onClick={() => onNavigate("inbox")}
        className={cn(
          cardShell,
          "col-span-1 border-[#FFD54F]/30 bg-[#1A1B22] ring-0 ring-[#FFD54F]/10 md:ring-1",
        )}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#FFD54F]/10 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD54F] to-amber-600 text-stone-900 shadow-md shadow-black/30 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <Inbox
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight tracking-tight text-white sm:text-[17px] md:text-[18px]">
              飄向我的
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#8E8E93] sm:text-[12px]">
              共 {inboxCount} 則
            </p>
          </div>
          <ChevronRight className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-[#FFD54F]/40 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("outbox")}
        className={cn(
          cardShell,
          "col-span-1 border-[#F06292]/25 bg-[#1A1B22] ring-0 ring-[#F06292]/10 md:ring-1",
        )}
      >
        <div className="pointer-events-none absolute -left-4 -bottom-8 h-28 w-28 rounded-full bg-[#F06292]/10 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F06292] to-rose-700 text-white shadow-md shadow-black/30 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <History
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight tracking-tight text-white sm:text-[17px] md:text-[18px]">
              我丟出的
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#8E8E93] sm:text-[12px]">
              共 {outboxCount} 則
            </p>
          </div>
          <ChevronRight className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-[#F06292]/50 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0" />
        </div>
      </button>

      <DashboardCard
        onClick={() => onNavigate("chat")}
        countLabel={`共 ${chatCount} 條可續聊`}
        title="聊聊記錄"
        colors="border-emerald-500/30 bg-[#1A1B22] ring-0 ring-emerald-500/10 md:col-span-1 md:ring-1"
        iconWrap="from-emerald-500 to-teal-600 text-white shadow-black/30 rotate-2"
        textColor="text-white"
        subTextColor="text-[#8E8E93]"
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
        colors="border-sky-400/25 bg-[#1A1B22] ring-0 ring-[#F06292]/10 md:col-span-1 md:ring-1"
        iconWrap="from-[#F06292] to-violet-600 text-white shadow-black/30 rotate-2"
        textColor="text-white"
        subTextColor="text-[#8E8E93]"
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
        colors="border-violet-400/30 bg-[#1A1B22] ring-0 ring-violet-500/10 md:col-span-1 md:ring-1"
        iconWrap="from-violet-500 to-fuchsia-600 text-white shadow-black/30 -rotate-3"
        textColor="text-white"
        subTextColor="text-[#8E8E93]"
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
        colors="border-sky-400/25 bg-[#1A1B22] ring-0 ring-sky-500/10 md:col-span-1 md:ring-1"
        iconWrap="from-sky-500 to-indigo-600 text-white shadow-black/30 rotate-1"
        textColor="text-white"
        subTextColor="text-[#8E8E93]"
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
          colors="border-emerald-500/40 bg-gradient-to-br from-[#0f1419] via-[#121319] to-emerald-950/40 ring-0 ring-emerald-500/20 md:col-span-1 md:ring-1 text-white"
          iconWrap="from-emerald-400 to-emerald-700 text-white -rotate-2"
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
          colors="border-rose-500/30 bg-[#1A1B22] ring-0 ring-rose-500/10 md:col-span-1 md:ring-1"
          iconWrap="from-rose-500 to-orange-600 text-white shadow-black/30 -rotate-2"
          textColor="text-white"
          subTextColor="text-[#8E8E93]"
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
    "group relative col-span-2 overflow-hidden rounded-[24px] border text-left transition-transform active:scale-[0.99] max-md:shadow-[0_8px_32px_rgba(0,0,0,0.45)] md:rounded-[1.4rem] md:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]";
  const rowInner =
    "relative flex min-h-[5.5rem] flex-row items-center gap-2 p-3 sm:min-h-[6.75rem] sm:gap-3 sm:p-4 md:min-h-[4.5rem]";

  return (
    <button type="button" onClick={onClick} className={cn(cardShell, colors)}>
      <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-[#FFD54F]/6 blur-2xl" />
      <div className={rowInner}>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl",
            iconWrap,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] font-bold leading-tight tracking-tight sm:text-[17px] md:text-[18px]",
              textColor,
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11px] font-medium sm:text-[12px]",
              subTextColor,
            )}
          >
            {countLabel}
          </p>
        </div>
        <ChevronRight className="ml-auto h-6 w-6 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
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
        "ys-topnav-navtab",
        active ? "ys-topnav-navtab--active" : "ys-topnav-navtab--inactive",
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
        "ys-tap-list-row group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 py-1.5 pl-2.5 pr-2 backdrop-blur-md transition-[background-color,box-shadow] duration-200",
        listTone === "sealed"
          ? "border-l-[3px] border-l-[#fbbf24] bg-amber-500/10 hover:bg-amber-500/15"
          : "border-l-[3px] border-l-sky-400/90 bg-sky-500/10 hover:bg-sky-500/15",
        active
          ? "ring-1 ring-inset ring-white/25"
          : null,
      )}
    >
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug tracking-tight text-white/95">
              {title}
            </h3>
            {scheduleBesideTitle ? (
              <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-white/50 tabular-nums">
                {scheduleBesideTitle}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-white/45 tabular-nums">
            {metaLine}
          </p>
          {showRecipientLine ? (
            <p
              className="mt-0.5 truncate text-[10px] text-white/50"
              title={msg.recipientEmail}
            >
              寄給 {msg.recipientEmail}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center self-center">
          <span
            className={cn(
              "max-w-[4.5rem] rounded-md px-1.5 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide",
              msg.isDue
                ? "bg-[#10b981]/20 text-[#6ee7b7] ring-1 ring-[#10b981]/40"
                : "bg-[#fbbf24]/15 text-[#fde68a] ring-1 ring-[#fbbf24]/35",
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
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8E8E93]">
        {label}
      </span>
      <span className="truncate text-[13px] font-medium tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}
