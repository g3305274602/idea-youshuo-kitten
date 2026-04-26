import { useEffect, useState } from "react";
import type { ScheduledMessage } from "../../module_bindings/types";
import { emailsEqual } from "../../lib/utils";
import type { Message, OpenedBroadcastItem } from "./types";

export function openedBroadcastFromMessage(
  m: Message,
  scope: "inbox" | "outbox",
  userEmail?: string,
): OpenedBroadcastItem {
  const openShort =
    m.createdAt != null
      ? new Date(m.createdAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date(m.scheduledAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
        });

  if (scope === "inbox") {
    const self =
      emailsEqual(m.senderEmail, userEmail) &&
      emailsEqual(m.recipientEmail, userEmail);
    const title = self
      ? "致未來的自己"
      : `來自 ${m.senderEmail?.split("@")[0] ?? "寄件人"}`;

    return {
      id: m._id,
      scope,
      title,
      subtitle: `剛到開啟時間 · 開啟 ${openShort}`,
    };
  }

  const title = emailsEqual(m.recipientEmail, userEmail)
    ? "致未來的自己"
    : `致 ${m.recipientEmail?.split("@")[0] ?? "收件人"}`;

  return {
    id: m._id,
    scope,
    title,
    subtitle: `剛到開啟時間 · 開啟 ${openShort}`,
  };
}

export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function scheduledRowToMessage(
  row: ScheduledMessage,
  opts: { now: Date; viewerEmail: string; isSender: boolean },
): Message {
  const isDue = row.scheduledAt.toDate() <= opts.now;

  return {
    _id: row.id,
    senderEmail: row.senderEmail,
    recipientEmail: row.recipientEmail,
    content: opts.isSender ? row.content : isDue ? row.content : null,
    scheduledAt: row.scheduledAt.toISOString(),
    isDue,
    isWaitListVisible: row.isWaitListVisible,
    createdAt: row.createdAt.toISOString(),
  };
}

export function compareMessagesRecentFirst(a: Message, b: Message): number {
  const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (bc !== ac) return bc - ac;

  const as = new Date(a.scheduledAt).getTime();
  const bs = new Date(b.scheduledAt).getTime();
  if (bs !== as) return bs - as;

  return String(b._id).localeCompare(String(a._id));
}

export function squareAddressSubtitle(
  showSender: boolean,
  showRecipient: boolean,
  senderEmail: string,
  recipientEmail: string,
  opts?: { sourceKind?: string; senderDisplayName?: string },
): string | null {
  if (opts?.sourceKind === "capsule") {
    const nick = (opts.senderDisplayName ?? "").trim();
    return nick || senderEmail || null;
  }

  const s = showSender ? senderEmail : "";
  const r = showRecipient ? recipientEmail : "";

  if (!s && !r) return null;
  if (s && r) return `${s} → ${r}`;
  if (s) return `FROM ${s}`;
  return `TO ${r}`;
}

export function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) return "已開啟";

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}天`);
      if (hours > 0) parts.push(`${hours}小時`);
      if (minutes > 0) parts.push(`${minutes}分`);
      parts.push(`${seconds}秒`);

      return parts.join(" ");
    };

    const timer = window.setInterval(
      () => setTimeLeft(calculateTimeLeft()),
      1000,
    );
    setTimeLeft(calculateTimeLeft());

    return () => window.clearInterval(timer);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
}
