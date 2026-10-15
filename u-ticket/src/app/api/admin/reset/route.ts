import { requireProfile } from "@/lib/auth";
import { handle } from "@/lib/http";
import { resetDemo } from "@/lib/reset";

export const dynamic = "force-dynamic";

/** POST ล้างข้อมูลเดโมใน Supabase กลับเป็นค่าตั้งต้น (แอดมินเท่านั้น) */
export async function POST() {
  return handle(async () => {
    await requireProfile(["admin"]);
    await resetDemo();
    return { ok: true };
  });
}
