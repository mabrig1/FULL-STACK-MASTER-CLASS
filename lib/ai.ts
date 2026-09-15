export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isAIConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && process.env.AI_MODEL);
}

export async function callAI(
  messages: AIMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_MODEL;
  const baseUrl = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";

  if (!apiKey || !model) return null;

  const response = await fetch(baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.25,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("AI Gateway request failed with " + response.status);
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
