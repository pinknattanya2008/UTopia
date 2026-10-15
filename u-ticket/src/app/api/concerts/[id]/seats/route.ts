import { currentProfile } from "@/lib/auth";
import { sectionSeats } from "@/lib/booking";
import { getConcert, ready } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET สถานะที่นั่ง (?section=A1 หรือไม่ส่ง = ทั้งงาน) — "mine" คือที่ผู้ใช้คนนี้ล็อกไว้ */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sectionId = new URL(req.url).searchParams.get("section");
  return handle(async () => {
    await ready();
    const concert = getConcert(id);
    if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    if (sectionId && !concert.sections.some((s) => s.id === sectionId)) throw new BookingError("ไม่พบ section", 404);
    const p = await currentProfile();
    return sectionSeats(concert, sectionId, p?.id ?? "");
  });
}
