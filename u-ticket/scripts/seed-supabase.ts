/**
 * อัปโหลดข้อมูลจำลองขึ้น Supabase + สร้างบัญชีเดโมทุกแบบ (รันซ้ำได้)
 *
 *   npm run db:seed            # อัปเดตบัญชี/ผู้ใช้/ธุรกรรม/คอนตัวอย่าง/รีวอร์ด (ไม่ลบการจอง)
 *   npm run db:seed -- --reset # ล้างการจอง เช็คอิน การแลกแต้ม คอนที่สร้างเพิ่ม แล้วคืนแต้มตั้งต้น
 *
 * ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Concert, Reward, Transaction, User } from "../src/lib/types.ts";
import {
  buyerEmail,
  CONCERT_ORGANIZER,
  concertToRow,
  ORGANIZERS,
  rewardToRow,
  STAFF_ACCOUNTS,
  txToRow,
  userToProfileRow,
} from "../src/lib/mappers.ts";

const root = join(import.meta.dirname, "..");
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {
  /* ใช้ env จากเครื่องแทน */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !serviceKey || !password) {
  console.error("ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY และ DEMO_PASSWORD ใน .env.local");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const read = <T>(name: string): T => JSON.parse(readFileSync(join(root, "data", name), "utf8"));
const users = read<User[]>("users.json");
const transactions = read<Transaction[]>("transactions.json");
const concerts = read<Concert[]>("concerts.json");
const rewards = read<Reward[]>("rewards.json");

async function must<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/** หา auth user ตามอีเมล (สร้างใหม่ถ้าไม่มี, ตั้งรหัสผ่านเดโมใหม่ถ้ามีแล้ว) */
async function ensureAuthUsers(client: SupabaseClient, accounts: { email: string; name: string; role: string }[]) {
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }
  const ids = new Map<string, string>();
  for (const a of accounts) {
    const meta = { display_name: a.name, role: a.role };
    const found = existing.get(a.email);
    if (found) {
      const { error } = await client.auth.admin.updateUserById(found, { password, user_metadata: meta, email_confirm: true });
      if (error) throw new Error(`updateUser ${a.email}: ${error.message}`);
      ids.set(a.email, found);
    } else {
      const { data, error } = await client.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: meta });
      if (error) throw new Error(`createUser ${a.email}: ${error.message}`);
      ids.set(a.email, data.user.id);
    }
  }
  return ids;
}

async function main() {
  console.log(`Supabase: ${url}${reset ? " (reset)" : ""}`);

  await must("organizers", db.from("organizers").upsert(ORGANIZERS));
  await must("rewards", db.from("rewards").upsert(rewards.map(rewardToRow)));

  // ---- บัญชี: ผู้ซื้อ 24 คน + ผู้จัด 2 + แอดมิน + staff
  const accounts = [
    ...users.map((u) => ({ email: buyerEmail(u.id), name: u.displayName, role: "buyer" })),
    ...STAFF_ACCOUNTS.map((a) => ({ email: a.email!, name: a.display_name, role: a.role })),
  ];
  const authIds = await ensureAuthUsers(db, accounts);
  console.log(`auth users: ${authIds.size}`);

  const buyerRows = users.map((u) => {
    const row = userToProfileRow(u, { email: buyerEmail(u.id) });
    // ไม่ reset: คงแต้มปัจจุบันไว้ (upsert จะเขียนทับ จึงอ่านค่าเดิมก่อน)
    return { ...row, auth_id: authIds.get(buyerEmail(u.id))! };
  });
  if (!reset) {
    const current = await must("profiles", db.from("profiles").select("id, points, presale_boost"));
    const byId = new Map((current ?? []).map((p: { id: string; points: number; presale_boost: number }) => [p.id, p]));
    for (const r of buyerRows) {
      const c = byId.get(r.id);
      if (c) {
        r.points = c.points;
        r.presale_boost = c.presale_boost;
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const staffRows = STAFF_ACCOUNTS.map(({ note: _note, ...a }) => ({
    ...a,
    auth_id: authIds.get(a.email!)!,
    persona: null,
    ucenter_package: "None",
    joined_at: "2026-01-01",
    points: 0,
    presale_boost: 0,
    past_concerts: 0,
    quiz_score: 0,
  }));
  await must("profiles", db.from("profiles").upsert([...buyerRows, ...staffRows]));
  console.log(`profiles: ${buyerRows.length} buyers + ${staffRows.length} staff/organizer/admin`);

  // ---- ธุรกรรม (ข้อมูลคงที่ — ลบแล้วใส่ใหม่)
  await must("delete tx", db.from("transactions").delete().neq("id", ""));
  const txRows = transactions.map(txToRow);
  for (let i = 0; i < txRows.length; i += 1000) {
    await must(`tx ${i}`, db.from("transactions").insert(txRows.slice(i, i + 1000)));
  }
  console.log(`transactions: ${txRows.length}`);

  // ---- ล้างข้อมูลที่เกิดจากการใช้งาน
  if (reset) {
    // delete ต้องมีเงื่อนไข: ใช้คอลัมน์ที่ไม่ว่างเสมอเพื่อลบทุกแถว
    const clear: [string, string][] = [
      ["checkins", "ticket_id"],
      ["seat_locks", "seat_id"],
      ["redemptions", "reward_id"],
      ["blocked_attempts", "user_id"],
      ["bookings", "id"],
    ];
    for (const [table, col] of clear) await must(`clear ${table}`, db.from(table).delete().neq(col, ""));
  }

  // ---- คอนตัวอย่าง (c1–c3) เขียนทับด้วยค่าตั้งต้น
  const seedIds = concerts.map((c) => c.id);
  if (reset) {
    await must("delete extra concerts", db.from("concerts").delete().not("id", "in", `(${seedIds.join(",")})`));
  }
  await must(
    "concerts",
    db.from("concerts").upsert(concerts.map((c) => concertToRow({ ...c, organizerId: CONCERT_ORGANIZER[c.id] ?? "o1" }))),
  );
  console.log(`concerts: ${concerts.length}`);
  console.log("เสร็จแล้ว — รหัสผ่านบัญชีเดโมทุกบัญชีคือค่า DEMO_PASSWORD ใน .env.local");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
