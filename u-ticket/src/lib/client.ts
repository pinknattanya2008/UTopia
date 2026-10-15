/** ตัวช่วยฝั่ง client: type ของ response และฟังก์ชันจัดรูปแบบ */
import type { AiSource, Mission, PublicUser, ScoreBreakdown, TierName, Transaction, TrustAssessment } from "./types";

export type ListUser = PublicUser & { tier: TierName; finalScore: number };

export type ScoreDetail = ScoreBreakdown & {
  presaleBoost: number;
  user: PublicUser;
  trust: TrustAssessment;
  trustSource: AiSource;
  flags: { code: string; label: string; detail: string }[];
  totalTxCount30d: number;
  nextTier: { tier: TierName; pointsNeeded: number } | null;
  tierLeadMinutes: number;
  recentTransactions: Transaction[];
};

export type MissionsResponse = { missions: Mission[]; source: AiSource; notice?: string };
export type ExplainResponse = { explanation: string; source: AiSource; notice?: string };

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const fmtTHB = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

export const SOURCE_LABEL: Record<AiSource, string> = {
  ai: "วิเคราะห์โดย AI",
  cache: "AI (ผลที่บันทึกไว้)",
  fallback: "คำนวณพื้นฐาน",
};
