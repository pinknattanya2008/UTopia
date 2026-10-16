/** ตัวช่วยฝั่ง client: type ของ response และฟังก์ชันจัดรูปแบบ */
import type { AiSource, Mission, PublicUser, ScoreBreakdown, TierName, Transaction, TrustAssessment } from "./types";

export type ListUser = PublicUser & { tier: TierName; finalScore: number };

export type Role = "buyer" | "organizer" | "admin" | "staff";

/** บัญชีที่ล็อกอินอยู่ */
export interface Account {
  id: string;
  email: string | null;
  role: Role;
  organizerId: string | null;
  organizerName: string | null;
  displayName: string;
  avatar: string;
}

/** บัญชีเดโมสำหรับหน้าล็อกอิน/ปุ่มสลับบัญชี */
export interface DemoAccount {
  id: string;
  email: string | null;
  role: Role;
  displayName: string;
  avatar: string;
  tier: TierName | null;
  finalScore: number | null;
}

export const ROLE_LABEL: Record<Role, string> = { buyer: "ผู้ซื้อ", organizer: "ผู้จัดงาน", admin: "แอดมิน", staff: "Staff หน้างาน" };

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
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `${path} → ${res.status}`);
  }
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

/** ISO → "YYYY-MM-DDTHH:mm" ตามเวลาไทย (ใช้กับ DateTimePicker ในฟอร์มผู้จัด) */
export function toLocalInput(iso: string) {
  return new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" (เวลาไทย) → ISO */
export function fromLocalInput(v: string) {
  return new Date(`${v}:00+07:00`).toISOString();
}

export const fmtPct = (n: number) => `${(n * 100).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;
