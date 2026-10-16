"use client";

import { useState } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";

/** ชุดสีโซน (แทน <input type="color"> ของเบราว์เซอร์) */
export const SWATCHES = [
  "#f2557a", "#f5a524", "#14b8a6", "#8e7cff", "#2fb57f", "#ff8a4c",
  "#e11d48", "#d97706", "#0891b2", "#7c3aed", "#16a34a", "#ea580c",
  "#ec4899", "#eab308", "#06b6d4", "#a855f7", "#84cc16", "#64748b",
];

export default function ColorSwatchPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={`เลือกสี${label}`}>
        <ButtonBase
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={`สีของ ${label}`}
          sx={{ width: 36, height: 36, borderRadius: 1.5, border: 1, borderColor: "divider", bgcolor: value, flexShrink: 0 }}
        />
      </Tooltip>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <div className="grid grid-cols-6 gap-1.5 p-2.5" role="listbox" aria-label={`สีของ ${label}`}>
          {SWATCHES.map((c) => (
            <ButtonBase
              key={c}
              role="option"
              aria-selected={c.toLowerCase() === value.toLowerCase()}
              aria-label={c}
              onClick={() => {
                onChange(c);
                setAnchor(null);
              }}
              sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: c, color: "#fff" }}
            >
              {c.toLowerCase() === value.toLowerCase() && <CheckIcon sx={{ fontSize: 16 }} />}
            </ButtonBase>
          ))}
        </div>
      </Popover>
    </>
  );
}
