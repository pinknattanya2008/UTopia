import { sectionAvailability } from "@/lib/booking";
import { getPublishedConcerts, ready } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET คอนเสิร์ตที่เผยแพร่แล้ว + ราคาเริ่มต้นและที่ว่าง */
export async function GET() {
  return handle(async () => {
    await ready();
    return Promise.all(
      getPublishedConcerts().map(async (c) => {
        const avail = Object.values(await sectionAvailability(c));
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
  });
}
