/** สีที่ใช้ใน SVG (ผังที่นั่ง, เกจ, ภาพจำลอง) — ให้ตรงกับธีมใน globals.css (เทาเป็นกลาง + ส้ม) */
export const MAP = {
  bg: "#fafafa",
  grid: "#e4e4e7",
  stage: "#ee6c1f",
  stageText: "#ffffff",
  sold: "#e4e4e7",
  soldStroke: "#d4d4d8",
  ink: "#232326",
  inkMuted: "#6b6b73",
  labelBg: "#ffffff",
  selected: "#232326",
  focus: "#ee6c1f",
  screen: "#7cb4f0",
  danger: "#e0484d",
};

export const TIER_COLOR = {
  Diamond: "#0ea5e9",
  Gold: "#f59e0b",
  Silver: "#94a3b8",
  General: "#a1a1aa",
} as const;
