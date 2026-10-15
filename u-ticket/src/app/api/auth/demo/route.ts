import { BookingError } from "@/lib/errors";
import { body, handle } from "@/lib/http";
import { DEMO_EMAIL_DOMAIN } from "@/lib/mappers";
import { authClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST { email } — ล็อกอินบัญชีเดโมในคลิกเดียว (รหัสผ่านอยู่ฝั่ง server เท่านั้น)
 * เปิดใช้เมื่อ DEMO_LOGIN=1 และใช้ได้เฉพาะอีเมลโดเมนเดโม
 */
export async function POST(req: Request) {
  return handle(async () => {
    if (process.env.DEMO_LOGIN !== "1" || !process.env.DEMO_PASSWORD) throw new BookingError("ปิดการล็อกอินเดโมอยู่", 403);
    const { email } = await body<{ email?: string }>(req);
    const e = String(email ?? "").toLowerCase();
    if (!e.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) throw new BookingError("ไม่ใช่บัญชีเดโม", 400);
    const supabase = await authClient();
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: process.env.DEMO_PASSWORD });
    if (error) throw new BookingError("ล็อกอินบัญชีเดโมไม่สำเร็จ — รัน npm run db:seed แล้วลองใหม่", 401);
    return { ok: true };
  });
}
