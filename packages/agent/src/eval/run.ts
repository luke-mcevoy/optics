import { BenchSession } from '../executor.js';
import type { ToolExecution } from '../types.js';
import {
  BENCHMARK_SCENARIOS,
  matchesGolden,
  type EvalScenario,
  type ScenarioGolden,
  type ScenarioRunContext,
} from './scenarios.js';

export interface GoldenCheckResult {
  readonly label: string;
  readonly expected: number;
  readonly actual: number | undefined;
  readonly passed: boolean;
}

export interface ScenarioResult {
  readonly id: string;
  readonly description: string;
  readonly passed: boolean;
  readonly stepsSucceeded: number;
  readonly stepsTotal: number;
  readonly checks: readonly GoldenCheckResult[];
  readonly error?: string;
}

export interface EvalReport {
  readonly ok: boolean;
  readonly scenarios: readonly ScenarioResult[];
}

export function runScenarios(scenarios: readonly EvalScenario[] = BENCHMARK_SCENARIOS): EvalReport {
  const results = scenarios.map(runScenario);
  return {
    ok: results.every((result) => result.passed),
    scenarios: results,
  };
}

const runScenario = (scenario: EvalScenario): ScenarioResult => {
  const session = new BenchSession();
  const executions: ToolExecution[] = [];

  for (const step of scenario.steps) {
    const execution = session.execute(step.name, step.arguments);
    executions.push(execution);
    if (!execution.ok) {
      return {
        id: scenario.id,
        description: scenario.description,
        passed: false,
        stepsSucceeded: executions.length - 1,
        stepsTotal: scenario.steps.length,
        checks: [],
        error: execution.error,
      };
    }
  }

  const context: ScenarioRunContext = { session, executions };
  const checks = scenario.goldens.map((golden) => evaluateGolden(golden, context));
  return {
    id: scenario.id,
    description: scenario.description,
    passed: checks.every((check) => check.passed),
    stepsSucceeded: scenario.steps.length,
    stepsTotal: scenario.steps.length,
    checks,
  };
};

const evaluateGolden = (golden: ScenarioGolden, context: ScenarioRunContext): GoldenCheckResult => {
  const actual = golden.extract(context);
  const passed =
    actual !== undefined &&
    matchesGolden(actual, golden.expected, golden.rtol ?? 1e-6, golden.atol ?? 0);
  return {
    label: golden.label,
    expected: golden.expected,
    actual,
    passed,
  };
};
