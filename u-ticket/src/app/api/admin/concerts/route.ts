import { createConcert, type ConcertInput } from "@/lib/admin";
import { requireProfile } from "@/lib/auth";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST สร้างคอนเสิร์ตใหม่ (สังกัดผู้จัดของบัญชีที่ล็อกอิน) */
export async function POST(req: Request) {
  const input = await body<ConcertInput>(req);
  return handle(async () => createConcert(await requireProfile(["organizer", "admin"]), input));
}
