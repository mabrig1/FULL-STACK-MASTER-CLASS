export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AIProvider = {
  name: "openrouter" | "vercel-ai-gateway";
  apiKey: string;
  baseUrl: string;
};

function getProvider(): AIProvider | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      name: "openrouter",
      apiKey: openRouterKey,
      baseUrl: "https://openrouter.ai/api/v1",
    };
  }

  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return {
      name: "vercel-ai-gateway",
      apiKey: gatewayKey,
      baseUrl: process.env.AI_GATEWAY_BASE_URL?.trim() || "https://ai-gateway.vercel.sh/v1",
    };
  }

  return null;
}

export function isAIConfigured() {
  return Boolean(getProvider() && process.env.AI_MODEL?.trim());
}

export function getAIStatus() {
  const provider = getProvider();
  return {
    configured: Boolean(provider && process.env.AI_MODEL?.trim()),
    provider: provider?.name || null,
    model: process.env.AI_MODEL?.trim() || null,
    baseUrl: provider?.baseUrl || null,
  };
}

export async function callAI(
  messages: AIMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  const provider = getProvider();
  const model = process.env.AI_MODEL?.trim();

  if (!provider || !model) return null;

  const headers: Record<string, string> = {
    Authorization: "Bearer " + provider.apiKey,
    "Content-Type": "application/json",
  };

  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL || "https://fullstack.mabrigkorie.org";
    headers["X-Title"] = "Full Stack Master Class";
  }

  const response = await fetch(provider.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.25,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const providerLabel =
      provider.name === "openrouter" ? "OpenRouter" : "Vercel AI Gateway";
    throw new Error(providerLabel + " request failed with " + response.status);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

export function parseJsonObject<T = Record<string, unknown>>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
