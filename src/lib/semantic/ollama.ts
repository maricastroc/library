const BASE_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

export const EMBED_MODEL = process.env.ENTRELINHAS_EMBED_MODEL ?? "embeddinggemma";
export const CHAT_MODEL = process.env.ENTRELINHAS_CHAT_MODEL ?? "gemma4:e4b";

export class OllamaError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "model" | "response" | "timeout",
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new OllamaError("O modelo local demorou demais para responder.", "timeout");
    }
    throw new OllamaError("Não foi possível falar com o Ollama neste computador.", "unavailable");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const kind = response.status === 404 ? "model" : "response";
    throw new OllamaError(`Ollama respondeu ${response.status}: ${detail.slice(0, 200)}`, kind);
  }
  return (await response.json()) as T;
}

export function queryPrompt(text: string): string {
  return `task: search result | query: ${text}`;
}

export function documentPrompt(text: string, title?: string | null): string {
  return `title: ${title && title.trim() ? title.trim() : "none"} | text: ${text}`;
}

export function similarityPrompt(text: string): string {
  return `task: sentence similarity | query: ${text}`;
}

function normalize(vector: Float32Array): Float32Array {
  let norm = 0;
  for (let index = 0; index < vector.length; index += 1) norm += vector[index] * vector[index];
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  for (let index = 0; index < vector.length; index += 1) vector[index] /= norm;
  return vector;
}

export async function embedTexts(prompts: string[], timeoutMs = 60000): Promise<Float32Array[]> {
  if (prompts.length === 0) return [];
  const result: Float32Array[] = [];
  const batchSize = 16;
  for (let start = 0; start < prompts.length; start += batchSize) {
    const batch = prompts.slice(start, start + batchSize);
    const data = await post<{ embeddings?: number[][] }>(
      "/api/embed",
      { model: EMBED_MODEL, input: batch, truncate: true, keep_alive: "30m" },
      timeoutMs,
    );
    if (!data.embeddings || data.embeddings.length !== batch.length) {
      throw new OllamaError("O modelo de embeddings devolveu uma resposta incompleta.", "response");
    }
    for (const embedding of data.embeddings) result.push(normalize(Float32Array.from(embedding)));
  }
  return result;
}

export type ChatOptions = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
};

export function extractJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new OllamaError("O modelo local não devolveu um JSON.", "response");
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new OllamaError("O modelo local devolveu um JSON inválido.", "response");
  }
}

export async function chatJson<T>(options: ChatOptions): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await chatText({ ...options, temperature: (options.temperature ?? 0.2) + attempt * 0.2 });
      return extractJson(content) as T;
    } catch (error) {
      lastError = error;
      if (!(error instanceof OllamaError) || error.kind !== "response") throw error;
    }
  }
  throw lastError;
}

export async function chatText(options: ChatOptions): Promise<string> {
  const data = await post<{ message?: { content?: string } }>(
    "/api/chat",
    {
      model: options.model ?? CHAT_MODEL,
      stream: false,
      think: false,
      keep_alive: "30m",
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 200,
        num_ctx: 4096,
      },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    },
    options.timeoutMs ?? 60000,
  );
  const content = data.message?.content?.trim();
  if (!content) throw new OllamaError("O modelo local devolveu uma resposta vazia.", "response");
  return content;
}

export type OllamaStatus = {
  available: boolean;
  embedModel: string;
  chatModel: string;
  embedReady: boolean;
  chatReady: boolean;
};

export async function ollamaStatus(): Promise<OllamaStatus> {
  const base: OllamaStatus = {
    available: false,
    embedModel: EMBED_MODEL,
    chatModel: CHAT_MODEL,
    embedReady: false,
    chatReady: false,
  };
  try {
    const response = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return base;
    const data = (await response.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((model) => model.name);
    const has = (wanted: string) =>
      names.some((name) => name === wanted || name === `${wanted}:latest` || name.split(":")[0] === wanted);
    return { ...base, available: true, embedReady: has(EMBED_MODEL), chatReady: has(CHAT_MODEL) };
  } catch {
    return base;
  }
}
