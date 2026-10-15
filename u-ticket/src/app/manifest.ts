import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "U Ticket",
    short_name: "U Ticket",
    description: "ใช้ทุกวัน ได้บัตรก่อนใคร — กดบัตรคอนเสิร์ตบน U-topia",
    start_url: "/",
    display: "standalone",
    background_color: "#0F1A30",
    theme_color: "#0F1A30",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
