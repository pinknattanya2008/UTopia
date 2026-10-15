import { BookingError, sectionSeats } from "@/lib/booking";
import { getConcert } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET สถานะที่นั่ง (?section=A1 หรือไม่ส่ง = ทั้งงาน &userId=) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return handle(() => {
    const concert = getConcert(id);
    if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    const sectionId = url.searchParams.get("section");
    if (sectionId && !concert.sections.some((s) => s.id === sectionId)) throw new BookingError("ไม่พบ section", 404);
    return sectionSeats(concert, sectionId, url.searchParams.get("userId") ?? "");
  });
}
