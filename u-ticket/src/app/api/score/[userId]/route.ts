import { getScoreDetail, getUser } from "@/lib/fan";

export const dynamic = "force-dynamic";

/** GET Fan Score (สูตร + Trust จาก cache AI หรือ fallback) */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = getUser(userId);
  if (!user) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  return Response.json(getScoreDetail(user));
}
