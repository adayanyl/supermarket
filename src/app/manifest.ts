import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dispensa — compras inteligentes",
    short_name: "Dispensa",
    description: "Leia o cupom fiscal, controle a dispensa e gere a lista de compras do mês.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#0f766e",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
