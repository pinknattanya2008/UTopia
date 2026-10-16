"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** กล่องยืนยันแบบ MUI Dialog (แทน window.confirm) — ใช้ผ่าน useConfirm() */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onClose={() => close(false)} maxWidth="xs" fullWidth aria-labelledby="confirm-title">
        <DialogTitle id="confirm-title" sx={{ fontWeight: 700 }}>
          {opts?.title}
        </DialogTitle>
        {opts?.description && (
          <DialogContent>
            <DialogContentText>{opts.description}</DialogContentText>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => close(false)} color="inherit">
            {opts?.cancelText ?? "ยกเลิก"}
          </Button>
          <Button onClick={() => close(true)} variant="contained" color={opts?.danger ? "error" : "primary"} autoFocus>
            {opts?.confirmText ?? "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used inside ConfirmProvider");
  return c;
}
