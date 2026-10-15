/**
 * ตรวจความผิดปกติชั้น 1: กฎในโค้ด (Build Spec หัวข้อ 7) — เร็ว ฟรี ใช้ทุกครั้ง
 * ผลลัพธ์ส่งให้ AI เป็นข้อมูลประกอบ และใช้เป็น fallback เมื่อเรียก AI ไม่ได้
 * ไฟล์นี้ต้องไม่มี value import จาก lib อื่นนอกจาก scoring.ts (ใช้ได้ทั้งใน Next.js และ node scripts)
 */
import type { Transaction, TrustAssessment, User } from "./types";
import { bangkokDay, filterValidTransactions, windowDays, currentStreak } from "./scoring.ts";

export type FlagCode =
  | "circular_transfers"
  | "self_transfer_heavy"
  | "sudden_spike"
  | "fixed_interval"
  | "identical_amounts"
  | "single_merchant"
  | "no_fan_history";

export interface Flag {
  code: FlagCode;
  label: string; // ภาษาไทย สั้น ใช้แสดงบนหน้าเว็บ
  detail: string; // ตัวเลขประกอบ
}

const HOUR_MS = 3600_000;

const LABELS: Record<FlagCode, string> = {
  circular_transfers: "โอนเงินวนไปกลับกับบัญชีเดิมซ้ำ ๆ",
  self_transfer_heavy: "โอนเข้ากระเป๋าตัวเองบ่อยผิดปกติ",
  sudden_spike: "จำนวนรายการพุ่งขึ้นผิดปกติช่วงก่อนเปิดขาย",
  fixed_interval: "ทำรายการเป็นช่วงเวลาเท่ากันเป๊ะแบบเครื่องจักร",
  identical_amounts: "ยอดเงินเท่ากันเกือบทุกรายการ",
  single_merchant: "ใช้จ่ายกับร้านเดียวเกือบทั้งหมด",
  no_fan_history: "ไม่มีประวัติการเป็นแฟนเพลง",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** @param txOf ฟังก์ชันดึงธุรกรรมของผู้ใช้อื่น (ใช้ตรวจการโอนวน) */
export function computeFlags(
  user: Pick<User, "fanSignals" | "joinedAt">,
  txs: Transaction[],
  txOf: (userId: string) => Transaction[],
): Flag[] {
  const flags: Flag[] = [];
  const add = (code: FlagCode, detail: string) => flags.push({ code, label: LABELS[code], detail });
  const total = txs.length;
  const sorted = [...txs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // circular_transfers: A→B แล้ว B→A ภายใน 1 ชั่วโมง ≥ 5 ครั้ง
  let circular = 0;
  const partners = new Set<string>();
  for (const t of sorted) {
    if (t.type !== "upay_transfer" || !t.counterpartyId) continue;
    const time = Date.parse(t.timestamp);
    const back = txOf(t.counterpartyId).some(
      (r) =>
        r.type === "upay_transfer" &&
        r.counterpartyId === t.userId &&
        Math.abs(Date.parse(r.timestamp) - time) <= HOUR_MS,
    );
    if (back) {
      circular++;
      partners.add(t.counterpartyId);
    }
  }
  if (circular >= 5) add("circular_transfers", `${circular} ครั้งใน 30 วัน กับ ${[...partners].join(", ")}`);

  // self_transfer_heavy: self_transfer > 30%
  const selfCount = txs.filter((t) => t.type === "self_transfer").length;
  if (total > 0 && selfCount / total > 0.3) add("self_transfer_heavy", `${selfCount}/${total} รายการ (${pct(selfCount / total)})`);

  // sudden_spike: 5 วันล่าสุด > 4 เท่าของค่าเฉลี่ย 25 วันก่อนหน้า (นับเฉพาะวันที่บัญชีเปิดแล้ว)
  const days = windowDays();
  const perDay = new Map<string, number>();
  for (const t of txs) perDay.set(bangkokDay(t.timestamp), (perDay.get(bangkokDay(t.timestamp)) ?? 0) + 1);
  const last5 = days.slice(-5).reduce((s, d) => s + (perDay.get(d) ?? 0), 0);
  const priorDays = days.slice(0, -5).filter((d) => d >= user.joinedAt);
  if (priorDays.length >= 5) {
    const priorAvg = priorDays.reduce((s, d) => s + (perDay.get(d) ?? 0), 0) / priorDays.length;
    const last5Avg = last5 / 5;
    if (last5 >= 10 && last5Avg > 4 * priorAvg) {
      add("sudden_spike", `5 วันล่าสุดเฉลี่ย ${last5Avg.toFixed(1)} รายการ/วัน เทียบกับ ${priorAvg.toFixed(1)} ก่อนหน้า`);
    }
  }

  // fixed_interval: ช่วงห่างระหว่างรายการ (ในรอบการใช้งานเดียวกัน < 1 ชม.) มี std < 5 วินาที
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (Date.parse(sorted[i].timestamp) - Date.parse(sorted[i - 1].timestamp)) / 1000;
    if (gap < 3600) gaps.push(gap);
  }
  if (gaps.length >= 10) {
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const std = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length);
    if (std < 5) add("fixed_interval", `ห่างกันเฉลี่ย ${Math.round(mean)} วินาที (std ${std.toFixed(1)} วินาที)`);
  }

  // identical_amounts: > 80% ยอดเท่ากัน
  if (total >= 10) {
    const amounts = new Map<number, number>();
    for (const t of txs) amounts.set(t.amountTHB, (amounts.get(t.amountTHB) ?? 0) + 1);
    const [topAmount, topCount] = [...amounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount / total > 0.8) add("identical_amounts", `${pct(topCount / total)} ของรายการเป็นยอด ${topAmount} บาท`);
  }

  // single_merchant: > 90% ของรายการเป็นร้านเดียว
  if (total >= 10) {
    const merchants = new Map<string, number>();
    for (const t of txs) if (t.merchant) merchants.set(t.merchant, (merchants.get(t.merchant) ?? 0) + 1);
    const top = [...merchants.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / total > 0.9) add("single_merchant", `${pct(top[1] / total)} ของรายการอยู่ที่ ${top[0]}`);
  }

  // no_fan_history
  if (user.fanSignals.pastConcertsAttended === 0 && user.fanSignals.artistQuizScore < 20) {
    add("no_fan_history", `ไปคอนเสิร์ต 0 ครั้ง, คะแนนควิซศิลปิน ${user.fanSignals.artistQuizScore}/100`);
  }

  return flags;
}

