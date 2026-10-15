import { requireProfile } from "@/lib/auth";
import { holdSeats, userBookings, type HoldRequest } from "@/lib/booking";
import { getConcert } from "@/lib/data";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET บัตรที่ชำระแล้วของผู้ซื้อที่ล็อกอินอยู่ */
export async function GET() {
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    const list = await userBookings(p.id);
    return list.map((b) => {
      const c = getConcert(b.concertId);
      return { ...b, concert: c && { id: c.id, title: c.title, artist: c.artist, venue: c.venue, date: c.date } };
    });
  });
}

/** POST ล็อกที่นั่ง { concertId, seats?, standing?, clock? } → Booking (status held) */
export async function POST(req: Request) {
  const input = await body<HoldRequest>(req);
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    return holdSeats(p.id, input);
  });
}
