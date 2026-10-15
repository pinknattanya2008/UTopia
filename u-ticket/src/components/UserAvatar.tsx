/** Avatar วงกลมสี + อักษรแรกของชื่อ (สระหน้าภาษาไทยจะรวมกับพยัญชนะถัดไป) */
export function initials(name: string) {
  const chars = Array.from(name.trim());
  const first = /[เแโใไ]/.test(chars[0] ?? "") ? chars.slice(0, 2).join("") : (chars[0] ?? "?");
  return first.toUpperCase();
}

export default function UserAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-xl" : "h-9 w-9 text-sm";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${sz}`}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  );
}
