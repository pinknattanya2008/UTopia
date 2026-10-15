import { sectionAvailability } from "@/lib/booking";
import { getPublishedConcerts } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET คอนเสิร์ตที่เผยแพร่แล้ว + ราคาเริ่มต้นและที่ว่าง */
export async function GET() {
  return Response.json(
    getPublishedConcerts().map((c) => {
      const avail = Object.values(sectionAvailability(c));
      return {
        id: c.id,
        artist: c.artist,
        title: c.title,
        venue: c.venue,
        date: c.date,
        salesOpenAt: c.salesOpenAt,
        plan: c.plan,
        minPrice: Math.min(...c.zones.map((z) => z.priceTHB)),
        capacity: avail.reduce((n, a) => n + a.capacity, 0),
        available: avail.reduce((n, a) => n + a.available, 0),
      };
    }),
  );
}
