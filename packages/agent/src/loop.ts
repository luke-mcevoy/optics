import { AGENT_TOOL_DEFINITIONS } from './schema.js';
import type { BenchSession } from './executor.js';
import type {
  AgentEvent,
  ChatMessage,
  RunAgentTurnOptions,
  RunAgentTurnResult,
} from './types.js';

const DEFAULT_MAX_TOOL_CALLS = 12;

export async function runAgentTurn(opts: RunAgentTurnOptions): Promise<RunAgentTurnResult> {
  const tools = opts.tools ?? AGENT_TOOL_DEFINITIONS;
  const maxToolCalls = opts.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS;
  let messages: ChatMessage[] = [...opts.messages];
  let toolCallCount = 0;
  let assistantText: string | null = null;

  while (toolCallCount < maxToolCalls) {
    const response = await opts.provider.chat(messages, tools);

    if (response.toolCalls.length === 0) {
      assistantText = response.content ?? '';
      if (assistantText.length > 0) {
        emit(opts.onEvent, { type: 'assistant_text', content: assistantText });
      }
      messages = [...messages, { role: 'assistant', content: assistantText }];
      break;
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.content ?? '',
      tool_calls: response.toolCalls,
    };
    messages = [...messages, assistantMessage];

    if (response.content && response.content.length > 0) {
      emit(opts.onEvent, { type: 'assistant_text', content: response.content });
    }

    for (const call of response.toolCalls) {
      if (toolCallCount >= maxToolCalls) break;

      emit(opts.onEvent, {
        type: 'tool_call',
        id: call.id,
        name: call.name,
        arguments: call.arguments,
      });

      const execution = opts.session.execute(call.name, call.arguments);
      toolCallCount += 1;

      emit(opts.onEvent, {
        type: 'tool_result',
        id: call.id,
        name: call.name,
        execution,
      });

      messages = [
        ...messages,
        {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(execution),
        },
      ];
    }
  }

  // Tool budget exhausted mid-conversation: force one final text-only reply so
  // the user never gets a silent turn. Passing no tools prevents further calls.
  if (assistantText === null) {
    const finalResponse = await opts.provider.chat(messages, []);
    assistantText = finalResponse.content ?? '';
    if (assistantText.length > 0) {
      emit(opts.onEvent, { type: 'assistant_text', content: assistantText });
    }
    messages = [...messages, { role: 'assistant', content: assistantText }];
  }

  return { messages, assistantText, toolCallCount };
}

const emit = (onEvent: ((event: AgentEvent) => void) | undefined, event: AgentEvent): void => {
  onEvent?.(event);
};
