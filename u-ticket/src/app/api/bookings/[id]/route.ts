import { requireProfile } from "@/lib/auth";
import { discountRewards, getBooking } from "@/lib/booking";
import { getConcert, getUser } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET รายการจองของตัวเอง + ส่วนลดที่ใช้ได้ */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    const booking = await getBooking(id, p.id);
    const c = getConcert(booking.concertId);
    return {
      booking,
      concert: c && { id: c.id, title: c.title, artist: c.artist, venue: c.venue, date: c.date },
      points: getUser(p.id)?.points ?? 0,
      discounts: discountRewards(),
    };
  });
}
