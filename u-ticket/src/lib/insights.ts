/**
 * งานที่ใช้ AI: trust, explain, missions — พร้อม cache และ fallback (Build Spec หัวข้อ 7, 9, 12)
 * ลำดับการหาผล: cache ใน memory → (DEMO_OFFLINE) demo-cache.json → OpenAI → fallback จากกฎ
 */
import { aiEnabled, assessTrust, explainScore, generateMissions, isOffline } from "./ai";
import { demoCache, getUserTransactions, store } from "./data";
import { getFlags, getScore } from "./fan";
import { computeStats, ruleBasedTrust } from "./flags";
import { FORMULA_NOTE } from "./prompts";
import { bangkokDay, nextTier, round1, tierInfo } from "./scoring";
import type { AiSource, Mission, ScoreBreakdown, TrustAssessment, User } from "./types";

export const AI_BUSY_NOTICE = "AI กำลังยุ่ง แสดงผลจากการคำนวณพื้นฐานแทน";

export type WithSource<T> = { value: T; source: AiSource };

/** รวม promise ที่กำลังรอผลอยู่ ไม่ให้เรียก AI ซ้ำซ้อนสำหรับ key เดียวกัน */
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = store.inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => store.inflight.delete(key));
  store.inflight.set(key, p);
  return p;
}

// ---------------------------------------------------------------- Trust

/** ตัวอย่างธุรกรรม 40 รายการล่าสุด (เวลาไทย) สำหรับส่งให้ AI */
function recentTxSample(userId: string) {
  return [...getUserTransactions(userId)]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 40)
    .map((t) => ({
      type: t.type,
      amountTHB: t.amountTHB,
      merchant: t.merchant,
      merchantCategory: t.merchantCategory,
      counterpartyId: t.counterpartyId,
      time: new Date(Date.parse(t.timestamp) + 7 * 3600_000).toISOString().slice(0, 19).replace("T", " "),
    }));
}

/**
 * Guardrail: ให้ผล AI สอดคล้องกับหลักฐานจากกฎ
 * - ไม่มี flag เลย → trust ไม่ต่ำกว่า 0.8 (กัน AI กล่าวหาเกินข้อมูล)
 * - flag ≥ 2 ข้อ → trust ไม่เกิน 0.45 (หลักฐานชัดเจน)
 */
function applyGuardrail(ai: TrustAssessment, flagCount: number): TrustAssessment {
  if (flagCount === 0 && ai.trustMultiplier < 0.8) return { ...ai, trustMultiplier: 0.8, riskLevel: "low" };
  if (flagCount >= 2 && ai.trustMultiplier > 0.45) return { ...ai, trustMultiplier: 0.45, riskLevel: "high" };
  return ai;
}

export function ensureTrust(user: User, force = false): Promise<WithSource<TrustAssessment>> {
  const cached = store.trust.get(user.id);
  if (cached && !force) return Promise.resolve(cached);

  return dedupe(`trust:${user.id}`, async () => {
    const flags = getFlags(user);
    const fallback: WithSource<TrustAssessment> = { value: ruleBasedTrust(flags), source: "fallback" };

    if (isOffline()) {
      const c = demoCache.trust[user.id];
      if (!c) return fallback;
      const result: WithSource<TrustAssessment> = { value: c, source: "cache" };
      store.trust.set(user.id, result);
      return result;
    }
    if (!aiEnabled()) return fallback;

    try {
      const ai = await assessTrust({
        userId: user.id,
        stats30d: computeStats(user, getUserTransactions(user.id)),
        ruleFlags: flags.map((f) => ({ code: f.code, detail: f.detail })),
        recentTransactions: recentTxSample(user.id),
      });
      if (!ai) return fallback;
      const result: WithSource<TrustAssessment> = { value: applyGuardrail(ai, flags.length), source: "ai" };
      store.trust.set(user.id, result);
      return result;
    } catch (err) {
      console.error(`[ai] trust ${user.id} failed:`, (err as Error).message);
      return fallback;
    }
  });
}

/** ประเมิน trust ทุกคนแบบขนาน (pre-warm / presale) */
export function ensureAllTrust(users: User[]) {
  return Promise.all(users.map((u) => ensureTrust(u)));
}

// ---------------------------------------------------------------- Shared payload

