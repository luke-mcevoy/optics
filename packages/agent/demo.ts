/**
 * Terminal demo: a local LLM (Ollama qwen2.5:7b-instruct) drives the optics
 * bench through the @optics/agent tool loop, and the claim auditor checks
 * that every number in the answer came from a tool result.
 *
 * Run from packages/agent:
 *   npx tsx demo.ts "How small a spot does an f=50mm lens make from a 1mm 1064nm beam?"
 */
import { BenchSession } from './src/executor.js';
import { runAgentTurn } from './src/loop.js';
import { OllamaChatProvider } from './src/providers/ollama.js';
import { SYSTEM_PROMPT } from './src/systemPrompt.js';
import { auditClaims } from './src/audit.js';
import type { ToolExecution } from './src/types.js';

const question =
  process.argv.slice(2).join(' ') ||
  'Create a bench with a 1064 nm collimated Gaussian beam, waist radius 1 mm, M2=1, 1 W, linear x polarization, starting at z=0. Add a thin lens with focal length 50 mm at z=0. Where is the focused waist and how small is it?';

const provider = new OllamaChatProvider({ baseUrl: 'http://127.0.0.1:11434' });
const session = new BenchSession(() => {});
const executions: ToolExecution[] = [];

console.log(`Q: ${question}\n`);

const result = await runAgentTurn({
  provider,
  session,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ],
  onEvent: (event) => {
    if (event.type === 'tool_call') {
      console.log(`  tool> ${event.name} ${JSON.stringify(event.arguments).slice(0, 160)}`);
    } else if (event.type === 'tool_result') {
      executions.push(event.execution);
      const tag = event.execution.ok ? 'ok' : 'ERR';
      console.log(`     <- [${tag}] ${JSON.stringify(event.execution).slice(0, 160)}`);
    }
  },
});

console.log(`\n--- answer (${result.toolCallCount} tool calls) ---\n`);
console.log(result.assistantText ?? '(no text)');

if (result.assistantText) {
  const report = auditClaims(result.assistantText, executions);
  console.log(`\n--- grounding audit: ${report.ok ? 'ALL CLAIMS GROUNDED' : 'UNGROUNDED CLAIMS FOUND'} ---`);
  for (const claim of report.claims) {
    console.log(`  ${claim.grounded ? 'grounded  ' : 'UNGROUNDED'} ${claim.text}`);
  }
}
