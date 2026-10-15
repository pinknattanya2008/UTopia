import { adminOverview } from "@/lib/admin";
import { requireProfile } from "@/lib/auth";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET ภาพรวม: ผู้จัดเห็นคอนของตัวเอง แอดมินเห็นทุกคอน */
export async function GET() {
  return handle(async () => adminOverview(await requireProfile(["organizer", "admin"])));
}
