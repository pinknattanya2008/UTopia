import CheckIcon from "@mui/icons-material/Check";

const STEPS = ["เลือกที่นั่ง", "ชำระเงิน", "รับบัตร"];

/** แถบขั้นตอนการซื้อบัตร: 0 = เลือกที่นั่ง, 1 = ชำระเงิน, 2 = รับบัตร */
export default function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="ขั้นตอนการซื้อบัตร">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                done ? "bg-ok text-white" : active ? "bg-brand text-white" : "bg-surface-2 text-muted ring-1 ring-line"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
            </span>
            <span className={`whitespace-nowrap ${active ? "font-semibold text-foreground" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${done ? "bg-ok/60" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