/** Fallback (หัวข้อ 7): trust = max(0.1, 1 - 0.25 × จำนวน flags) */
export function ruleBasedTrust(flags: Flag[]): TrustAssessment {
  const n = flags.length;
  return {
    trustMultiplier: n === 0 ? 1 : Math.max(0.1, 1 - 0.25 * n),
    riskLevel: n === 0 ? "low" : n === 1 ? "medium" : "high",
    isLikelyBot: flags.some((f) => f.code === "fixed_interval"),
    reasons: n === 0 ? ["ไม่พบพฤติกรรมผิดปกติจากการตรวจด้วยกฎพื้นฐาน"] : flags.slice(0, 3).map((f) => `${f.label} (${f.detail})`),
  };
}

/** สรุปสถิติ 30 วันสำหรับส่งให้ AI (ไม่มี persona) */
export function computeStats(user: Pick<User, "uCenterPackage" | "joinedAt" | "fanSignals">, txs: Transaction[]) {
  const valid = filterValidTransactions(txs);
  const allDays = new Set(txs.map((t) => bangkokDay(t.timestamp)));
  const validDays = new Set(valid.map((t) => bangkokDay(t.timestamp)));
  const byType: Record<string, number> = {};
  for (const t of txs) byType[t.type] = (byType[t.type] ?? 0) + 1;
  const count = (key: (t: Transaction) => string | undefined) => {
    const m = new Map<string, number>();
    for (const t of txs) {
      const k = key(t);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5));
  };
  const amounts = txs.map((t) => t.amountTHB);
  return {
    joinedAt: user.joinedAt,
    uCenterPackage: user.uCenterPackage,
    fanSignals: user.fanSignals,
    totalTx30d: txs.length,
    validTxCount30d: valid.length,
    txByType: byType,
    activeDays30d: allDays.size,
    validActiveDays30d: validDays.size,
    currentStreakDays: currentStreak(validDays),
    uniqueMerchants: new Set(txs.filter((t) => t.merchant).map((t) => t.merchant)).size,
    uniqueCategories: new Set(txs.filter((t) => t.merchantCategory).map((t) => t.merchantCategory)).size,
    topMerchants: count((t) => t.merchant),
    topCounterparties: count((t) => t.counterpartyId),
    amountTHB: amounts.length
      ? { min: Math.min(...amounts), max: Math.max(...amounts), distinctValues: new Set(amounts).size }
      : null,
  };
}
