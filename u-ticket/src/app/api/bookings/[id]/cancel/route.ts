import { cancelBooking } from "@/lib/booking";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST ยกเลิกการล็อกที่นั่ง { userId } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await body<{ userId?: string }>(req);
  return handle(() => cancelBooking(id, userId ?? ""));
}
