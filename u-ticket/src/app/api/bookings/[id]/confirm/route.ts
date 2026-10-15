import { requireProfile } from "@/lib/auth";
import { confirmBooking } from "@/lib/booking";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST ชำระเงิน (จำลอง) { discountRewardId? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { discountRewardId } = await body<{ discountRewardId?: string }>(req);
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    return confirmBooking(id, p.id, discountRewardId || undefined);
  });
}
