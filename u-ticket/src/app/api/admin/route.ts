import { adminOverview } from "@/lib/admin";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET ภาพรวมผู้จัด: คอนเสิร์ตทั้งหมด + ยอดขาย + รายได้แพลตฟอร์ม */
export async function GET() {
  return handle(() => adminOverview());
}
