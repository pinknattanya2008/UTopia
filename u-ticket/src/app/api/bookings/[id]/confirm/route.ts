import { confirmBooking } from "@/lib/booking";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST ชำระเงิน (จำลอง) { userId, discountRewardId? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, discountRewardId } = await body<{ userId?: string; discountRewardId?: string }>(req);
  return handle(() => confirmBooking(id, userId ?? "", discountRewardId || undefined));
}
