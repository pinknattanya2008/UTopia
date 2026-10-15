/**
 * เวลาจำลองสำหรับเดโม — เทียบกับเวลาเปิดขายทั่วไปของแต่ละคอน
 * ใช้ให้เห็นว่าแต่ละ Tier เข้าซื้อได้คนละเวลา โดยไม่ต้องรอเวลาจริง
 */
export const CLOCK_PRESETS = [
  { offsetMinutes: -180, label: "ก่อนเปิด presale" },
  { offsetMinutes: -120, label: "รอบ Diamond" },
  { offsetMinutes: -60, label: "รอบ Gold" },
  { offsetMinutes: -30, label: "รอบ Silver" },
  { offsetMinutes: 0, label: "เปิดขายทั่วไป" },
] as const;

export const DEFAULT_CLOCK = -60;
