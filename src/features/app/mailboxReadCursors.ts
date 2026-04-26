import type { Message } from "./types";

const PREFIX = "youshuo_mailbox_read_";

export type MailboxReadStored = {
  inboxWatermarkMs: number;
  outboxWatermarkMs: number;
};

export function loadMailboxRead(
  identityHex: string,
): MailboxReadStored | null {
  try {
    const raw = localStorage.getItem(PREFIX + identityHex);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, number>;
    if (
      typeof o.inboxWatermarkMs !== "number" ||
      typeof o.outboxWatermarkMs !== "number" ||
      Number.isNaN(o.inboxWatermarkMs) ||
      Number.isNaN(o.outboxWatermarkMs)
    ) {
      return null;
    }
    return {
      inboxWatermarkMs: o.inboxWatermarkMs,
      outboxWatermarkMs: o.outboxWatermarkMs,
    };
  } catch {
    return null;
  }
}

export function saveMailboxRead(
  identityHex: string,
  s: MailboxReadStored,
): void {
  localStorage.setItem(
    PREFIX + identityHex,
    JSON.stringify(s),
  );
}

export function messageCreatedMs(m: Message): number {
  const t = new Date(m.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function maxCreatedMs(msgs: readonly Message[]): number {
  let m = 0;
  for (const x of msgs) {
    const t = messageCreatedMs(x);
    if (t > m) m = t;
  }
  return m;
}
