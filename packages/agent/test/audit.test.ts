import { describe, expect, it } from 'vitest';
import { auditClaims } from '../src/audit.js';
import type { ToolExecution } from '../src/types.js';

const success = (result: number): ToolExecution => ({ ok: true, result });

describe('auditClaims', () => {
  it('passes when assistant prose quotes a grounded tool value', () => {
    const report = auditClaims('The focused waist is 16.93 um.', [
      success(16.93166e-6),
    ]);

    expect(report.ok).toBe(true);
    expect(report.claims).toHaveLength(1);
    expect(report.claims[0]?.grounded).toBe(true);
    expect(report.claims[0]?.matchedValue).toBeCloseTo(16.93166e-6, 12);
    expect(report.claims[0]?.scale).toBe(6);
  });

  it('fails when a numeric claim has no matching tool result', () => {
    const report = auditClaims('Coupling efficiency reaches 87.3%.', [success(0.42)]);

    expect(report.ok).toBe(false);
    expect(report.claims).toHaveLength(1);
    expect(report.claims[0]?.grounded).toBe(false);
    expect(report.claims[0]?.value).toBeCloseTo(87.3, 12);
  });

  it('matches unit-scaled um, nm, and percent claims against SI tool results', () => {
    const executions: ToolExecution[] = [
      success(49.98566e-3),
      success(1.064e-6),
      success(0.873),
    ];

    const report = auditClaims(
      'Waist lies 49.99 mm past the lens at 1064 nm with 87.3% coupling.',
      executions,
    );

    expect(report.ok).toBe(true);
    expect(report.claims.map((claim) => claim.value)).toEqual([49.99, 1064, 87.3]);
    for (const claim of report.claims) {
      expect(claim.grounded).toBe(true);
    }
    expect(report.claims[0]?.scale).toBe(3);
    expect(report.claims[1]?.scale).toBe(9);
    expect(report.claims[2]?.scale).toBe(2);
  });

  it('ignores small integers and year literals', () => {
    const report = auditClaims(
      'In 2024 we used 3 lenses and f = 50 mm; the waist is 16.93 um.',
      [success(0.05), success(16.93166e-6)],
    );

    expect(report.claims).toHaveLength(2);
    expect(report.claims.map((claim) => claim.value)).toEqual([50, 16.93]);
    expect(report.claims.every((claim) => claim.grounded)).toBe(true);
  });

  it('matches scientific notation claims', () => {
    const report = auditClaims('Wavelength 7.8e-7 m.', [success(780e-9)]);

    expect(report.ok).toBe(true);
    expect(report.claims[0]?.grounded).toBe(true);
    expect(report.claims[0]?.matchedValue).toBeCloseTo(780e-9, 15);
  });

  it('walks nested tool result objects for grounding', () => {
    const report = auditClaims('Final power is 0.95 mW.', [
      {
        ok: true,
        result: {
          elementCount: 2,
          finalPower: 0.00095,
          waistRadius: 0.003,
        },
      },
    ]);

    expect(report.ok).toBe(true);
    expect(report.claims[0]?.matchedValue).toBeCloseTo(0.00095, 12);
    expect(report.claims[0]?.scale).toBe(3);
  });
});
