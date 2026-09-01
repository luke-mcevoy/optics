import type { Bench, JsonValue } from '@optics/bench';
import { units } from '@optics/kernel';
import {
  add_element,
  create_bench,
  explain,
  measure,
  propagate,
  remove_element,
  set_parameter,
  sweep,
  type Measurement,
  type Provenance,
  type SweepMeasurementPoint,
} from '@optics/tools';
import type { ToolExecution, ToolExecutionFailure, ToolExecutionSuccess } from './types.js';

const MAX_SWEEP_POINTS = 41;

export class BenchSession {
  private bench: Bench | null = null;

  public constructor(private readonly onBenchChange: (bench: Bench | null) => void = () => {}) {}

  public getBench(): Bench | null {
    return this.bench;
  }

  public execute(name: string, args: JsonValue): ToolExecution {
    try {
      return this.executeInner(name, asObject(args, name));
    } catch (error) {
      return failure(error);
    }
  }

  private executeInner(name: string, args: Record<string, JsonValue>): ToolExecution {
    switch (name) {
      case 'create_bench':
        return this.runMutating(() => create_bench(readSource(args)), () => benchSummary(this.bench));
      case 'add_element': {
        const id = optionalString(args.id);
        return this.runMutating(
          () =>
            add_element(requireBench(this.bench), {
              ...(id !== undefined ? { id } : {}),
              type: requiredString(requiredArg(args, 'type'), 'type'),
              position: requiredNumber(requiredArg(args, 'position'), 'position'),
              params: readParams(requiredArg(args, 'params')),
            }),
          () => benchSummary(this.bench),
        );
      }
      case 'set_parameter': {
        const elementId = requiredString(requiredArg(args, 'elementId'), 'elementId');
        const param = requiredString(requiredArg(args, 'param'), 'param');
        return this.runMutating(
          () => set_parameter(requireBench(this.bench), elementId, param, requiredArg(args, 'value')),
          () => ({ elementId, param, ...summaryRecord(this.bench) }),
        );
      }
      case 'remove_element': {
        const elementId = requiredString(requiredArg(args, 'elementId'), 'elementId');
        return this.runMutating(
          () => remove_element(requireBench(this.bench), elementId),
          () => ({ elementId, ...summaryRecord(this.bench) }),
        );
      }
      case 'propagate':
        return success(propagationSummary(propagate(requireBench(this.bench))));
      case 'measure':
        return measurementExecution(
          measure(requireBench(this.bench), {
            quantity: readQuantity(requiredArg(args, 'quantity')),
            at: readAt(args.at),
          }),
        );
      case 'sweep':
        return success(
          compactSweep(
            sweep(
              requireBench(this.bench),
              requiredString(requiredArg(args, 'elementId'), 'elementId'),
              requiredString(requiredArg(args, 'param'), 'param'),
              truncateSweepValues(requiredArg(args, 'values')),
            ),
          ),
        );
      case 'explain':
        return success(
          toJson(explain(requireBench(this.bench), readQuantity(requiredArg(args, 'quantity')), readAt(args.at))),
        );
      default:
        throw new Error(`unknown tool "${name}"`);
    }
  }

  private runMutating(mutate: () => Bench, summarize: () => JsonValue): ToolExecution {
    const next = mutate();
    this.bench = next;
    this.onBenchChange(next);
    return success(summarize());
  }
}

const success = (result: JsonValue, unit?: string, provenance?: Provenance): ToolExecutionSuccess => ({
  ok: true,
  result,
  ...(unit !== undefined ? { unit } : {}),
  ...(provenance !== undefined ? { provenance } : {}),
});

const failure = (error: unknown): ToolExecutionFailure => ({
  ok: false,
  error: error instanceof Error ? error.message : String(error),
});

const measurementExecution = (measurement: Measurement): ToolExecution =>
  success(measurement.value, measurement.unit, measurement.provenance);

const requireBench = (bench: Bench | null): Bench => {
  if (bench === null) throw new Error('no bench exists; call create_bench first');
  return bench;
};

const benchSummary = (bench: Bench | null): JsonValue => summaryRecord(bench);

