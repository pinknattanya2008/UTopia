/**
 * จำลองการเปิดขาย presale (Build Spec หัวข้อ 8)
 * 1) ประเมิน trust ทุกคนแบบขนาน (ใช้ cache) → 2) คำนวณ finalScore/Tier → 3) เรียงคิว → 4) AI สรุปผล
 */
import { aiEnabled, isOffline, summarizePresale } from "./ai";
import { demoCache, getConcert, getUserTransactions, getUsers, store } from "./data";
import { ensureAllTrust, type WithSource } from "./insights";
import { computeScore, tierInfo, TIERS } from "./scoring";
import type { AiSource, QueueEntry, TierName } from "./types";

export interface QueueRow extends QueueEntry {
  avatar: string;
  totalTx30d: number;
  baselineRank: number; // อันดับถ้าเรียงตามจำนวนธุรกรรมอย่างเดียว (ไม่มี AI)
  trustMultiplier: number;
  isLikelyBot: boolean;
}

/** บัญชีที่ถือว่าถูกคัดออก: trust ต่ำ หรือ AI ชี้ว่าเป็นบอท */
const isFlagged = (trust: number, bot: boolean) => bot || trust < 0.6;

export async function simulatePresale(concertId: string) {
  const concert = getConcert(concertId);
  if (!concert) return null;
  const users = getUsers();
  const trusts = await ensureAllTrust(users);
  const openAt = Date.parse(concert.salesOpenAt);

  const rows = users.map((u, i) => {
    const trust = trusts[i].value;
    const txs = getUserTransactions(u.id);
    const s = computeScore(u, txs, trust.trustMultiplier, u.presaleBoost);
    const flagged = isFlagged(trust.trustMultiplier, trust.isLikelyBot);
    const entry = openAt - tierInfo(s.tier).leadMinutes * 60_000;
    return {
      userId: u.id,
      displayName: u.displayName,
      avatar: u.avatar,
      finalScore: s.finalScore,
      tier: s.tier,
      entryMs: entry,
      flagged,
      flagReason: flagged ? trust.reasons[0] : undefined,
      totalTx30d: txs.length,
      trustMultiplier: trust.trustMultiplier,
      isLikelyBot: trust.isLikelyBot,
    };
  });

  const baseline = [...rows].sort((a, b) => b.totalTx30d - a.totalTx30d).map((r) => r.userId);
  const queue: QueueRow[] = [...rows]
    .sort((a, b) => a.entryMs - b.entryMs || b.finalScore - a.finalScore)
    .map(({ entryMs, ...r }, i) => ({
      ...r,
      rank: i + 1,
      entryTime: new Date(entryMs).toISOString(),
      baselineRank: baseline.indexOf(r.userId) + 1,
    }));

  const byTier = Object.fromEntries(TIERS.map((t) => [t.name, queue.filter((q) => q.tier === t.name).length])) as Record<
    TierName,
    number
  >;
  const flagged = queue.filter((q) => q.flagged);
  const stats = {
    total: queue.length,
    flagged: flagged.length,
    bots: flagged.filter((q) => q.isLikelyBot).length,
    farmers: flagged.filter((q) => !q.isLikelyBot).length,
    byTier,
    trustSources: countSources(trusts),
  };

  const summary = await getSummary(queue, stats);
  return { concertId, salesOpenAt: concert.salesOpenAt, queue, summary: summary.value, summarySource: summary.source, stats };
}

function countSources(trusts: WithSource<unknown>[]) {
  const out: Record<AiSource, number> = { ai: 0, cache: 0, fallback: 0 };
  for (const t of trusts) out[t.source]++;
  return out;
}

type Stats = { total: number; flagged: number; bots: number; farmers: number; byTier: Record<TierName, number> };

function fallbackSummary(stats: Stats, queue: QueueRow[]): string {
  const top = queue[0];
  const parts = [`ตรวจสอบ ${stats.total} บัญชี พบ ${stats.flagged} บัญชีที่มีพฤติกรรมผิดปกติ`];
  if (stats.flagged > 0) {
    parts[0] += ` (ปั๊มแต้ม/โอนวน ${stats.farmers} บัญชี, เข้าข่ายบอท ${stats.bots} บัญชี) ระบบลด Trust Multiplier และเลื่อนลงไปท้ายคิว`;
  }
  parts.push(
    `แฟนที่ใช้งานสม่ำเสมอได้เข้าคิวก่อนตาม Tier: Diamond ${stats.byTier.Diamond} คน, Gold ${stats.byTier.Gold} คน, Silver ${stats.byTier.Silver} คน โดย ${top.displayName} อยู่หัวคิว`,
  );
  return parts.join(" ");
}

async function getSummary(queue: QueueRow[], stats: Stats): Promise<WithSource<string>> {
  const key = queue.map((q) => `${q.userId}:${q.finalScore}:${q.flagged ? 1 : 0}`).join("|");
  const cached = store.summaries.get(key);
  if (cached) return cached;
  const fallback = { value: fallbackSummary(stats, queue), source: "fallback" as const };

  if (isOffline()) return demoCache.presaleSummary ? { value: demoCache.presaleSummary, source: "cache" } : fallback;
  if (!aiEnabled()) return fallback;

  try {
    const text = await summarizePresale({
      stats,
      top5: queue.slice(0, 5).map((q) => ({ rank: q.rank, displayName: q.displayName, tier: q.tier, finalScore: q.finalScore })),
      flaggedAccounts: queue
        .filter((q) => q.flagged)
        .map((q) => ({ rank: q.rank, trustMultiplier: q.trustMultiplier, isLikelyBot: q.isLikelyBot, reason: q.flagReason })),
    });
    if (!text) return fallback;
    const result = { value: text, source: "ai" as const };
    store.summaries.set(key, result);
    return result;
  } catch (err) {
    console.error("[ai] presale summary failed:", (err as Error).message);
    return fallback;
  }
}
