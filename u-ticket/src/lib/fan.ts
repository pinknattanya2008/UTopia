/**
 * รวม data + scoring + flags + trust เป็นฟังก์ชันที่ API routes ใช้
 */
import { getAllTransactions, getUser, getUserTransactions, getUsers, store, toPublicUser, type AppUser } from "./data";
import { computeFlags, ruleBasedTrust, type Flag } from "./flags";
import { computeScore, nextTier, tierInfo } from "./scoring";
import type { AiSource, Transaction, TrustAssessment, User } from "./types";

export function getFlags(user: User): Flag[] {
  return computeFlags(user, getUserTransactions(user.id), getUserTransactions);
}

/** Trust จาก cache (AI) ถ้ามี ไม่งั้นใช้ fallback จากกฎ */
export function getTrust(user: User): { value: TrustAssessment; source: AiSource } {
  return store.trust.get(user.id) ?? { value: ruleBasedTrust(getFlags(user)), source: "fallback" };
}

export function getScore(user: User) {
  const trust = getTrust(user);
  const score = computeScore(user, getUserTransactions(user.id), trust.value.trustMultiplier, (user as Partial<AppUser>).presaleBoost ?? 0);
  return { score, trust };
}

/** ข้อมูลเต็มสำหรับหน้า Dashboard */
export function getScoreDetail(user: User) {
  const { score, trust } = getScore(user);
  const txs = getUserTransactions(user.id);
  const recent: Transaction[] = [...txs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
  return {
    ...score,
    user: toPublicUser(user),
    trust: trust.value,
    trustSource: trust.source,
    flags: getFlags(user),
    totalTxCount30d: txs.length,
    nextTier: nextTier(score.finalScore),
    tierLeadMinutes: tierInfo(score.tier).leadMinutes,
    recentTransactions: recent,
  };
}

export function listUsersWithScore() {
  return getUsers().map((u) => {
    const { score } = getScore(u);
    return { ...toPublicUser(u), tier: score.tier, finalScore: score.finalScore };
  });
}

export { getUser, getUsers, getAllTransactions };