const COMPONENT_LABEL: Record<"frequency" | "consistency" | "diversity" | "uCenter", string> = {
  frequency: "ความถี่การใช้งาน",
  consistency: "ความสม่ำเสมอ",
  diversity: "ความหลากหลาย",
  uCenter: "ระดับ U-center",
};

function topCategories(userId: string) {
  const m = new Map<string, number>();
  for (const t of getUserTransactions(userId)) {
    if (t.merchantCategory) m.set(t.merchantCategory, (m.get(t.merchantCategory) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ category: k, count: n }));
}

function scorePayload(user: User, score: ScoreBreakdown, trust: TrustAssessment) {
  return {
    displayName: user.displayName,
    uCenterPackage: user.uCenterPackage,
    scoreBreakdown: score,
    tier: score.tier,
    tierPresaleLeadMinutes: tierInfo(score.tier).leadMinutes,
    nextTier: nextTier(score.finalScore),
    trust: { trustMultiplier: trust.trustMultiplier, reasons: trust.reasons },
    activeDays30d: new Set(
      getUserTransactions(user.id).map((t) => bangkokDay(t.timestamp)),
    ).size,
    topMerchantCategories: topCategories(user.id),
    formula: FORMULA_NOTE,
  };
}

// ---------------------------------------------------------------- Explain

function fallbackExplanation(user: User, s: ScoreBreakdown, trust: TrustAssessment): string {
  const comps = (["frequency", "consistency", "diversity", "uCenter"] as const).map((k) => ({ k, v: s[k] }));
  const best = [...comps].sort((a, b) => b.v - a.v)[0];
  const worst = [...comps].sort((a, b) => a.v - b.v)[0];
  const info = tierInfo(s.tier);
  const next = nextTier(s.finalScore);
  const parts = [
    `${user.displayName} อยู่ Tier ${info.emoji} ${s.tier} ด้วย Fan Score ${s.finalScore} คะแนน (${info.label})`,
    `จุดแข็งคือ${COMPONENT_LABEL[best.k]} (${best.v}/100) ส่วนที่ควรพัฒนาคือ${COMPONENT_LABEL[worst.k]} (${worst.v}/100)`,
  ];
  if (next) {
    parts.push(
      `อีก ${next.pointsNeeded} คะแนนจะขึ้น ${next.tier} ลองใช้ U-Card จ่ายค่ากาแฟหรือค่าเดินทางทุกวันเพื่อเพิ่มความถี่และ streak`,
    );
  } else {
    parts.push("คุณอยู่ Tier สูงสุดแล้ว รักษาการใช้งานสม่ำเสมอไว้เพื่อคงสิทธิ์รอบถัดไป");
  }
  if (trust.trustMultiplier < 0.9) {
    parts.push(
      `ระบบปรับความน่าเชื่อถือเหลือ ×${trust.trustMultiplier} เพราะ${trust.reasons[0] ?? "พบรูปแบบการใช้งานผิดปกติ"} หากกลับมาใช้จ่ายในชีวิตประจำวันตามปกติ คะแนนจะกลับมาเต็ม`,
    );
  }
  return parts.join(" ");
}

export async function getExplanation(user: User): Promise<WithSource<string>> {
  const trust = await ensureTrust(user);
  const { score } = getScore(user);
  const key = `${user.id}:${score.finalScore}`;
  const cached = store.explain.get(key);
  if (cached) return cached;
  const fallback = { value: fallbackExplanation(user, score, trust.value), source: "fallback" as const };

  if (isOffline()) {
    const c = demoCache.explain[user.id];
    return c ? { value: c, source: "cache" } : fallback;
  }
  if (!aiEnabled()) return fallback;

  return dedupe(`explain:${key}`, async () => {
    try {
      const text = await explainScore(scorePayload(user, score, trust.value));
      if (!text) return fallback;
      const result = { value: text, source: "ai" as const };
      store.explain.set(key, result);
      return result;
    } catch (err) {
      console.error(`[ai] explain ${user.id} failed:`, (err as Error).message);
      return fallback;
    }
  });
}

// ---------------------------------------------------------------- Missions

