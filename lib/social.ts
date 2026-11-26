"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export const INVITE_KEY = "lw-invite-friend";
export const JOIN_KEY = "lw-invite-group";

export const friendLink = (handle: string) => `${location.origin}/ajouter/${handle}`;
export const groupLink = (code: string) => `${location.origin}/rejoindre/${code}`;

export async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function remember(key: string, value: string) { try { localStorage.setItem(key, value); } catch {} }
export function recall(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
export function forget(key: string) { try { localStorage.removeItem(key); } catch {} }

/**
 * Ajoute un ami en un geste : si l'autre m'a déjà envoyé une demande, on l'accepte ;
 * sinon on envoie la demande. Renvoie l'état final.
 */
export async function addFriend(supabase: SupabaseClient, meId: string, otherId: string): Promise<"sent" | "accepted" | "already" | "error"> {
  if (meId === otherId) return "error";
  const { data: rel } = await supabase
    .from("friendships")
    .select("id,status,requester_id")
    .or(`and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`)
    .maybeSingle();
  if (rel?.status === "accepted") return "already";
  if (rel && rel.requester_id === otherId) {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", rel.id);
    return error ? "error" : "accepted";
  }
  if (rel) {
    if (rel.status === "pending") return "sent";
    await supabase.from("friendships").delete().eq("id", rel.id);
  }
  const { error } = await supabase.from("friendships").insert({ requester_id: meId, addressee_id: otherId });
  return error ? "error" : "sent";
}
