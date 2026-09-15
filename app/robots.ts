import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://fullstack.mabrigkorie.org/sitemap.xml",
    host: "https://fullstack.mabrigkorie.org",
  };
}
