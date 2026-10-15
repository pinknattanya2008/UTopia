import { ImageResponse } from "next/og";
import { MARK_PATH, BRAND_ACCENT } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** App icon สำหรับ iOS (พื้นกรมท่า สัญลักษณ์ขาว จุดน้ำเงิน) — iOS ตัดมุมให้เอง */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0F1A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" width={118} height={118}>
          <path fill="#FFFFFF" d={MARK_PATH} />
          <circle cx="50" cy="36" r="6" fill={BRAND_ACCENT} />
        </svg>
      </div>
    ),
    size,
  );
}
