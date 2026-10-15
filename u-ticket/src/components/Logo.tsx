/**
 * โลโก้ U Ticket (จากไฟล์ออกแบบ "Logo on dark and light")
 * สัญลักษณ์: ตัว U ที่มีรอยบากแบบตั๋ว + จุดสีน้ำเงินตรงกลาง — ตัว U ใช้สีตามตัวหนังสือ (currentColor)
 * จึงเป็นกรมท่าบนพื้นสว่าง และขาวบนพื้นมืดเอง
 */
export const MARK_PATH =
  "M20 12H40V58a10 10 0 0 0 20 0V12H80V29A7 7 0 0 0 80 43V58A30 30 0 0 1 20 58V43A7 7 0 0 0 20 29Z";
export const BRAND_ACCENT = "#4F7BFF";

export function LogoMark({ size = 32, accent = "var(--brand)", className }: { size?: number; accent?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="U Ticket">
      <path fill="currentColor" d={MARK_PATH} />
      <circle cx="50" cy="36" r="6" fill={accent} />
    </svg>
  );
}

/** สัญลักษณ์ + ตัวหนังสือ "U Ticket" (Sora: U หนา 700, Ticket 500, letter-spacing −0.02em) */
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-foreground ${className}`}>
      <LogoMark size={size} />
      <span className="font-display whitespace-nowrap leading-none tracking-[-0.02em]" style={{ fontSize: size * 0.62 }}>
        <span className="font-bold">U</span> <span className="font-medium">Ticket</span>
      </span>
    </span>
  );
}
