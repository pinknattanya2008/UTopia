import { requireProfile } from "@/lib/auth";
import { checkinSummary } from "@/lib/checkin";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET สรุปการเช็คอินของงานที่ดูแล */
export async function GET() {
  return handle(async () => checkinSummary(await requireProfile(["staff", "admin"])));
}
