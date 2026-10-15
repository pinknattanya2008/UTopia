/**
 * ตรวจว่าใครล็อกอินอยู่ (Supabase Auth → profiles) และสิทธิ์ตาม role
 */
import { BookingError } from "./errors";
import { getProfileByAuthId, ready } from "./data";
import { profileToAccount, type ProfileRow, type Role } from "./mappers";
import { authClient } from "./supabase/server";

/** profile ของผู้ที่ล็อกอินอยู่ หรือ null */
export async function currentProfile(): Promise<ProfileRow | null> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  await ready();
  let p = getProfileByAuthId(user.id);
  if (!p) {
    // เพิ่งสร้างบัญชี: โหลดใหม่อีกครั้ง
    await ready(true);
    p = getProfileByAuthId(user.id);
  }
  return p ?? null;
}

/** ต้องล็อกอิน (และมี role ที่กำหนด ถ้าระบุ) ไม่งั้น throw 401/403 */
export async function requireProfile(roles?: Role[]): Promise<ProfileRow> {
  const p = await currentProfile();
  if (!p) throw new BookingError("กรุณาเข้าสู่ระบบ", 401);
  if (roles && !roles.includes(p.role)) throw new BookingError("บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้", 403);
  return p;
}

/** ผู้ซื้อดูข้อมูลของตัวเองเท่านั้น (แอดมินดูได้ทุกคน) */
export function assertSelf(p: ProfileRow, userId: string) {
  if (p.role !== "admin" && p.id !== userId) throw new BookingError("ดูได้เฉพาะข้อมูลของบัญชีตัวเอง", 403);
}

export { profileToAccount };
export type { Role };
