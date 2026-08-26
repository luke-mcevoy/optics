import { describe, expect, it } from 'vitest';
import * as j from '../src/jones.js';
import { cAbs, cAbs2 } from '../src/complex.js';
import { deg, rad, toDeg } from '../src/units.js';
import { mulberry32, uniform } from './rng.js';

describe('jones: golden — quarter-wave plate at 45 deg turns linear into circular', () => {
  // Hand calculation with J(delta, theta) = R(t) diag(e^-i d/2, e^+i d/2) R(-t):
  //   R(-45) [1, 0]^T = [0.70711, -0.70711]
  //   diag   => [0.70711 e^-i pi/4, -0.70711 e^+i pi/4]
  //   R(45)  => [cos(pi/4), -i sin(pi/4)] = [0.70711, -0.70711 i]
  // Equal amplitudes, 90 deg relative phase => circular.
  const out = j.applyJones(j.quarterWavePlate(deg(45)), j.HORIZONTAL);

  it('produces equal-amplitude x and y components', () => {
    expect(cAbs(out.x)).toBeCloseTo(Math.SQRT1_2, 12);
    expect(cAbs(out.y)).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it('produces exactly +/-90 deg of relative phase', () => {
    const relative = Math.atan2(out.y.im, out.y.re) - Math.atan2(out.x.im, out.x.re);
    expect(Math.abs(Math.sin(relative))).toBeCloseTo(1, 12);
    expect(Math.abs(Math.cos(relative))).toBeCloseTo(0, 12);
  });

  it('has |S3|/S0 = 1 and zero linear Stokes components', () => {
    const s = j.stokes(out);
    expect(s.S0).toBeCloseTo(1, 12);
    expect(s.S1).toBeCloseTo(0, 12);
    expect(s.S2).toBeCloseTo(0, 12);
    expect(Math.abs(s.S3)).toBeCloseTo(1, 12);
    expect(Math.abs(j.degreeOfCircularity(out))).toBeCloseTo(1, 12);
    expect(j.degreeOfPolarization(out)).toBeCloseTo(1, 12);
  });

  it('has an ellipticity of 1 (a circle), not merely a fat ellipse', () => {
    const e = j.ellipse(out);
    expect(Math.abs(e.ellipticity)).toBeCloseTo(1, 12);
    expect(Math.abs(toDeg(e.ellipticityAngle))).toBeCloseTo(45, 12);
    expect(e.handedness).not.toBe('linear');
  });

  it('conserves power (the plate is lossless)', () => {
    expect(j.intensity(out)).toBeCloseTo(j.intensity(j.HORIZONTAL), 12);
  });

  it('leaves polarization untouched when the axis is aligned with the input', () => {
    const aligned = j.applyJones(j.quarterWavePlate(deg(0)), j.HORIZONTAL);
    expect(Math.abs(j.degreeOfCircularity(aligned))).toBeCloseTo(0, 12);
    expect(cAbs2(aligned.y)).toBeCloseTo(0, 12);
  });

  it('closes the loop: circular back to linear through a second QWP at 45 deg', () => {
    const back = j.applyJones(j.quarterWavePlate(deg(45)), out);
    expect(j.ellipse(back).handedness).toBe('linear');
    expect(j.intensity(back)).toBeCloseTo(1, 12);
  });
});

describe('jones: polarizers and rotators', () => {
  it('obeys Malus law', () => {
    // Hand check: I/I0 = cos^2(30 deg) = 0.75 exactly.
    const out = j.applyJones(j.linearPolarizer(deg(30)), j.HORIZONTAL);
    expect(j.intensity(out)).toBeCloseTo(0.75, 12);
    // cos^2(60 deg) = 0.25
    expect(j.intensity(j.applyJones(j.linearPolarizer(deg(60)), j.HORIZONTAL))).toBeCloseTo(0.25, 12);
  });

  it('extinguishes crossed polarizers', () => {
    const crossed = j.composeJones(j.linearPolarizer(deg(0)), j.linearPolarizer(deg(90)));
    expect(j.intensity(j.applyJones(crossed, j.linear(deg(37))))).toBeCloseTo(0, 15);
  });

  it('passes 1/4 of the light through a 45 deg sheet inserted between crossed polarizers', () => {
    // Hand check: cos^2(45) * cos^2(45) = 0.25 of what the first polarizer passes.
    const stack = j.composeJones(
      j.linearPolarizer(deg(0)),
      j.linearPolarizer(deg(45)),
      j.linearPolarizer(deg(90)),
    );
    expect(j.intensity(j.applyJones(stack, j.HORIZONTAL))).toBeCloseTo(0.25, 12);
  });

  it('is idempotent for a repeated polarizer', () => {
    const once = j.linearPolarizer(deg(22.5));
    const twice = j.composeJones(once, once);
    expect(cAbs(twice.xx)).toBeCloseTo(cAbs(once.xx), 12);
    expect(cAbs(twice.yy)).toBeCloseTo(cAbs(once.yy), 12);
  });

  it('rotates linear polarization by 2*theta through a half-wave plate', () => {
    // Hand check: HWP fast axis at 22.5 deg maps 0 deg -> 45 deg.
    const out = j.applyJones(j.halfWavePlate(deg(22.5)), j.HORIZONTAL);
    expect(toDeg(j.ellipse(out).orientation)).toBeCloseTo(45, 9);
    expect(j.ellipse(out).handedness).toBe('linear');
    expect(j.intensity(out)).toBeCloseTo(1, 12);
  });

  it('splits 45 deg light evenly at an ideal PBS', () => {
    const input = j.linear(deg(45));
    const t = j.intensity(j.applyJones(j.pbsTransmitted(), input));
    const r = j.intensity(j.applyJones(j.pbsReflected(), input));
    expect(t).toBeCloseTo(0.5, 12);
    expect(r).toBeCloseTo(0.5, 12);
    expect(t + r).toBeCloseTo(j.intensity(input), 12); // ports are complementary
  });

  it('sends all of a horizontal input to the transmitted PBS port', () => {
    expect(j.intensity(j.applyJones(j.pbsTransmitted(), j.HORIZONTAL))).toBeCloseTo(1, 15);
    expect(j.intensity(j.applyJones(j.pbsReflected(), j.HORIZONTAL))).toBeCloseTo(0, 15);
  });
});

describe('jones: property — lossless elements are unitary', () => {
  it('holds for randomized waveplates and rotators', () => {
    const rnd = mulberry32(0xfeed);
    for (let i = 0; i < 500; i++) {
      const theta = rad(uniform(rnd, -Math.PI, Math.PI));
      const delta = rad(uniform(rnd, 0, 2 * Math.PI));
      for (const M of [
        j.waveplate(delta, theta),
        j.halfWavePlate(theta),
        j.quarterWavePlate(theta),
        j.rotator(theta),
        j.composeJones(j.quarterWavePlate(theta), j.halfWavePlate(rad(uniform(rnd, 0, Math.PI)))),
      ]) {
        expect(j.isUnitary(M, 1e-12)).toBe(true);
        expect(cAbs(j.detJones(M))).toBeCloseTo(1, 12);
      }
    }
  });

  it('conserves intensity through any lossless element (property)', () => {
    const rnd = mulberry32(0x2468);
    for (let i = 0; i < 500; i++) {
      const v = j.normalize(j.jonesVector(
        { re: uniform(rnd, -1, 1), im: uniform(rnd, -1, 1) },
        { re: uniform(rnd, -1, 1), im: uniform(rnd, -1, 1) },
      ));
      const M = j.waveplate(rad(uniform(rnd, 0, 2 * Math.PI)), rad(uniform(rnd, -Math.PI, Math.PI)));
      expect(j.intensity(j.applyJones(M, v))).toBeCloseTo(1, 12);
      expect(j.degreeOfPolarization(j.applyJones(M, v))).toBeCloseTo(1, 12);
    }
  });

  it('never increases intensity through a polarizer (property)', () => {
    const rnd = mulberry32(0x13579);
    for (let i = 0; i < 500; i++) {
      const v = j.normalize(j.jonesVector(
        { re: uniform(rnd, -1, 1), im: uniform(rnd, -1, 1) },
        { re: uniform(rnd, -1, 1), im: uniform(rnd, -1, 1) },
      ));
      const P = j.linearPolarizer(rad(uniform(rnd, -Math.PI, Math.PI)));
      expect(j.isUnitary(P, 1e-12)).toBe(false); // a polarizer is lossy by design
      expect(j.intensity(j.applyJones(P, v))).toBeLessThanOrEqual(j.intensity(v) + 1e-12);
      expect(j.maxTransmission(P)).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});

describe('jones: assumptions', () => {
  it('exports assumptions as data', () => {
    expect(j.ASSUMPTIONS.map((a) => a.id)).toContain('fully-polarized');
    expect(j.ELEMENT_ASSUMPTIONS['quarterWavePlate']?.map((a) => a.id)).toContain('lossless-element');
  });

  it('refuses to describe a zero field', () => {
    const zero = j.jonesVector({ re: 0, im: 0 }, { re: 0, im: 0 });
    expect(() => j.degreeOfCircularity(zero)).toThrow();
    expect(() => j.normalize(zero)).toThrow();
  });
});
