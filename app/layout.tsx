import type { Metadata, Viewport } from "next";
import Splash from "@/components/Splash";
import VisitTracker from "@/components/VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lightwess Collection", template: "%s · Lightwess Collection" },
  description: "Ta collection de jeux vidéo, tes notes et celles de tes amis. Par Lightwess.",
  applicationName: "Lightwess Collection",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Masque l'écran de lancement s'il a déjà été vu dans cet onglet (avant le premier affichage). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(sessionStorage.getItem('lw-splash'))document.documentElement.dataset.nosplash='1'}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-dvh font-sans">
        <Splash />
        <div className="ambient" aria-hidden="true" />
        <div className="relative z-[1]">{children}</div>
        <VisitTracker />
      </body>
    </html>
  );
}
