import { getUser } from "@/lib/fan";
import { AI_BUSY_NOTICE, getMissions } from "@/lib/insights";

export const dynamic = "force-dynamic";

/** POST ให้ AI สร้างภารกิจ 3 ข้อ */
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = getUser(userId);
  if (!user) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  const { value, source } = await getMissions(user);
  return Response.json({ missions: value, source, notice: source === "fallback" ? AI_BUSY_NOTICE : undefined });
}
