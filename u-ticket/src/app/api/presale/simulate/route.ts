import { AI_BUSY_NOTICE } from "@/lib/insights";
import { simulatePresale } from "@/lib/presale";

export const dynamic = "force-dynamic";

/** POST จำลองคิว presale */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { concertId?: string };
  const result = await simulatePresale(body.concertId ?? "c1");
  if (!result) return Response.json({ error: "ไม่พบคอนเสิร์ต" }, { status: 404 });
  const usedFallback = result.summarySource === "fallback" || result.stats.trustSources.fallback > 0;
  return Response.json({ ...result, notice: usedFallback ? AI_BUSY_NOTICE : undefined });
}
