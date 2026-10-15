import type { SvgIconComponent } from "@mui/icons-material";

export default function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: SvgIconComponent;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "brand" | "ok" | "danger";
}) {
  const color = { default: "text-foreground", brand: "text-brand", ok: "text-ok", danger: "text-danger" }[tone];
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon fontSize="inherit" /> {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
