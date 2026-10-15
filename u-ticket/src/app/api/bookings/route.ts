import { holdSeats, userBookings, type HoldRequest } from "@/lib/booking";
import { getConcert } from "@/lib/data";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET บัตรที่ชำระแล้วของผู้ใช้ (?userId=) */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  return handle(() =>
    userBookings(userId).map((b) => {
      const c = getConcert(b.concertId);
      return { ...b, concert: c && { id: c.id, title: c.title, artist: c.artist, venue: c.venue, date: c.date } };
    }),
  );
}

/** POST ล็อกที่นั่ง { userId, concertId, seats?, standing?, clock? } → Booking (status held) */
export async function POST(req: Request) {
  const input = await body<HoldRequest>(req);
  return handle(() => holdSeats(input));
}
