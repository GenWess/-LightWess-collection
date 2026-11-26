import type { MetadataRoute } from "next";

/** Rend le site installable comme une appli (téléphone et PC), sans passer par les stores. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lightwess Collection",
    short_name: "Lightwess",
    description: "Ta collection de jeux, tes notes et celles de tes amis.",
    start_url: "/decouvrir",
    display: "standalone",
    background_color: "#0b0a10",
    theme_color: "#0b0a10",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
