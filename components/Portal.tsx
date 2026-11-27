"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Affiche son contenu directement dans <body>, par-dessus toute la page.
 * Indispensable pour les fenêtres ouvertes depuis une barre animée ou floutée :
 * sans ça, elles restent coincées dans la barre (et passent derrière la page).
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}
