/**
 * ตรวจผลคะแนนของผู้ใช้จำลองทุกคน (ใช้ trust จาก fallback กฎ)
 * รัน: npm run check-scores
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Transaction, User } from "../src/lib/types.ts";
import { computeScore } from "../src/lib/scoring.ts";
import { computeFlags, ruleBasedTrust } from "../src/lib/flags.ts";

const dir = join(import.meta.dirname, "..", "data");
const users: User[] = JSON.parse(readFileSync(join(dir, "users.json"), "utf8"));
const txs: Transaction[] = JSON.parse(readFileSync(join(dir, "transactions.json"), "utf8"));
const txOf = (id: string) => txs.filter((t) => t.userId === id);

const rows = users.map((u) => {
  const mine = txOf(u.id);
  const flags = computeFlags(u, mine, txOf);
  const trust = ruleBasedTrust(flags);
  const s = computeScore(u, mine, trust.trustMultiplier);
  return {
    id: u.id,
    name: u.displayName,
    persona: u.persona,
    txTotal: mine.length,
    valid: s.validTxCount30d,
    streak: s.currentStreakDays,
    freq: s.frequency,
    cons: s.consistency,
    div: s.diversity,
    uc: s.uCenter,
    base: s.baseScore,
    trust: trust.trustMultiplier,
    final: s.finalScore,
    tier: s.tier,
    flags: flags.map((f) => f.code).join(",") || "-",
  };
});
console.table(rows);

const by = (p: string) => rows.filter((r) => r.persona === p);
const mind = rows.find((r) => r.id === "u01")!;
const shop = rows.find((r) => r.id === "u19")!;
const goldPlus = (t: string) => t === "Gold" || t === "Diamond";
const checks: [string, boolean][] = [
  ["true_fan ส่วนใหญ่ได้ Gold ขึ้นไป", by("true_fan").filter((r) => goldPlus(r.tier)).length > by("true_fan").length / 2],
  ["new_user อย่างน้อย 1 คนได้ Silver", by("new_user").some((r) => r.tier === "Silver")],
  ["farmer และ bot ทุกคนมี flag ≥ 1", [...by("farmer"), ...by("bot")].every((r) => r.flags !== "-")],
  ["farmer และ bot trust (fallback) < 0.5", [...by("farmer"), ...by("bot")].every((r) => r.trust < 0.5)],
  ["true_fan/regular/new_user ไม่มี flag", [...by("true_fan"), ...by("regular"), ...by("new_user")].every((r) => r.flags === "-")],
  [
    `ShopKing99 ธุรกรรมมากกว่ามายด์ (${shop.txTotal} > ${mind.txTotal}) แต่ finalScore ต่ำกว่า (${shop.final} < ${mind.final})`,
    shop.txTotal > mind.txTotal && shop.final < mind.final,
  ],
  [`มายด์ได้ Gold และ streak 18 วัน (${mind.tier}, ${mind.streak})`, mind.tier === "Gold" && mind.streak === 18],
];
let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "[PASS]" : "[FAIL]"} ${label}`);
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
