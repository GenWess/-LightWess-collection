"use client";

import { useEffect, useState } from "react";
import { btnPrimary, panel } from "./ui";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Installer le site comme une vraie appli sur le téléphone (icône, plein écran, sans barre du navigateur). */
export default function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    const on = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    addEventListener("beforeinstallprompt", on);
    return () => removeEventListener("beforeinstallprompt", on);
  }, []);

  if (installed) return null;
  return (
    <section className={`${panel} flex flex-col gap-3`}>
      <h2 className="text-xl font-bold">Lightwess sur ton téléphone</h2>
      <p className="text-sm text-mute">Installe le site comme une appli : icône sur l&apos;écran d&apos;accueil, plein écran, ouverture instantanée. Gratuit, sans store.</p>
      {evt ? (
        <button className={`${btnPrimary} self-start`} onClick={async () => { await evt.prompt(); setEvt(null); }}>Installer l&apos;appli</button>
      ) : ios ? (
        <ol className="flex flex-col gap-1.5 text-sm text-ink2">
          <li>1. Ouvre le site dans <b>Safari</b>.</li>
          <li>2. Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li>
          <li>3. Choisis <b>« Sur l&apos;écran d&apos;accueil »</b>, puis <b>Ajouter</b>.</li>
        </ol>
      ) : (
        <ol className="flex flex-col gap-1.5 text-sm text-ink2">
          <li>1. Ouvre le site dans <b>Chrome</b>.</li>
          <li>2. Touche le menu <b>⋮</b> en haut à droite.</li>
          <li>3. Choisis <b>« Installer l&apos;application »</b> (ou « Ajouter à l&apos;écran d&apos;accueil »).</li>
        </ol>
      )}
    </section>
  );
}
