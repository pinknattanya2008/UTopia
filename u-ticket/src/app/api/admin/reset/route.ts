import { resetState } from "@/lib/data";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST ล้างข้อมูลเดโม (การจอง คอนที่สร้าง แต้ม) กลับเป็นค่าเริ่มต้น */
export async function POST() {
  return handle(() => {
    resetState();
    return { ok: true };
  });
}
