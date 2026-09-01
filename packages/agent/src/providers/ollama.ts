import type { JsonValue } from '@optics/bench';
import type { ChatMessage, ChatProvider, ChatResponse, ToolCall, ToolDefinition } from '../types.js';

export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type FetchFn = (
  input: string,
  init?: {
    readonly method?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: string;
  },
) => Promise<FetchResponse>;

export interface OllamaChatOptions {
  readonly baseUrl: string;
  readonly model?: string;
  readonly fetchImpl?: FetchFn;
}

interface OllamaToolCall {
  readonly id?: string;
  readonly function?: {
    readonly name?: string;
    readonly arguments?: JsonValue;
  };
}

interface OllamaChatResponse {
  readonly message?: {
    readonly role?: string;
    readonly content?: string;
    readonly tool_calls?: readonly OllamaToolCall[];
  };
}

export class OllamaChatProvider implements ChatProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: FetchFn;

  public constructor(options: OllamaChatOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.model = options.model ?? 'qwen2.5:7b-instruct';
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
  }

  public async chat(
    messages: readonly ChatMessage[],
    tools: readonly ToolDefinition[],
  ): Promise<ChatResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(toWireMessage),
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const message = payload.message ?? {};
    return {
      content: message.content ?? null,
      toolCalls: parseToolCalls(message.tool_calls),
    };
  }
}

const defaultFetch: FetchFn = (...args) => {
  const candidate = globalThis as unknown as { fetch?: FetchFn };
  if (candidate.fetch === undefined) {
    throw new Error('fetch is unavailable; pass fetchImpl to OllamaChatProvider');
  }
  return candidate.fetch(...args);
};

const toWireMessage = (message: ChatMessage): Record<string, JsonValue> => {
  const wire: Record<string, JsonValue> = {
    role: message.role,
    content: message.content,
  };
  if (message.tool_call_id !== undefined) wire.tool_call_id = message.tool_call_id;
  if (message.tool_calls !== undefined) {
    wire.tool_calls = message.tool_calls.map((call) => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments: call.arguments,
      },
    }));
  }
  return wire;
};

export const parseToolCalls = (toolCalls: readonly OllamaToolCall[] | undefined): ToolCall[] => {
  if (!toolCalls) return [];
  return toolCalls.flatMap((entry, index) => {
    const name = entry.function?.name;
    if (typeof name !== 'string' || name.length === 0) return [];
    const parsedArgs = parseArguments(entry.function?.arguments);
    if (parsedArgs === null) return [];
    return [
      {
        id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : `call_${index}`,
        name,
        arguments: parsedArgs,
      },
    ];
  });
};

const parseArguments = (value: JsonValue | undefined): Record<string, JsonValue> | null => {
  if (value === undefined || value === null) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(value);
};

const asRecord = (value: unknown): Record<string, JsonValue> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, JsonValue>;
};
