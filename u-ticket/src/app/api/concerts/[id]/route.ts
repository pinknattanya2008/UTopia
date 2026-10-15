import { currentProfile } from "@/lib/auth";
import { checkAccess, recordBlocked, sectionAvailability } from "@/lib/booking";
import { getConcert, getUser, ready } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET รายละเอียดคอน + ที่ว่างต่อ section + สิทธิ์ซื้อของผู้ซื้อที่ล็อกอินอยู่ (?clock=) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clock = Number(new URL(req.url).searchParams.get("clock") ?? 0);
  return handle(async () => {
    await ready();
    const concert = getConcert(id);
    if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    const p = await currentProfile();
    const user = p?.role === "buyer" ? getUser(p.id) : undefined;
    const access = user ? await checkAccess(concert, user, clock) : null;
    if (user && access?.code === "blocked_trust") await recordBlocked(concert.id, user.id);
    return { concert, availability: await sectionAvailability(concert), access };
  });
}
