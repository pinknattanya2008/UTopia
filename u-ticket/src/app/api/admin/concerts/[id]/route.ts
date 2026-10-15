import { assertOwner, deleteConcert, setConcertStatus, updateConcert, type ConcertInput } from "@/lib/admin";
import { requireProfile } from "@/lib/auth";
import { concertStats } from "@/lib/booking";
import { getConcert } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const roles = ["organizer", "admin"] as const;

/** GET คอนเสิร์ต + สถิติ */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    const p = await requireProfile([...roles]);
    const concert = getConcert(id);
    if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
    assertOwner(p, concert);
    return { concert, stats: await concertStats(concert) };
  });
}

/** PUT แก้ไขข้อมูลงาน */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const input = await body<ConcertInput>(req);
  return handle(async () => updateConcert(await requireProfile([...roles]), id, input));
}

/** PATCH เปลี่ยนสถานะ { status: "draft" | "published" } */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status } = await body<{ status?: "draft" | "published" }>(req);
  return handle(async () => setConcertStatus(await requireProfile([...roles]), id, status === "published" ? "published" : "draft"));
}

/** DELETE ลบงานที่ยังเป็นร่าง */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await deleteConcert(await requireProfile([...roles]), id);
    return { ok: true };
  });
}
