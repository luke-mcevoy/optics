import { describe, expect, it } from 'vitest';
import type { JsonValue } from '@optics/bench';
import { BenchSession } from '../src/executor.js';
import { runAgentTurn } from '../src/loop.js';
import type { ChatMessage, ChatProvider, ChatResponse, ToolDefinition } from '../src/types.js';

const createBenchArgs = (): JsonValue => ({
  source: {
    wavelength: 780e-9,
    waistRadius: 0.001,
    M2: 1,
    power: 0.001,
    polarization: { x: { re: 1, im: 0 }, y: { re: 0, im: 0 } },
    position: 0,
  },
});

class ScriptProvider implements ChatProvider {
  private index = 0;

  public constructor(private readonly script: ChatResponse[]) {}

  public async chat(_messages: readonly ChatMessage[], _tools: readonly ToolDefinition[]): Promise<ChatResponse> {
    const next = this.script[this.index];
    this.index += 1;
    if (next === undefined) throw new Error('script exhausted');
    return next;
  }
}

describe('runAgentTurn', () => {
  it('executes tool calls through the session and stops on plain text', async () => {
    const events: string[] = [];
    const session = new BenchSession();
    const provider = new ScriptProvider([
      {
        content: null,
        toolCalls: [
          {
            id: 'call_1',
            name: 'create_bench',
            arguments: createBenchArgs() as Record<string, JsonValue>,
          },
          {
            id: 'call_2',
            name: 'add_element',
            arguments: {
              id: 'lens',
              type: 'thin_lens',
              position: 0,
              params: { f: 0.05, T: 1 },
            },
          },
        ],
      },
      {
        content: 'The focused waist radius is available from measure().',
        toolCalls: [],
      },
    ]);

    const result = await runAgentTurn({
      messages: [{ role: 'user', content: 'Focus the beam with a 50 mm lens.' }],
      provider,
      session,
      onEvent: (event) => events.push(event.type),
    });

    expect(result.toolCallCount).toBe(2);
    expect(result.assistantText).toContain('waist radius');
    expect(session.getBench()?.elements.map((element) => element.id)).toEqual(['lens']);
    expect(events).toEqual(['tool_call', 'tool_result', 'tool_call', 'tool_result', 'assistant_text']);
    expect(result.messages.at(-1)).toEqual({
      role: 'assistant',
      content: 'The focused waist radius is available from measure().',
    });
  });

  it('forces a final text-only reply when the tool budget is exhausted', async () => {
    const toolTurn: ChatResponse = {
      content: null,
      toolCalls: [{ id: 'call', name: 'propagate', arguments: {} }],
    };
    const provider = new ScriptProvider([
      toolTurn,
      toolTurn,
      { content: 'I ran out of tool budget; here is what I found so far.', toolCalls: [] },
    ]);

    const session = new BenchSession();
    session.execute('create_bench', createBenchArgs());

    const events: string[] = [];
    const result = await runAgentTurn({
      messages: [{ role: 'user', content: 'Propagate forever.' }],
      provider,
      session,
      maxToolCalls: 2,
      onEvent: (event) => events.push(event.type),
    });

    expect(result.toolCallCount).toBe(2);
    expect(result.assistantText).toContain('tool budget');
    expect(events.at(-1)).toBe('assistant_text');
  });
});
