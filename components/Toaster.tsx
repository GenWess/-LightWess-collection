"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { ToastKind } from "@/lib/toast";

type T = { id: number; text: string; kind: ToastKind };

const STYLE: Record<ToastKind, string> = {
  info: "bg-ink text-night",
  success: "bg-ink text-night",
  match: "bg-gradient-to-r from-violet-lo to-violet text-white",
  error: "bg-no text-white",
};

export default function Toaster() {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; kind: ToastKind }>).detail;
      const id = ++n;
      setList((l) => [...l.slice(-2), { id, ...d }]);
      setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), d.kind === "match" ? 3600 : 2400);
    };
    addEventListener("lw-toast", on);
    return () => removeEventListener("lw-toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: -18, scale: 0.9, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={`max-w-[92vw] rounded-full px-5 py-3 text-center text-sm font-semibold shadow-[0_18px_40px_-12px_rgba(0,0,0,.6)] ${STYLE[t.kind]}`}>
            {t.kind === "success" && <span className="mr-1.5 text-ok">✓</span>}{t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
