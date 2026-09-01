import type { BenchSession } from './executor.js';
import type { JsonValue } from '@optics/bench';
import type { Provenance } from '@optics/tools';

export interface ToolExecutionSuccess {
  readonly ok: true;
  readonly result: JsonValue;
  readonly unit?: string;
  readonly provenance?: Provenance;
}

export interface ToolExecutionFailure {
  readonly ok: false;
  readonly error: string;
}

export type ToolExecution = ToolExecutionSuccess | ToolExecutionFailure;

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, JsonValue>;
}

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly ToolCall[];
}

export interface ChatResponse {
  readonly content: string | null;
  readonly toolCalls: readonly ToolCall[];
}

export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: JsonValue;
  };
}

export interface ChatProvider {
  chat(messages: readonly ChatMessage[], tools: readonly ToolDefinition[]): Promise<ChatResponse>;
}

export type AgentEvent =
  | { readonly type: 'assistant_text'; readonly content: string }
  | { readonly type: 'tool_call'; readonly id: string; readonly name: string; readonly arguments: Record<string, JsonValue> }
  | {
      readonly type: 'tool_result';
      readonly id: string;
      readonly name: string;
      readonly execution: ToolExecution;
    };

export interface RunAgentTurnOptions {
  readonly messages: readonly ChatMessage[];
  readonly provider: ChatProvider;
  readonly session: BenchSession;
  readonly tools?: readonly ToolDefinition[];
  readonly maxToolCalls?: number;
  readonly onEvent?: (event: AgentEvent) => void;
}

export interface RunAgentTurnResult {
  readonly messages: readonly ChatMessage[];
  readonly assistantText: string | null;
  readonly toolCallCount: number;
}
