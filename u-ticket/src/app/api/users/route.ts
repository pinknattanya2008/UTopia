import { ready, getProfiles, getUser } from "@/lib/data";
import { getScore } from "@/lib/fan";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET บัญชีเดโมทั้งหมดสำหรับหน้าล็อกอิน/ปุ่มสลับบัญชี (ไม่มี persona หรือแต้ม)
 * เปิดเฉพาะเมื่อ DEMO_LOGIN=1
 */
export async function GET() {
  return handle(async () => {
    if (process.env.DEMO_LOGIN !== "1") return [];
    await ready();
    return getProfiles().map((p) => {
      const u = p.role === "buyer" ? getUser(p.id) : undefined;
      const score = u ? getScore(u).score : null;
      return {
        id: p.id,
        email: p.email,
        role: p.role,
        displayName: p.display_name,
        avatar: p.avatar,
        tier: score?.tier ?? null,
        finalScore: score?.finalScore ?? null,
      };
    });
  });
}
