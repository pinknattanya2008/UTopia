import { discountRewards, getBooking } from "@/lib/booking";
import { getConcert, getUser } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET รายการจอง + ส่วนลดที่ใช้ได้ (?userId=) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  return handle(() => {
    const booking = getBooking(id, userId);
    const c = getConcert(booking.concertId);
    return {
      booking,
      concert: c && { id: c.id, title: c.title, artist: c.artist, venue: c.venue, date: c.date },
      points: getUser(userId)?.points ?? 0,
      discounts: discountRewards(),
    };
  });
}
