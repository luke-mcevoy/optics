import { describe, expect, it } from 'vitest';
import { OllamaChatProvider, parseToolCalls, type FetchFn } from '../src/providers/ollama.js';

describe('OllamaChatProvider', () => {
  it('parses a canned tool-call chat response without network I/O', async () => {
    const canned = {
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_abc',
            function: {
              name: 'measure',
              arguments: {
                quantity: 'waist_radius',
                at: { elementId: 'lens' },
              },
            },
          },
        ],
      },
    };

    const fetchImpl: FetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => canned,
    });

    const provider = new OllamaChatProvider({
      baseUrl: 'http://ollama.test',
      fetchImpl,
    });

    const response = await provider.chat([], []);
    expect(response.content).toBe('');
    expect(response.toolCalls).toEqual([
      {
        id: 'call_abc',
        name: 'measure',
        arguments: {
          quantity: 'waist_radius',
          at: { elementId: 'lens' },
        },
      },
    ]);
  });

  it('parses stringified function arguments', () => {
    expect(
      parseToolCalls([
        {
          function: {
            name: 'propagate',
            arguments: '{}',
          },
        },
      ]),
    ).toEqual([
      {
        id: 'call_0',
        name: 'propagate',
        arguments: {},
      },
    ]);
  });
});
