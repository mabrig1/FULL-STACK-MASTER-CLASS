import type { MetadataRoute } from "next";

const base = "https://fullstack.mabrigkorie.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/dashboard",
    "/platform",
    "/sandbox",
    "/study-plan",
    "/submissions",
    "/orchestrator",
    "/career-readiness",
    "/cohorts",
    "/peer-review",
    "/pricing",
    "/login",
    "/register",
  ];

  return routes.map((route) => ({
    url: base + route,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
