import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { SOURCE_LABEL } from "@/lib/client";
import type { AiSource, TrustAssessment } from "@/lib/types";

/** แสดงผลประเมินความน่าเชื่อถือ: เขียว = ปกติ, เหลือง = น่าสงสัย, แดง = ปั๊มแต้ม/บอท */
export default function TrustBadge({ trust, source }: { trust: TrustAssessment; source: AiSource }) {
  const level = trust.isLikelyBot || trust.trustMultiplier < 0.6 ? "bad" : trust.trustMultiplier < 0.9 ? "warn" : "ok";
  const style = {
    ok: { box: "border-ok/40 bg-ok/10", text: "text-ok", Icon: VerifiedUserOutlinedIcon, title: "การใช้งานจริง น่าเชื่อถือ" },
    warn: { box: "border-brand/40 bg-brand/10", text: "text-brand", Icon: WarningAmberIcon, title: "พบพฤติกรรมน่าสงสัยบางส่วน" },
    bad: {
      box: "border-danger/50 bg-danger/10",
      text: "text-danger",
      Icon: trust.isLikelyBot ? SmartToyOutlinedIcon : FlagOutlinedIcon,
      title: trust.isLikelyBot ? "เข้าข่ายบอท" : "ตรวจพบการปั๊มแต้ม",
    },
  }[level];
  return (
    <div className={`rounded-lg border p-4 ${style.box}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`flex items-center gap-1.5 font-semibold ${style.text}`}>
          <style.Icon fontSize="small" />
          {style.title}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ring-1 ring-current ${style.text}`}>
          Trust ×{trust.trustMultiplier.toFixed(2)}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {trust.reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        ความเสี่ยง: {trust.riskLevel === "low" ? "ต่ำ" : trust.riskLevel === "medium" ? "ปานกลาง" : "สูง"} · {SOURCE_LABEL[source]}
      </p>
    </div>
  );
}
