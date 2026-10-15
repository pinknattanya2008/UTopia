import { assertSelf, requireProfile } from "@/lib/auth";
import { getUser } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { AI_BUSY_NOTICE, getExplanation } from "@/lib/insights";

export const dynamic = "force-dynamic";

/** POST ให้ AI อธิบายคะแนนเป็นภาษาไทย — ของตัวเองเท่านั้น */
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return handle(async () => {
    const p = await requireProfile();
    assertSelf(p, userId);
    const user = getUser(userId);
    if (!user) throw new BookingError("ไม่พบผู้ใช้", 404);
    const { value, source } = await getExplanation(user);
    return { explanation: value, source, notice: source === "fallback" ? AI_BUSY_NOTICE : undefined };
  });
}
