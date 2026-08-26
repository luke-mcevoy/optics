# SESSION.md — AI handoff journal

Read this before starting work. Append a short dated entry after completing
significant work: what was done, key decisions, anything unresolved.
The project spec is `AGENTS.md` — it is binding.

---

## 2026-08-26 — Cursor agent (planning session)

**Done:**
- Wrote `AGENTS.md`: conversational optics learning tool. An LLM agent
  drives a live deterministic optics simulation (bench) via typed tools.
  Ramp: v1 Demonstrator → v2 Tutor → v3 Design partner → v4 real SKUs/BOM.
- Added Correctness Strategy (golden tests, property tests, cross-model
  consistency, agent claim-auditing) and Modular Architecture sections.
- `CLAUDE.md` is a one-line `@AGENTS.md` import so Claude Code shares the spec.

**Key decisions:**
- Components are data, not code: every element = declarative registry entry
  supplying `abcd / jones / transmission / aperture` traits. ONE generic
  `propagate()` fold; elements contain no propagation logic.
- Kernel language: TypeScript, in-browser, pure package (`packages/kernel`).
  FFT wave optics later may be Python/WASM but must not duplicate v1 physics.
- The bench schema (typed, serializable) is the single contract between
  agent tools, kernel, and UI.

**Unresolved / next:**
- Workstream 1 (in progress, dispatched via `ai`): repo scaffold +
  `packages/kernel` (units, Gaussian q, ABCD, Jones, overlap coupling,
  power budget) + golden and property tests. Verify by running the test
  suite before building anything on top.
- After kernel: bench schema + registry + propagate fold, then tools API,
  then UI.
