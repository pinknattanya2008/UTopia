import { getRewards, getUser, saveState, store } from "@/lib/data";

export const dynamic = "force-dynamic";

const PRESALE_BOOST = 5;

/** POST แลกแต้ม { userId, rewardId } → { ok, pointsLeft } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { userId?: string; rewardId?: string };
  const user = getUser(body.userId ?? "");
  const reward = getRewards().find((r) => r.id === body.rewardId);
  if (!user || !reward) return Response.json({ ok: false, error: "ไม่พบผู้ใช้หรือรีวอร์ด" }, { status: 404 });

  if (reward.type === "presale_boost" && store.boosts.has(user.id)) {
    return Response.json({ ok: false, pointsLeft: user.points, error: "ใช้ Presale Boost ในรอบนี้ไปแล้ว" }, { status: 409 });
  }
  if (user.points < reward.costPoints) {
    return Response.json({ ok: false, pointsLeft: user.points, error: "แต้มไม่พอ" }, { status: 400 });
  }

  user.points -= reward.costPoints;
  if (reward.type === "presale_boost") store.boosts.set(user.id, PRESALE_BOOST);
  store.redemptions.push({ userId: user.id, rewardId: reward.id, at: new Date().toISOString() });
  saveState();
  return Response.json({ ok: true, pointsLeft: user.points });
}
