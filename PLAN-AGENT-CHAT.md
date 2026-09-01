# PLAN-AGENT-CHAT.md — v1 chat runtime: the LLM drives the bench

Read `AGENTS.md` first (it is binding), especially "The Core Loop", "The
Grounding Rule", and "UX Vision". This plan wires the missing piece of v1:
a chat panel beside the live bench where an LLM answers optics questions by
operating the bench through `@optics/tools`.

## Shared context (applies to every phase)

- Repo layout: `packages/kernel` (physics), `packages/bench` (schema +
  registry + propagate fold), `packages/tools` (typed tool layer +
  `TOOL_DESCRIPTORS`), `packages/ui` (Vite + React lab UI; `App.tsx` holds
  `bench` state and `useLabModel(bench)` renders it live).
- LLM provider: **local Ollama first** (`qwen2.5:7b-instruct`, already
  installed, supports native tool calling via `POST /api/chat` with a
  `tools` array). Optional OpenAI fallback only if `VITE_OPENAI_API_KEY`
  is set — do NOT require it.
- Browser → Ollama goes through a Vite dev proxy (`/ollama` →
  `http://127.0.0.1:11434`) to avoid CORS. Add it to
  `packages/ui/vite.config.ts`.
- **The grounding rule is architectural here**: the model never computes
  numbers; it calls tools and quotes results. Every tool result must be
  kept in the transcript and rendered inspectable in the UI.
- Bench-state injection: the wire descriptors in `packages/tools`
  (`TOOL_DESCRIPTORS`) take `bench` as an explicit argument. A 7B model
  must NOT be asked to echo the whole bench JSON — the runtime injects the
  current bench into every call and captures the returned bench from
  mutating calls (`create_bench`, `add_element`, `set_parameter`,
  `remove_element`). The tool schema shown to the model must omit the
  `bench` parameter entirely.
- Units: tool arguments are SI (metres, watts, radians). The system prompt
  must say this loudly with examples (`780 nm → 780e-9`, `f = 50 mm →
  0.05`) because small models will otherwise pass millimetres.
- Verification for every phase: `npm run typecheck` and `npm test` from
  the repo root are clean. Do NOT `git commit`. Do NOT leave processes
  running. Append a short dated entry to `SESSION.md` when done.

## Phase 1 — `packages/agent`: provider-agnostic tool-calling loop

New pure-TS workspace package `packages/agent` (mirror the tsconfig/vitest
setup of `packages/tools`; add it to the root workspace config the same way
the other packages are registered). No React, no DOM types.

1. `src/executor.ts` — a `BenchSession` class holding the current
   `Bench | null` plus an `onBenchChange(bench)` callback. Method
   `execute(name: string, args: JsonValue): ToolExecution` that:
   - maps each `@optics/tools` function; injects `this.bench` where the
     real signature needs it; updates `this.bench` and fires
     `onBenchChange` when the tool returns a new bench;
   - `propagate` returns a compact summary (element count, final z, final
     power, waist radius/position) — NOT the full PropagationResult, which
     would blow the 7B context;
   - `sweep` truncates `values` to ≤ 41 points and returns
     `{ value, measures }` rows compacted to numbers;
   - catches thrown errors and returns them as
     `{ ok: false, error: string }` so the model can self-correct
     (the tools layer already throws messages listing valid ids/types);
   - every success returns `{ ok: true, result, unit?, provenance? }`.
2. `src/schema.ts` — build OpenAI/Ollama-style JSON-schema tool
   definitions from scratch for the 8 tools (name, description,
   `parameters` as real JSON schema, `bench` omitted). Keep enums for
   `quantity` and the registered element types in the description text.
3. `src/loop.ts` — `runAgentTurn(opts)`: given transcript messages, a
   `ChatProvider`, and a `BenchSession`, loop: call provider → if the
   reply contains tool calls, execute each through the session, append
   tool-result messages, call again — until a plain text reply or 12 tool
   calls. Emits typed events via an `onEvent` callback:
   `{ type: 'assistant_text' | 'tool_call' | 'tool_result', ... }`.
4. `src/providers/ollama.ts` — `ChatProvider` impl: POST
   `{ model, messages, tools, stream: false }` to `${baseUrl}/api/chat`;
   parse `message.content` and `message.tool_calls`. `baseUrl` and `fetch`
   are constructor-injected for testability. Default model
   `qwen2.5:7b-instruct`.
5. `src/systemPrompt.ts` — the system prompt: role (optics tutor driving a
   live bench), the grounding rule verbatim ("never state a number you did
   not get from a tool result"), SI-unit rule with the two examples above,
   the registered element types and their params (hardcode from
   `packages/bench` registry docs), and instructions to state assumptions
   from `explain` results.
6. Tests (vitest, same pattern as `packages/tools`): executor injects and
   updates bench across create → add → measure; errors surface as
   `ok: false`; loop with a scripted fake provider executes tool calls and
   stops on plain text; ollama provider parses a canned tool-call response.

## Phase 2 — chat panel in `packages/ui`

1. Vite proxy `/ollama` → `http://127.0.0.1:11434` in
   `packages/ui/vite.config.ts`.
2. New `src/chat/ChatPanel.tsx` + `useAgentChat.ts` hook: owns transcript
   state, instantiates `BenchSession` wired to App's `bench`/`setBench`
   (agent mutations re-render the live canvas immediately — this is the
   product), calls `runAgentTurn` on submit, appends events as they
   arrive.
3. Render: user/assistant bubbles; each tool call as a compact card
   (tool name, key args, result value + unit) that expands on click to
   show full args, result JSON, and provenance. Distinct styling while a
   turn is in flight ("agent is driving the bench…"). Errors inline, not
   alerts.
4. Layout: chat docked left of the existing lab canvas per the AGENTS.md
   three-pane sketch; collapsible so the current UI remains usable
   full-width. Match the existing `styles.css` visual language.
5. Availability: on mount, ping `/ollama/api/tags`; if unreachable, show a
   quiet banner ("Start Ollama to chat: `ollama serve` +
   `ollama pull qwen2.5:7b-instruct`") and disable input — the lab must
   keep working without it.
6. A few suggested starter prompts as clickable chips, taken from the v1
   benchmark conversations in AGENTS.md (beam expander, f=50mm focus,
   fiber coupling).

## Phase 3 — grounding polish

1. Inline sweep plot: when a `sweep` tool result arrives, render a small
   SVG line chart in the chat card (param value vs coupling efficiency or
   waist radius — whichever the sweep returned) reusing the axis style of
   the lab overlay plots.
2. `explain` results render as a formula block: formula string, then a
   two-column symbol table with values + units, then assumption ids as
   muted chips.
3. Turn-level grounding audit (dev-only, console.warn): after each
   assistant text event, extract numeric literals from the text and warn
   if a number (within 5% relative tolerance, ignoring integers ≤ 12) has
   no match in that turn's tool results. This is the seed of the claim
   auditor in AGENTS.md — keep it simple and non-blocking.

## Constraints

- Do not modify `packages/kernel`, `packages/bench`, or `packages/tools`
  except: adding the new workspace reference where the repo already lists
  packages, if required.
- No new heavy dependencies. No LLM SDKs — plain `fetch` against Ollama.
- No network calls in tests; inject fakes.
- Do NOT `git commit`; the orchestrator reviews and commits.
- Leave no dev servers or Ollama processes running when done.
