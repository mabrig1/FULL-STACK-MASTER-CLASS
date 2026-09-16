type GitHubRepo = {
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  html_url: string;
  topics?: string[];
};

export type RepoEvidence = {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  description: string;
  language: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  updatedAt: string;
  pushedAt: string;
  homepage: string;
  topics: string[];
  readme: string;
  packageJson: Record<string, unknown> | null;
  hasTestScript: boolean;
  hasBuildScript: boolean;
  lastCommitAt: string | null;
};

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "full-stack-master-class",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  return headers;
}

export function parseGitHubUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function api(path: string) {
  const response = await fetch("https://api.github.com" + path, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("GitHub API returned " + response.status);
  }
  return response.json();
}

async function optionalApi(path: string) {
  try {
    return await api(path);
  } catch {
    return null;
  }
}

function decodeContent(payload: any) {
  if (!payload?.content || payload.encoding !== "base64") return "";
  return Buffer.from(String(payload.content).replace(/\n/g, ""), "base64").toString("utf8");
}

export async function fetchRepoEvidence(githubUrl: string): Promise<RepoEvidence> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) throw new Error("Use a valid github.com repository URL.");

  const { owner, repo } = parsed;
  const meta = (await api("/repos/" + owner + "/" + repo)) as GitHubRepo;
  const [readmePayload, packagePayload, commits] = await Promise.all([
    optionalApi("/repos/" + owner + "/" + repo + "/readme"),
    optionalApi("/repos/" + owner + "/" + repo + "/contents/package.json"),
    optionalApi("/repos/" + owner + "/" + repo + "/commits?per_page=1"),
  ]);

  const readme = decodeContent(readmePayload);
  const packageText = decodeContent(packagePayload);
  let packageJson: Record<string, unknown> | null = null;
  try {
    packageJson = packageText ? JSON.parse(packageText) : null;
  } catch {
    packageJson = null;
  }

  const scripts =
    packageJson && typeof packageJson.scripts === "object" && packageJson.scripts
      ? (packageJson.scripts as Record<string, unknown>)
      : {};

  return {
    owner,
    repo,
    fullName: meta.full_name,
    url: meta.html_url,
    isPrivate: Boolean(meta.private),
    description: meta.description || "",
    language: meta.language || "",
    stars: meta.stargazers_count || 0,
    forks: meta.forks_count || 0,
    defaultBranch: meta.default_branch,
    updatedAt: meta.updated_at,
    pushedAt: meta.pushed_at,
    homepage: meta.homepage || "",
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    readme,
    packageJson,
    hasTestScript: Boolean(scripts.test && scripts.test !== "echo \"Error: no test specified\" && exit 1"),
    hasBuildScript: Boolean(scripts.build),
    lastCommitAt: Array.isArray(commits) ? commits[0]?.commit?.committer?.date || null : null,
  };
}


export type RepoContextFile = {
  path: string;
  size: number;
  content: string;
};

export type ReviewEffort = "lite" | "balanced" | "deep";

function encodedRepoPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function filePriority(path: string) {
  const lower = path.toLowerCase();
  let score = 0;

  const topLevelFolders = ["app/", "src/", "pages/", "lib/", "server/", "api/", "components/"];
  if (topLevelFolders.some((prefix) => lower.startsWith(prefix))) score += 8;

  const importantTerms = [
    "route",
    "api",
    "auth",
    "security",
    "middleware",
    "db",
    "database",
    "schema",
    "test",
    "spec",
    "config",
  ];
  if (importantTerms.some((term) => lower.includes(term))) score += 7;

  const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".cs"];
  if (sourceExtensions.some((ext) => lower.endsWith(ext))) score += 5;

  if (
    lower.endsWith("package.json") ||
    lower.includes("next.config") ||
    lower.endsWith("vercel.json") ||
    lower.endsWith("dockerfile") ||
    lower.includes("readme")
  ) {
    score += 4;
  }

  if (lower.includes(".test.") || lower.includes(".spec.") || lower.includes("__tests__")) {
    score += 6;
  }

  const noisyPaths = [
    "dist/",
    "build/",
    "coverage/",
    "public/",
    "assets/",
    "vendor/",
    "node_modules/",
  ];
  if (
    lower.endsWith("lock") ||
    lower.endsWith(".map") ||
    noisyPaths.some((part) => lower.includes(part))
  ) {
    score -= 20;
  }

  return score;
}

export async function fetchRepoContext(
  githubUrl: string,
  effort: ReviewEffort = "balanced",
): Promise<{ files: RepoContextFile[]; truncated: boolean; effort: ReviewEffort }> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) throw new Error("Use a valid github.com repository URL.");

  const { owner, repo } = parsed;
  const meta = (await api("/repos/" + owner + "/" + repo)) as GitHubRepo;
  const tree = await optionalApi(
    "/repos/" +
      owner +
      "/" +
      repo +
      "/git/trees/" +
      encodeURIComponent(meta.default_branch) +
      "?recursive=1",
  );

  const entries = Array.isArray(tree?.tree) ? tree.tree : [];
  const maxFiles = effort === "lite" ? 4 : effort === "deep" ? 14 : 8;
  const maxCharsPerFile = effort === "lite" ? 3000 : effort === "deep" ? 7000 : 5000;

  const candidates = entries
    .filter((item: any) => item?.type === "blob" && Number(item?.size || 0) <= 120000)
    .filter((item: any) => {
      const path = String(item.path || "").toLowerCase();
      return [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".py", ".go", ".java", ".cs", ".yml", ".yaml"]
        .some((ext) => path.endsWith(ext));
    })
    .map((item: any) => ({
      path: String(item.path),
      size: Number(item.size || 0),
      priority: filePriority(String(item.path || "")),
    }))
    .filter((item: any) => item.priority > -10)
    .sort((a: any, b: any) => b.priority - a.priority || a.size - b.size)
    .slice(0, maxFiles);

  const files: RepoContextFile[] = [];
  for (const item of candidates) {
    const payload = await optionalApi(
      "/repos/" + owner + "/" + repo + "/contents/" + encodedRepoPath(item.path),
    );
    const content = decodeContent(payload);
    if (!content) continue;
    files.push({
      path: item.path,
      size: item.size,
      content: content.slice(0, maxCharsPerFile),
    });
  }

  return {
    files,
    truncated: entries.length > candidates.length,
    effort,
  };
}
