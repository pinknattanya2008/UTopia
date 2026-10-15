import { assertSelf, requireProfile } from "@/lib/auth";
import { getScoreDetail, getUser } from "@/lib/fan";
import { BookingError } from "@/lib/errors";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET Fan Score (สูตร + Trust จาก cache AI หรือ fallback) — ของตัวเองเท่านั้น */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return handle(async () => {
    const p = await requireProfile();
    assertSelf(p, userId);
    const user = getUser(userId);
    if (!user) throw new BookingError("ไม่พบผู้ใช้", 404);
    return getScoreDetail(user);
  });
}
