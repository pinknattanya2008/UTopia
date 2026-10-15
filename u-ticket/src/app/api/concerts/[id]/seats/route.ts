import { BookingError, sectionSeats } from "@/lib/booking";
import { getConcert } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET สถานะที่นั่งใน section (?section=A1&userId=) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return handle(() => {
    const concert = getConcert(id);
    const sectionId = url.searchParams.get("section") ?? "";
    if (!concert || !concert.sections.some((s) => s.id === sectionId)) throw new BookingError("ไม่พบ section", 404);
    return sectionSeats(concert, sectionId, url.searchParams.get("userId") ?? "");
  });
}
