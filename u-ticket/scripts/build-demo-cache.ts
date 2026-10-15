/**
 * บันทึกผล AI ทั้งหมดลง data/demo-cache.json สำหรับโหมด DEMO_OFFLINE=1
 *
 * วิธีใช้:
 *   1) ใส่ OPENAI_API_KEY ใน .env.local แล้วรัน `npm run dev` (หรือ build + start)
 *   2) อีก terminal: `npm run build-demo-cache`  (เปลี่ยน server ด้วย BASE_URL=http://host:port)
 *      สคริปต์ล็อกอินด้วยบัญชีเดโม (ต้องเปิด DEMO_LOGIN=1): แอดมินสำหรับ trust/explain/missions, ผู้ซื้อสำหรับ Concierge
 *   3) commit data/demo-cache.json แล้วเปิดแอปด้วย DEMO_OFFLINE=1 เมื่อเน็ตในงานมีปัญหา
 *
 * เก็บเฉพาะผลที่มาจาก AI จริง (source = "ai") ผลจาก fallback จะไม่ถูกบันทึก
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const file = join(import.meta.dirname, "..", "data", "demo-cache.json");
const SAMPLE_QUESTIONS = ["งบ 5,000 อยากเห็นเวทีชัด", "มีคนขายบัตรใน Facebook ถูกกว่า ซื้อดีไหม", "งบ 2,000 ไปกับเพื่อน"];
const CONCIERGE_USERS = ["u01", "u19"];

/** ล็อกอินบัญชีเดโมผ่าน /api/auth/demo แล้วคืน cookie ของ session */
async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status} (เปิด DEMO_LOGIN=1 และรัน npm run db:seed แล้วหรือยัง)`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

let cookie = "";

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

type Src = { source: string };

const accounts = (await fetch(`${BASE}/api/users`).then((r) => r.json())) as { id: string; email: string; role: string; displayName: string }[];
const users = accounts.filter((a) => a.role === "buyer");
const emailOf = (id: string) => accounts.find((a) => a.id === id)?.email ?? "";
cookie = await login(emailOf("admin"));
console.log(`server ${BASE}: ${users.length} users`);

const cache = JSON.parse(readFileSync(file, "utf8"));
cache.trust ??= {};
cache.explain ??= {};
cache.missions ??= {};
cache.concierge ??= {};
let aiCount = 0;
let skipped = 0;

// trust ทุกคน (force = ประเมินใหม่)
await Promise.all(
  users.map(async (u) => {
    const { source, notice: _n, ...trust } = await post<Src & Record<string, unknown>>(`/api/trust/${u.id}`, { force: true });
    void _n;
    if (source === "ai") {
      cache.trust[u.id] = trust;
      aiCount++;
    } else skipped++;
  }),
);
console.log(`trust: ${aiCount} ai, ${skipped} fallback`);

// explain + missions ทุกคน (ทีละ 6 คน)
for (let i = 0; i < users.length; i += 6) {
  await Promise.all(
    users.slice(i, i + 6).map(async (u) => {
      const e = await post<Src & { explanation: string }>(`/api/explain/${u.id}`);
      if (e.source === "ai") cache.explain[u.id] = e.explanation;
      const m = await post<Src & { missions: unknown[] }>(`/api/missions/${u.id}`);
      if (m.source === "ai") cache.missions[u.id] = m.missions;
      process.stdout.write(`${u.id}${e.source === "ai" && m.source === "ai" ? "+" : "."} `);
    }),
  );
}
console.log();

// สรุป presale
const sim = await post<{ summary: string; summarySource: string }>("/api/presale/simulate", { concertId: "c1" });
if (sim.summarySource === "ai") cache.presaleSummary = sim.summary;
console.log(`presale summary: ${sim.summarySource}`);

// Concierge: คำถามตัวอย่างของผู้ใช้เดโม (stream เป็นข้อความเต็ม) — บันทึกเฉพาะเมื่อ server เรียก AI ได้
for (const userId of aiCount > 0 ? CONCIERGE_USERS : []) {
  for (const q of SAMPLE_QUESTIONS) {
    const res = await fetch(`${BASE}/api/concierge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: await login(emailOf(userId)) },
      body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
    });
    cache.concierge[`${userId}|${q}`] = await res.text();
  }
}
console.log(`concierge: ${Object.keys(cache.concierge).length} answers`);

cache.generatedAt = new Date().toISOString();
cache.model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
writeFileSync(file, JSON.stringify(cache, null, 1) + "\n");
console.log(`saved → ${file}`);
if (aiCount === 0) console.warn("WARN: ไม่มีผลจาก AI เลย — ตรวจว่า server มี OPENAI_API_KEY และไม่ได้ตั้ง DEMO_OFFLINE=1");
