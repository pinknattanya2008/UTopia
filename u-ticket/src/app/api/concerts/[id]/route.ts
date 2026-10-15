import { BookingError, checkAccess, sectionAvailability } from "@/lib/booking";
import { getConcert, getUser } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET รายละเอียดคอน + ที่ว่างต่อ section + สิทธิ์ซื้อของผู้ใช้ (?userId=&clock=) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return handle(() => {
    const concert = getConcert(id);
    if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    const user = getUser(url.searchParams.get("userId") ?? "");
    return {
      concert,
      availability: sectionAvailability(concert),
      access: user ? checkAccess(concert, user, Number(url.searchParams.get("clock") ?? 0)) : null,
    };
  });
}
