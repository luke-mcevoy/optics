# Optics Studio

Optics Studio is a conversational optics learning and design tool in which an LLM
agent drives a live, deterministic optics simulation to teach, demonstrate, and
eventually design optical systems. The user talks to the agent in natural
language; the agent answers by operating a simulated optical bench — placing
elements, propagating beams, taking measurements, and sweeping parameters — so
that every explanation is grounded in a running, inspectable simulation rather
than prose.

## Current status

v1 core is implemented and tested:

- **Physics kernel** (`@optics/kernel`) — units, Gaussian q-parameter, ABCD
  matrices, Jones polarization, fiber mode-overlap coupling, power budget; 80
  Vitest tests.
- **Bench** (`@optics/bench`) — serializable schema, declarative element registry
  (lens, mirrors, waveplates, polarizer, PBS, attenuator, iris, SMF fiber, beam
  expander), propagate fold, measurements, sweep; 16 tests.
- **Tools** (`@optics/tools`) — typed tools (`create_bench`, `add_element`,
  `set_parameter`, `remove_element`, `propagate`, `measure`, `sweep`, `explain`)
  with provenance on every numeric result; 7 tests.
- **Agent runtime** (`@optics/agent`) — `BenchSession`, `runAgentTurn`,
  `OllamaChatProvider` (default `qwen2.5:7b-instruct`), `auditClaims`, benchmark
  eval (`runScenarios`); 16 tests.

**UI** (`@optics/ui`) — React bench sandbox with live beam envelope and inspector;
3D lab view in active development. Chat panel wiring to the agent is not yet
integrated (`PLAN-AGENT-CHAT.md` Phase 2).

Not built: `optimize()` tool, Michelson interferometer elements, vendor catalogs.

## Packages

| Package | Description |
| --- | --- |
| `@optics/kernel` | Pure TypeScript v1 physics (Gaussian beams, ABCD, Jones, coupling, power). |
| `@optics/bench` | Bench schema, element registry traits, propagate fold, measurements, sweep. |
| `@optics/tools` | Agent-facing typed tools over bench/kernel with structured provenance. |
| `@optics/agent` | Tool-calling loop, Ollama provider, claim auditor, benchmark eval scenarios. |
| `@optics/ui` | Vite + React bench UI (manual sandbox and lab view; chat panel pending). |

## Quickstart

```bash
npm install
npm run typecheck
npm test
```

Per-workspace tests:

```bash
npm test --workspace @optics/kernel
npm test --workspace @optics/bench
npm test --workspace @optics/tools
npm test --workspace @optics/agent
```

Bench UI:

```bash
npm run dev --workspace @optics/ui
```

### Agent loop with local Ollama

```bash
ollama pull qwen2.5:7b-instruct
ollama serve   # if not already running
```

Quickest look — a terminal demo that prints tool calls, the answer, and the
grounding audit:

```bash
cd packages/agent
npx tsx demo.ts "Show me a 3x beam expander for a 780 nm beam."
```

The runtime itself is library code in `@optics/agent`. Wire
`OllamaChatProvider`, `BenchSession`, and `runAgentTurn` in your host:

```typescript
import {
  BenchSession,
  OllamaChatProvider,
  runAgentTurn,
  SYSTEM_PROMPT,
} from '@optics/agent';

const session = new BenchSession();
const provider = new OllamaChatProvider({ baseUrl: 'http://127.0.0.1:11434' });

const result = await runAgentTurn({
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: 'Focus 780 nm with f = 50 mm. Where is the waist?' },
  ],
  provider,
  session,
  onEvent: (event) => console.log(event),
});

console.log(result.assistantText);
```

Benchmark eval (five v1 scenarios with physics-derived goldens) runs in
`npm test --workspace @optics/agent`.

## Grounding and correctness

**Grounding rule:** the agent must not assert a quantitative claim it has not
computed — every number in prose must come from a `measure()`, `sweep()`, or
`explain()` tool result in that turn.

**Claim auditor:** `auditClaims()` extracts numeric literals from assistant text
and checks them against tool-result numbers within 2% relative tolerance with SI
unit scaling; ungrounded claims fail the audit.

## Specification

`AGENTS.md` is the binding spec: mission, core loop, modular element traits,
physics kernel scope, correctness strategy, and v1 benchmark conversations.
