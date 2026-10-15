import { requireProfile } from "@/lib/auth";
import { cancelBooking } from "@/lib/booking";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST ยกเลิกการล็อกที่นั่ง */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    return cancelBooking(id, p.id);
  });
}
