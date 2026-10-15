import { listUsersWithScore } from "@/lib/fan";

export const dynamic = "force-dynamic";

/** GET รายชื่อผู้ใช้จำลอง (ไม่มี persona) + Tier ปัจจุบันสำหรับ dropdown */
export async function GET() {
  return Response.json(listUsersWithScore());
}
