import { describe, expect, it } from 'vitest';
import * as u from '../src/units.js';

describe('units: SI storage and round-trips', () => {
  it('stores lengths in metres regardless of the constructor used', () => {
    // 1064 nm = 1.064e-6 m; 50 mm = 0.05 m.
    expect(u.toM(u.nm(1064))).toBeCloseTo(1.064e-6, 18);
    expect(u.toM(u.mm(50))).toBeCloseTo(0.05, 15);
    expect(u.toM(u.um(5.2))).toBeCloseTo(5.2e-6, 18);
    expect(u.toM(u.cm(2.5))).toBeCloseTo(0.025, 15);
  });

  it('round-trips every length unit', () => {
    expect(u.toNm(u.nm(780))).toBeCloseTo(780, 9);
    expect(u.toUm(u.um(9.2))).toBeCloseTo(9.2, 12);
    expect(u.toMm(u.mm(11))).toBeCloseTo(11, 12);
    expect(u.toM(u.m(1.5))).toBe(1.5);
  });

  it('converts between length units', () => {
    // 1550 nm -> 1.55 um -> 1.55e-3 mm
    expect(u.toUm(u.nm(1550))).toBeCloseTo(1.55, 12);
    expect(u.toMm(u.nm(1550))).toBeCloseTo(1.55e-3, 15);
  });

  it('stores power in watts', () => {
    expect(u.toW(u.mW(10))).toBeCloseTo(0.01, 15);
    expect(u.toMW(u.W(1))).toBeCloseTo(1000, 9);
    expect(u.toUW(u.nW(2500))).toBeCloseTo(2.5, 12);
  });

  it('stores angles in radians', () => {
    // 45 deg = pi/4 rad = 0.7853981633974483
    expect(u.toRad(u.deg(45))).toBeCloseTo(Math.PI / 4, 15);
    expect(u.toDeg(u.rad(Math.PI))).toBeCloseTo(180, 12);
    expect(u.toRad(u.mrad(2))).toBeCloseTo(2e-3, 15);
    expect(u.toUrad(u.mrad(1))).toBeCloseTo(1000, 9);
  });

  it('keeps the brand through same-dimension arithmetic', () => {
    const total: u.Length = u.add(u.mm(50), u.mm(25));
    expect(u.toMm(total)).toBeCloseTo(75, 12);
    expect(u.toMm(u.sub(u.mm(50), u.um(500)))).toBeCloseTo(49.5, 12);
    expect(u.toMm(u.scale(u.mm(3), 2))).toBeCloseTo(6, 12);
    expect(u.ratio(u.mm(6), u.mm(2))).toBeCloseTo(3, 12);
    expect(u.toMm(u.sum([u.mm(1), u.mm(2), u.mm(3)], u.ZERO_LENGTH))).toBeCloseTo(6, 12);
    expect(u.toMm(u.abs(u.neg(u.mm(4))))).toBeCloseTo(4, 12);
  });
});

describe('units: cross-dimension mixing is a compile-time error', () => {
  // These assertions are checked by `tsc --noEmit`, which runs as part of
  // `npm test`. If the branding ever weakens, @ts-expect-error goes unused and
  // the type check fails loudly.
  it('rejects passing the wrong dimension', () => {
    // @ts-expect-error a Power is not a Length
    const bad1: u.Length = u.mW(10);
    // @ts-expect-error an Angle is not a Length
    const bad2: u.Length = u.deg(30);
    // @ts-expect-error a Length is not an Angle
    const bad3: u.Angle = u.mm(1);
    // @ts-expect-error toMm reads a Length, not a Power
    const bad4 = u.toMm(u.W(1));
    // @ts-expect-error add() requires both operands in the same dimension
    const bad5 = u.add(u.mm(1), u.W(1));
    // @ts-expect-error a raw number is not a branded Length
    const bad6: u.Length = 0.05;
    expect([bad1, bad2, bad3, bad4, bad5, bad6].length).toBe(6);
  });
});
