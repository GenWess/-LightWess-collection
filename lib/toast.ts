"use client";

export type ToastKind = "info" | "success" | "match" | "error";

/** Affiche un toast élégant depuis n'importe quel composant. */
export function toast(text: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lw-toast", { detail: { text, kind } }));
}
