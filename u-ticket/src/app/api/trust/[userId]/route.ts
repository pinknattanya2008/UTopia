import { assertSelf, requireProfile } from "@/lib/auth";
import { getUser } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { body, handle } from "@/lib/http";
import { AI_BUSY_NOTICE, ensureTrust } from "@/lib/insights";

export const dynamic = "force-dynamic";

/** POST ให้ AI ประเมินความน่าเชื่อถือ (cache ต่อ userId, { force: true } = ประเมินใหม่) — ของตัวเองเท่านั้น */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { force } = await body<{ force?: boolean }>(req);
  return handle(async () => {
    const p = await requireProfile();
    assertSelf(p, userId);
    const user = getUser(userId);
    if (!user) throw new BookingError("ไม่พบผู้ใช้", 404);
    const { value, source } = await ensureTrust(user, Boolean(force));
    return { ...value, source, notice: source === "fallback" ? AI_BUSY_NOTICE : undefined };
  });
}