function fallbackMissions(user: User, s: ScoreBreakdown, trust: TrustAssessment): Mission[] {
  const next = nextTier(s.finalScore);
  const t = trust.trustMultiplier;
  const impact = (basePts: number) => {
    const pts = round1(basePts * t);
    const tierNote = next && pts >= next.pointsNeeded ? ` (ช่วยขึ้น ${next.tier})` : next ? ` (เข้าใกล้ ${next.tier})` : "";
    return `+${pts} คะแนน${tierNote}`;
  };
  const txs = getUserTransactions(user.id);
  const cats = new Set(txs.map((x) => x.merchantCategory).filter(Boolean));
  const types = new Set(txs.filter((x) => x.type !== "self_transfer").map((x) => x.type));

  const freqGain = (n: number) => ((Math.min(s.validTxCount30d + n, 60) - Math.min(s.validTxCount30d, 60)) / 60) * 100 * 0.4;
  const streakGain = ((Math.min(s.currentStreakDays + 7, 14) - Math.min(s.currentStreakDays, 14)) / 14) * 30 * 0.25 + (7 / 30) * 70 * 0.25 * 0.3;

  const pool: (Mission & { prio: number })[] = [
    {
      title: "จ่ายค่ากาแฟด้วย U-Card 5 ครั้ง",
      description: "ใช้ U-Card จ่ายค่ากาแฟหรือขนมที่ซื้ออยู่แล้วทุกวัน สัปดาห์นี้ให้ครบ 5 ครั้ง",
      targetCount: 5,
      scoreImpact: impact(freqGain(5)),
      category: "frequency",
      prio: s.frequency,
    },
    {
      title: "ใช้ U-topia ต่อเนื่อง 7 วัน",
      description: "มีธุรกรรมอย่างน้อยวันละ 1 รายการ เช่น ค่าเดินทาง BTS/MRT เพื่อสร้าง streak 🔥",
      targetCount: 7,
      scoreImpact: impact(streakGain),
      category: "consistency",
      prio: s.consistency,
    },
    !cats.has("transport")
      ? {
          title: "จ่ายค่าเดินทางด้วย U-Card 2 ครั้ง",
          description: "ลองแตะจ่าย BTS/MRT หรือเรียก Grab ด้วย U-Card เพิ่มหมวดการใช้งานใหม่",
          targetCount: 2,
          scoreImpact: impact(2),
          category: "diversity",
          prio: s.diversity,
        }
      : !types.has("swap")
        ? {
            title: "ลอง swap ใน U-topia Wallet 1 ครั้ง",
            description: "แลกสินทรัพย์ในกระเป๋า เช่น USDT เป็นบาท เพิ่มประเภทการใช้งาน",
            targetCount: 1,
            scoreImpact: impact(2),
            category: "diversity",
            prio: s.diversity,
          }
        : {
            title: "ลองร้านใหม่ 3 ร้าน",
            description: "ใช้ U-Card กับร้านที่ไม่เคยจ่ายมาก่อน เช่น ร้านอาหารใกล้ที่ทำงาน",
            targetCount: 3,
            scoreImpact: impact(Math.min(3, 15 - Math.min(15, cats.size)) * (20 / 15) * 0.2 + 0.5),
            category: "diversity",
            prio: s.diversity,
          },
  ];
  return pool.sort((a, b) => a.prio - b.prio).map((m) => ({
    title: m.title,
    description: m.description,
    targetCount: m.targetCount,
    scoreImpact: m.scoreImpact,
    category: m.category,
  }));
}

export async function getMissions(user: User): Promise<WithSource<Mission[]>> {
  const trust = await ensureTrust(user);
  const { score } = getScore(user);
  const key = `${user.id}:${score.finalScore}`;
  const cached = store.missions.get(key);
  if (cached) return cached;
  const fallback = { value: fallbackMissions(user, score, trust.value), source: "fallback" as const };

  if (isOffline()) {
    const c = demoCache.missions[user.id];
    return c ? { value: c, source: "cache" } : fallback;
  }
  if (!aiEnabled()) return fallback;

  return dedupe(`missions:${key}`, async () => {
    try {
      const missions = await generateMissions(scorePayload(user, score, trust.value));
      if (!missions) return fallback;
      const result = { value: missions, source: "ai" as const };
      store.missions.set(key, result);
      return result;
    } catch (err) {
      console.error(`[ai] missions ${user.id} failed:`, (err as Error).message);
      return fallback;
    }
  });
}
