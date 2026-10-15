import { requireProfile } from "@/lib/auth";
import { BookingError } from "@/lib/errors";
import { body, handle } from "@/lib/http";
import { AI_BUSY_NOTICE } from "@/lib/insights";
import { simulatePresale } from "@/lib/presale";

export const dynamic = "force-dynamic";

/** POST จำลองคิว presale (ต้องล็อกอิน) */
export async function POST(req: Request) {
  const { concertId } = await body<{ concertId?: string }>(req);
  return handle(async () => {
    await requireProfile();
    const result = await simulatePresale(concertId ?? "c1");
    if (!result) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    const usedFallback = result.summarySource === "fallback" || result.stats.trustSources.fallback > 0;
    return { ...result, notice: usedFallback ? AI_BUSY_NOTICE : undefined };
  });
}
