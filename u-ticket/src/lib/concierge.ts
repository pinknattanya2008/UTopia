/**
 * AI Concierge (Build Spec หัวข้อ 9.3) — stream จาก OpenAI, fallback เป็นคำตอบจากกฎที่ stream ทีละช่วงเหมือนกัน
 */
import { aiEnabled, isOffline, streamConcierge } from "./ai";
import { demoCache, getConcert, getRewards } from "./data";
import { getScore } from "./fan";
import { buildConciergePrompt } from "./prompts";
import { tierInfo } from "./scoring";
import type { Reward, User } from "./types";

export type ChatMessage = { role: "user" | "assistant"; content: string };


function context(user: User) {
  const concert = getConcert("c1")!;
  const { score } = getScore(user);
  const lead = tierInfo(score.tier).leadMinutes;
  const affordable = getRewards().filter((r) => r.costPoints <= user.points);
  return { concert, score, lead, affordable };
}

/** ส่วนลดที่ดีที่สุดที่แต้มพอแลก (ดูจากชื่อรีวอร์ด "ส่วนลดค่าบัตร N บาท") */
function bestDiscount(affordable: Reward[]) {
  return affordable
    .filter((r) => r.type === "discount")
    .map((r) => ({ reward: r, amount: Number(r.name.match(/([\d,]+)\s*บาท/)?.[1]?.replace(/,/g, "") ?? 0) }))
    .sort((a, b) => b.amount - a.amount)[0];
}

/** คำตอบจากกฎ เมื่อเรียก AI ไม่ได้ */
export function ruleBasedAnswer(user: User, messages: ChatMessage[]): string {
  const q = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const { concert, score, lead, affordable } = context(user);
  const tierLine =
    lead > 0
      ? `คุณอยู่ Tier ${score.tier} เข้าคิวก่อนรอบทั่วไป ${lead} นาที โอกาสได้โซนที่ต้องการค่อนข้างดี แต่ยังขึ้นกับจำนวนบัตรและคนในคิว ไม่การันตี 100%`
      : `ตอนนี้คุณอยู่ Tier General เข้าคิวพร้อมรอบขายทั่วไป ลองทำ AI Missions เพื่อเพิ่ม Fan Score ให้ได้รอบที่เร็วขึ้น`;

  if (/facebook|fb|เฟซ|นอกระบบ|ถูกกว่า|โอนก่อน|ไลน์|line|ขายต่อ|รีเซล/i.test(q)) {
    return [
      "⚠️ ไม่แนะนำให้ซื้อบัตรนอกระบบครับ บัตรที่ขายใน Facebook หรือให้โอนเงินก่อนมีความเสี่ยงสูงที่จะเป็นมิจฉาชีพหรือบัตรปลอม และถ้าโดนโกงมักตามเงินคืนไม่ได้",
      "ถ้าบัตรหมด แนะนำใช้ตลาดขายต่อใน U-Ticket ซึ่งขายได้ไม่เกินราคาหน้าบัตร และโอนสิทธิ์ผ่านระบบอย่างปลอดภัย",
      tierLine,
    ].join("\n\n");
  }

  const budgetMatch = q.replace(/,/g, "").match(/(\d{3,6})/);
  const discount = bestDiscount(affordable);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    const off = discount?.amount ?? 0;
    const zones = [...concert.zones].sort((a, b) => b.priceTHB - a.priceTHB);
    const fit = zones.find((z) => z.priceTHB - off <= budget);
    if (!fit) {
      const cheapest = zones[zones.length - 1];
      return `งบ ${budget.toLocaleString("th-TH")} บาทยังไม่พอสำหรับโซนที่ถูกที่สุด (${cheapest.name} ${cheapest.priceTHB.toLocaleString("th-TH")} บาท) ลองเก็บแต้มเพิ่มเพื่อแลกส่วนลดค่าบัตรนะครับ\n\n${tierLine}`;
    }
    const lines = [`แนะนำ ${fit.name} ราคา ${fit.priceTHB.toLocaleString("th-TH")} บาท — ${fit.view}`];
    if (discount && fit.priceTHB > budget) {
      lines.push(
        `คุณมี ${user.points.toLocaleString("th-TH")} แต้ม แลก "${discount.reward.name}" (${discount.reward.costPoints} แต้ม) แล้วจ่ายเหลือ ${(fit.priceTHB - discount.amount).toLocaleString("th-TH")} บาท อยู่ในงบพอดี`,
      );
    } else if (discount) {
      lines.push(
        `ถ้าแลก "${discount.reward.name}" (${discount.reward.costPoints} แต้ม) จะจ่ายเหลือ ${(fit.priceTHB - discount.amount).toLocaleString("th-TH")} บาท`,
      );
    }
    const cheaper = zones.find((z) => z.priceTHB < fit.priceTHB);
    if (cheaper) lines.push(`ถ้าอยากประหยัดกว่านี้ ${cheaper.name} (${cheaper.priceTHB.toLocaleString("th-TH")} บาท) — ${cheaper.view}`);
    lines.push(tierLine);
    return lines.join("\n\n");
  }

  return [
    `${concert.title} มี 4 โซน: ${concert.zones.map((z) => `${z.name} ${z.priceTHB.toLocaleString("th-TH")} บาท`).join(", ")}`,
    "บอกงบและสิ่งที่อยากได้ เช่น “งบ 5,000 อยากเห็นเวทีชัด” แล้วผมจะช่วยเลือกโซนให้ครับ",
    tierLine,
  ].join("\n\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** stream ข้อความที่มีอยู่แล้วทีละช่วง ให้ UI ดูเหมือนพิมพ์สด */
async function* typeOut(text: string): AsyncGenerator<string> {
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 3) {
    yield chars.slice(i, i + 3).join("");
    await sleep(18);
  }
}

export async function* conciergeStream(user: User, messages: ChatMessage[]): AsyncGenerator<string> {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";

  if (isOffline()) {
    const cached = demoCache.concierge[`${user.id}|${last}`];
    yield* typeOut(cached ?? ruleBasedAnswer(user, messages));
    return;
  }
  if (!aiEnabled()) {
    yield* typeOut(ruleBasedAnswer(user, messages));
    return;
  }

  const { concert, score, lead, affordable } = context(user);
  const instructions = buildConciergePrompt({
    concert,
    displayName: user.displayName,
    tier: score.tier,
    leadMinutes: lead,
    points: user.points,
    affordableRewards: affordable,
  });
  let sent = false;
  try {
    for await (const delta of streamConcierge(instructions, messages.slice(-10))) {
      sent = true;
      yield delta;
    }
    if (!sent) yield* typeOut(ruleBasedAnswer(user, messages));
  } catch (err) {
    console.error("[ai] concierge failed:", (err as Error).message);
    if (!sent) yield* typeOut(ruleBasedAnswer(user, messages));
    else yield "\n\n(AI กำลังยุ่ง ข้อความอาจไม่ครบ)";
  }
}
