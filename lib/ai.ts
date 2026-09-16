export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionTelemetry = {
  content: string;
  provider: "openrouter" | "vercel-ai-gateway";
  model: string;
  requestedModel: string;
  fallbackUsed: boolean;
  latencyMs: number;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
};

type AIProvider = {
  name: "openrouter" | "vercel-ai-gateway";
  apiKey: string;
  baseUrl: string;
};

export class AIRequestError extends Error {
  status: number;
  code: string;
  provider: AIProvider["name"];

  constructor(provider: AIProvider["name"], status: number, code: string) {
    super(code);
    this.name = "AIRequestError";
    this.provider = provider;
    this.status = status;
    this.code = code;
  }
}

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

function fallbackModel() {
  return process.env.AI_FALLBACK_MODEL?.trim() || "openrouter/free";
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
    fallbackModel: provider?.name === "openrouter" ? fallbackModel() : null,
    baseUrl: provider?.baseUrl || null,
  };
}

function safeErrorCode(status: number) {
  if (status === 400) return "invalid-request";
  if (status === 401) return "invalid-api-key";
  if (status === 402) return "insufficient-credits";
  if (status === 403) return "provider-forbidden";
  if (status === 404) return "model-unavailable";
  if (status === 408) return "provider-timeout";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "provider-unavailable";
  return "provider-error";
}

export function getAIErrorCode(error: unknown) {
  return error instanceof AIRequestError ? error.code : "provider-error";
}

export async function validateAIConfiguration() {
  const status = getAIStatus();
  const provider = getProvider();

  if (!status.configured || !provider) {
    return {
      ...status,
      keyValid: false,
      modelAvailable: false,
      budgetAvailable: null,
      diagnostic: "not-configured",
    };
  }

  if (provider.name !== "openrouter") {
    return {
      ...status,
      keyValid: null,
      modelAvailable: null,
      budgetAvailable: null,
      diagnostic: "configured",
    };
  }

  try {
    const keyResponse = await fetch(provider.baseUrl + "/key", {
      headers: { Authorization: "Bearer " + provider.apiKey },
      cache: "no-store",
    });

    if (!keyResponse.ok) {
      return {
        ...status,
        keyValid: false,
        modelAvailable: null,
        budgetAvailable: null,
        diagnostic: safeErrorCode(keyResponse.status),
      };
    }

    const keyPayload = await keyResponse.json().catch(() => ({}));
    const remaining = keyPayload?.data?.limit_remaining;
    const budgetAvailable =
      typeof remaining === "number" ? remaining > 0 : null;

    const modelsResponse = await fetch(provider.baseUrl + "/models", {
      headers: { Authorization: "Bearer " + provider.apiKey },
      cache: "no-store",
    });
    const modelsPayload = await modelsResponse.json().catch(() => ({}));
    const modelAvailable =
      modelsResponse.ok &&
      Array.isArray(modelsPayload?.data) &&
      modelsPayload.data.some((item: any) => item?.id === status.model);

    return {
      ...status,
      keyValid: true,
      modelAvailable,
      budgetAvailable,
      diagnostic: modelAvailable ? "ready" : "model-unavailable",
    };
  } catch {
    return {
      ...status,
      keyValid: null,
      modelAvailable: null,
      budgetAvailable: null,
      diagnostic: "provider-unreachable",
    };
  }
}

function buildHeaders(provider: AIProvider) {
  const headers: Record<string, string> = {
    Authorization: "Bearer " + provider.apiKey,
    "Content-Type": "application/json",
  };

  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] =
      process.env.APP_URL || "https://fullstack.mabrigkorie.org";
    headers["X-OpenRouter-Title"] = "Full Stack Master Class";
  }

  return headers;
}

async function requestCompletion(
  provider: AIProvider,
  model: string,
  messages: AIMessage[],
  options: { temperature?: number; maxTokens?: number },
) {
  return fetch(provider.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: buildHeaders(provider),
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.25,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages,
    }),
    cache: "no-store",
  });
}

async function parseCompletionPayload(
  provider: AIProvider,
  response: Response,
  model: string,
  requestedModel: string,
  fallbackUsed: boolean,
  latencyMs: number,
): Promise<AICompletionTelemetry> {
  if (!response.ok) {
    throw new AIRequestError(
      provider.name,
      response.status,
      safeErrorCode(response.status),
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new AIRequestError(provider.name, 502, "empty-model-response");
  }

  const usage = data?.usage || {};
  const promptTokens =
    typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null;
  const completionTokens =
    typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null;
  const totalTokens =
    typeof usage?.total_tokens === "number"
      ? usage.total_tokens
      : promptTokens !== null && completionTokens !== null
        ? promptTokens + completionTokens
        : null;

  return {
    content,
    provider: provider.name,
    model,
    requestedModel,
    fallbackUsed,
    latencyMs,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
  };
}

async function extractCompletion(provider: AIProvider, response: Response) {
  if (!response.ok) {
    throw new AIRequestError(
      provider.name,
      response.status,
      safeErrorCode(response.status),
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new AIRequestError(provider.name, 502, "empty-model-response");
  }

  return content;
}

export async function callAIWithTelemetry(
  messages: AIMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    disableFallback?: boolean;
  } = {},
): Promise<AICompletionTelemetry | null> {
  const provider = getProvider();
  const requestedModel =
    options.model?.trim() || process.env.AI_MODEL?.trim() || "";

  if (!provider || !requestedModel) return null;

  const startedAt = Date.now();
  const primary = await requestCompletion(
    provider,
    requestedModel,
    messages,
    options,
  );

  if (
    !options.disableFallback &&
    provider.name === "openrouter" &&
    primary.status === 402 &&
    requestedModel !== fallbackModel()
  ) {
    const fallback = fallbackModel();
    const retryStartedAt = Date.now();
    const freeRetry = await requestCompletion(
      provider,
      fallback,
      messages,
      options,
    );
    return parseCompletionPayload(
      provider,
      freeRetry,
      fallback,
      requestedModel,
      true,
      Date.now() - retryStartedAt,
    );
  }

  return parseCompletionPayload(
    provider,
    primary,
    requestedModel,
    requestedModel,
    false,
    Date.now() - startedAt,
  );
}

export async function callAI(
  messages: AIMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  const result = await callAIWithTelemetry(messages, options);
  return result?.content || null;
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
