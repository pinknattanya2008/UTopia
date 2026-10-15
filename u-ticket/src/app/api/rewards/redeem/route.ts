import { requireProfile } from "@/lib/auth";
import { getRewards, invalidate } from "@/lib/data";
import { BookingError } from "@/lib/errors";
import { body, handle } from "@/lib/http";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PRESALE_BOOST = 5;

/** POST แลกแต้ม { rewardId } → { ok, pointsLeft } (หักแต้มใน DB แบบครบทั้งชุด) */
export async function POST(req: Request) {
  const { rewardId } = await body<{ rewardId?: string }>(req);
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    const reward = getRewards().find((r) => r.id === rewardId);
    if (!reward) throw new BookingError("ไม่พบรีวอร์ด", 404);
    const { data, error } = await db().rpc("redeem_reward", {
      p_user: p.id,
      p_reward: reward.id,
      p_cost: reward.costPoints,
      p_boost: reward.type === "presale_boost" ? PRESALE_BOOST : 0,
    });
    if (error) {
      if (error.message.startsWith("BOOST_USED")) throw new BookingError("ใช้ Presale Boost ในรอบนี้ไปแล้ว", 409);
      if (error.message.startsWith("POINTS")) throw new BookingError("แต้มไม่พอ");
      throw new Error(error.message);
    }
    invalidate();
    return { ok: true, pointsLeft: data as number };
  });
}
