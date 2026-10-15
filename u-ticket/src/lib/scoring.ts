/**
 * สูตร Fan Score (Build Spec หัวข้อ 6) — คำนวณด้วยโค้ด ไม่ใช้ AI
 * หลักการ: นับความถี่ ไม่นับยอดเงิน, AI เป็นตัวปรับ trustMultiplier เท่านั้น
 * ไฟล์นี้ต้องไม่มี value import (ใช้ได้ทั้งใน Next.js และ node scripts)
 */
import type { ScoreBreakdown, TierName, Transaction, UCenterPackage, User } from "./types";

export const WINDOW_DAYS = 30;
/** วันแรกและวันสุดท้ายของช่วงข้อมูล (เวลาไทย) — 30 วันก่อนเปิดขาย 16 ต.ค. 2026 */
export const WINDOW_START = "2026-09-16";
export const WINDOW_END = "2026-10-15";

const BKK_OFFSET_MS = 7 * 3600_000;

/** วันที่ตามเวลาไทย (YYYY-MM-DD) */
export function bangkokDay(iso: string): string {
  return new Date(new Date(iso).getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

/** รายการวันที่ทั้ง 30 วันในช่วงข้อมูล เรียงจากเก่าไปใหม่ */
export function windowDays(): string[] {
  const start = Date.parse(`${WINDOW_START}T00:00:00Z`);
  return Array.from({ length: WINDOW_DAYS }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10));
}

export const UCENTER_SCORE: Record<UCenterPackage, number> = {
  None: 0,
  Bronze: 20,
  Silver: 40,
  Gold: 60,
  Platinum: 80,
  Diamond: 100,
};

export const TIERS: { name: TierName; min: number; leadMinutes: number; emoji: string; label: string }[] = [
  { name: "Diamond", min: 80, leadMinutes: 120, emoji: "💎", label: "เข้าคิวก่อน 2 ชั่วโมง" },
  { name: "Gold", min: 60, leadMinutes: 60, emoji: "🥇", label: "เข้าคิวก่อน 1 ชั่วโมง" },
  { name: "Silver", min: 40, leadMinutes: 30, emoji: "🥈", label: "เข้าคิวก่อน 30 นาที" },
  { name: "General", min: 0, leadMinutes: 0, emoji: "🎟️", label: "เปิดขายทั่วไป" },
];

export function tierFor(finalScore: number): TierName {
  return (TIERS.find((t) => finalScore >= t.min) ?? TIERS[TIERS.length - 1]).name;
}

export function tierInfo(name: TierName) {
  return TIERS.find((t) => t.name === name)!;
}

/** Tier ถัดไปและคะแนนที่ยังขาด (null ถ้าเป็น Diamond แล้ว) */
export function nextTier(finalScore: number): { tier: TierName; pointsNeeded: number } | null {
  const higher = [...TIERS].reverse().find((t) => t.min > finalScore);
  if (!higher) return null;
  return { tier: higher.name, pointsNeeded: round1(higher.min - finalScore) };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 6.1 กรองธุรกรรมที่นับ */
export function filterValidTransactions(txs: Transaction[]): Transaction[] {
  const sorted = [...txs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const perDay = new Map<string, number>();
  const upayPairPerDay = new Set<string>();
  const valid: Transaction[] = [];
  for (const t of sorted) {
    if (t.type === "self_transfer") continue; // ไม่นับโอนเข้ากระเป๋าตัวเอง
    if (t.amountTHB < 20) continue; // กันรายการจิ๋ว
    const day = bangkokDay(t.timestamp);
    if (day < WINDOW_START || day > WINDOW_END) continue;
    if (t.type === "upay_transfer") {
      const key = `${day}|${t.counterpartyId}`;
      if (upayPairPerDay.has(key)) continue; // โอนหาคนเดิม นับได้ 1 ครั้ง/วัน
      upayPairPerDay.add(key);
    }
    const n = perDay.get(day) ?? 0;
    if (n >= 5) continue; // สูงสุด 5 รายการ/วัน
    perDay.set(day, n + 1);
    valid.push(t);
  }
  return valid;
}

/** จำนวนวันติดต่อกันที่มีธุรกรรมที่นับ นับย้อนจากวันสุดท้ายของช่วงข้อมูล */
export function currentStreak(activeDays: Set<string>): number {
  const days = windowDays();
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && activeDays.has(days[i]); i--) streak++;
  return streak;
}

/**
 * 6.2–6.4 คำนวณ ScoreBreakdown
 * @param trustMultiplier จาก AI (หัวข้อ 7) หรือ fallback จากกฎ
 * @param presaleBoost คะแนนพิเศษจากการแลกแต้ม Presale Boost (รีวอร์ด r3) — บวกหลังคูณ trust
 */
export function computeScore(
  user: Pick<User, "uCenterPackage">,
  txs: Transaction[],
  trustMultiplier: number,
  presaleBoost = 0,
): ScoreBreakdown & { presaleBoost: number } {
  const valid = filterValidTransactions(txs);
  const activeDays = new Set(valid.map((t) => bangkokDay(t.timestamp)));
  const streak = currentStreak(activeDays);

  const categories = new Set(valid.filter((t) => t.merchantCategory).map((t) => t.merchantCategory));
  const types = new Set(valid.map((t) => t.type));
  const merchants = new Set(valid.filter((t) => t.merchant).map((t) => t.merchant));

  const frequency = Math.min(valid.length / 60, 1) * 100;
  const consistency = (activeDays.size / 30) * 70 + Math.min(streak / 14, 1) * 30;
  const diversity =
    Math.min(categories.size / 5, 1) * 50 + Math.min(types.size / 3, 1) * 30 + Math.min(merchants.size / 15, 1) * 20;
  const uCenter = UCENTER_SCORE[user.uCenterPackage];

  const baseScore = frequency * 0.4 + consistency * 0.25 + diversity * 0.2 + uCenter * 0.15;
  const trust = Math.min(1, Math.max(0, trustMultiplier));
  const finalScore = Math.min(100, round1(baseScore * trust + presaleBoost));

  return {
    frequency: round1(frequency),
    consistency: round1(consistency),
    diversity: round1(diversity),
    uCenter,
    baseScore: round1(baseScore),
    trustMultiplier: trust,
    finalScore,
    tier: tierFor(finalScore),
    currentStreakDays: streak,
    validTxCount30d: valid.length,
    presaleBoost,
  };
}
