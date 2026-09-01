import type { ToolExecution } from './types.js';

const RELATIVE_TOLERANCE = 0.02;
const MIN_SCALE = -9;
const MAX_SCALE = 9;

/** Matches plain decimals and scientific notation (no thousands separators). */
const NUMBER_PATTERN = /(?<![\w.])(?:\d+\.\d+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w.])/g;

export interface ClaimAudit {
  readonly text: string;
  readonly value: number;
  readonly grounded: boolean;
  readonly matchedValue?: number;
  readonly scale?: number;
}

export interface AuditReport {
  readonly ok: boolean;
  readonly claims: readonly ClaimAudit[];
}

export function auditClaims(
  assistantText: string,
  toolExecutions: readonly ToolExecution[],
): AuditReport {
  const toolNumbers = collectToolNumbers(toolExecutions);
  const claims = extractNumericClaims(assistantText).map((claim) => {
    const match = findGrounding(claim.value, claim.isPercent, toolNumbers);
    return {
      text: claim.text,
      value: claim.value,
      grounded: match !== undefined,
      ...(match !== undefined ? { matchedValue: match.actual, scale: match.scale } : {}),
    };
  });

  return {
    ok: claims.every((claim) => claim.grounded),
    claims,
  };
}

interface ExtractedClaim {
  readonly text: string;
  readonly value: number;
  readonly isPercent: boolean;
}

interface GroundingMatch {
  readonly actual: number;
  readonly scale: number;
}

const extractNumericClaims = (text: string): ExtractedClaim[] => {
  const claims: ExtractedClaim[] = [];
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const raw = match[0];
    const index = match.index;
    if (raw === undefined || index === undefined) continue;

    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (shouldIgnoreClaim(value)) continue;

    const after = text.slice(index + raw.length).trimStart();
    claims.push({ text: raw, value, isPercent: after.startsWith('%') });
  }
  return claims;
};

const shouldIgnoreClaim = (value: number): boolean => {
  if (Number.isInteger(value) && Math.abs(value) <= 12) return true;
  if (Number.isInteger(value) && value >= 1900 && value <= 2099) return true;
  return false;
};

const collectToolNumbers = (executions: readonly ToolExecution[]): readonly number[] => {
  const numbers: number[] = [];
  for (const execution of executions) {
    if (!execution.ok) continue;
    collectNumericLeaves(execution.result, numbers);
  }
  return numbers;
};

const collectNumericLeaves = (value: unknown, out: number[]): void => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectNumericLeaves(entry, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) collectNumericLeaves(entry, out);
  }
};

const findGrounding = (
  claimed: number,
  isPercent: boolean,
  toolNumbers: readonly number[],
): GroundingMatch | undefined => {
  for (const actual of toolNumbers) {
    if (isPercent) {
      const scaled = actual * 100;
      if (withinTolerance(claimed, scaled)) {
        return { actual, scale: 2 };
      }
      continue;
    }

    for (let scale = MIN_SCALE; scale <= MAX_SCALE; scale += 1) {
      const scaled = actual * 10 ** scale;
      if (withinTolerance(claimed, scaled)) {
        return { actual, scale };
      }
    }
  }
  return undefined;
};

const withinTolerance = (claimed: number, reference: number): boolean => {
  const denominator = Math.max(Math.abs(reference), Math.abs(claimed), Number.EPSILON);
  return Math.abs(claimed - reference) / denominator <= RELATIVE_TOLERANCE;
};
