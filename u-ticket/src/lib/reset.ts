/**
 * ล้างข้อมูลเดโมใน Supabase กลับเป็นค่าตั้งต้น (ใช้จากปุ่มของแอดมิน)
 * — การจอง ล็อกที่นั่ง เช็คอิน การแลกแต้ม บัญชีที่ถูกกัน, คอนที่สร้างเพิ่ม, แต้ม/Presale Boost ของผู้ซื้อ
 */
import usersJson from "../../data/users.json";
import concertsJson from "../../data/concerts.json";
import { invalidate, store } from "./data";
import { CONCERT_ORGANIZER, concertToRow } from "./mappers";
import { db } from "./supabase/admin";
import type { Concert, User } from "./types";

export async function resetDemo() {
  const clear: [string, string][] = [
    ["checkins", "ticket_id"],
    ["seat_locks", "seat_id"],
    ["redemptions", "reward_id"],
    ["blocked_attempts", "user_id"],
    ["bookings", "id"],
  ];
  for (const [table, col] of clear) {
    const { error } = await db().from(table).delete().neq(col, "");
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const concerts = concertsJson as Concert[];
  const seedIds = concerts.map((c) => c.id);
  {
    const { error } = await db().from("concerts").delete().not("id", "in", `(${seedIds.join(",")})`);
    if (error) throw new Error(error.message);
  }
  {
    const rows = concerts.map((c) => concertToRow({ ...c, organizerId: CONCERT_ORGANIZER[c.id] ?? "o1" }));
    const { error } = await db().from("concerts").upsert(rows);
    if (error) throw new Error(error.message);
  }
  for (const u of usersJson as User[]) {
    const { error } = await db().from("profiles").update({ points: u.points, presale_boost: 0 }).eq("id", u.id);
    if (error) throw new Error(error.message);
  }
  store.summaries.clear();
  invalidate();
}
