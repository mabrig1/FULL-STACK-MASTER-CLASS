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