const summaryRecord = (
  bench: Bench | null,
): { readonly elementCount: number; readonly elementIds: readonly string[] } => ({
  elementCount: bench?.elements.length ?? 0,
  elementIds: bench?.elements.map((element) => element.id) ?? [],
});

const propagationSummary = (result: ReturnType<typeof propagate>): JsonValue => {
  const bench = result.bench;
  const waistRadius = measure(bench, { quantity: 'waist_radius' });
  const waistPosition = measure(bench, { quantity: 'waist_position' });
  const finalPower = measure(bench, { quantity: 'power', at: { z: units.toM(result.final.z) } });
  return {
    elementCount: result.elements.length,
    finalZ: units.toM(result.final.z),
    finalPower: finalPower.value,
    waistRadius: waistRadius.value,
    waistPosition: waistPosition.value,
  };
};

const compactSweep = (points: readonly SweepMeasurementPoint[]): JsonValue =>
  points.map((point) => ({
    value: point.value,
    measures: Object.fromEntries(
      point.measures.map((entry) => [measureKey(entry), entry.value as JsonValue]),
    ),
  }));

const measureKey = (measurement: Measurement): string => {
  switch (measurement.provenance.function) {
    case 'gaussian.waistRadius':
      return 'waist_radius';
    case 'gaussian.distanceToWaist':
      return 'waist_position';
    case 'coupling.couplingToFiber':
      return 'coupling_efficiency';
    default:
      return measurement.provenance.function;
  }
};

const truncateSweepValues = (values: JsonValue): readonly number[] => {
  if (!Array.isArray(values)) throw new Error('values must be an array of numbers in metres or SI units');
  const numbers = values.map((value, index) => requiredNumber(value, `values[${index}]`));
  return numbers.length <= MAX_SWEEP_POINTS ? numbers : numbers.slice(0, MAX_SWEEP_POINTS);
};

const readSource = (args: Record<string, JsonValue>): Bench['source'] => {
  const source = asObject(args.source ?? args, 'source');
  return source as unknown as Bench['source'];
};

// Small models pass `null` for optional params they don't want and sometimes
// echo the element `type` inside params; both would poison the bench, so
// strip them here rather than rejecting the whole call.
const readParams = (value: JsonValue): Bench['elements'][number]['params'] => {
  if (value === undefined || value === null) return {};
  const raw = asObject(value, 'params');
  return Object.fromEntries(
    Object.entries(raw).filter(([key, entry]) => entry !== null && entry !== undefined && key !== 'type'),
  ) as Bench['elements'][number]['params'];
};

const readAt = (value: JsonValue | undefined): { readonly z?: number; readonly elementId?: string } => {
  if (value === undefined || value === null) return {};
  const at = asObject(value, 'at');
  const next: { readonly z?: number; readonly elementId?: string } = {
    ...(typeof at.elementId === 'string' ? { elementId: at.elementId } : {}),
    ...(typeof at.z === 'number' ? { z: at.z } : {}),
  };
  return next;
};

const readQuantity = (value: JsonValue): Parameters<typeof measure>[1]['quantity'] => {
  const quantity = requiredString(value, 'quantity');
  const allowed = [
    'waist_radius',
    'waist_position',
    'spot_radius',
    'power',
    'polarization_ellipse',
    'coupling_efficiency',
  ] as const;
  if (!(allowed as readonly string[]).includes(quantity)) {
    throw new Error(`quantity must be one of: ${allowed.join(', ')}`);
  }
  return quantity as Parameters<typeof measure>[1]['quantity'];
};

const requiredArg = (args: Record<string, JsonValue>, key: string): JsonValue => {
  if (!(key in args)) throw new Error(`${key} is required`);
  return args[key] as JsonValue;
};

const toJson = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value)) as JsonValue;

const asObject = (value: JsonValue, label: string): Record<string, JsonValue> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, JsonValue>;
};

const requiredString = (value: JsonValue, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
};

const optionalString = (value: JsonValue | undefined): string | undefined =>
  value === undefined || value === null ? undefined : requiredString(value, 'id');

const requiredNumber = (value: JsonValue, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
};
