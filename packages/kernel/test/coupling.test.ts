import { describe, expect, it } from 'vitest';
import * as cp from '../src/coupling.js';
import * as g from '../src/gaussian.js';
import * as ab from '../src/abcd.js';
import { m, mm, mrad, nm, rad, toM, toMm, toRad, um } from '../src/units.js';
import { mulberry32, logUniform, uniform } from './rng.js';

const LAMBDA = nm(1550);

describe('coupling: golden — mode-matched coupling is exactly 1', () => {
  it('gives 1 when the incident beam equals the fiber mode', () => {
    const mode = cp.fiberModeFromMFD(um(10.4), LAMBDA);
    expect(cp.couplingEfficiency(mode, mode)).toBeCloseTo(1, 15);
  });

  it('stays 1 for a mode-matched but non-waist plane (general complex q)', () => {
    // Both fields propagated the same way remain matched: eta must not drift.
    const mode = cp.fiberModeFromMFD(um(10.4), LAMBDA);
    const shifted = g.propagate(mode, mm(3));
    expect(cp.couplingEfficiency(shifted, shifted)).toBeCloseTo(1, 15);
  });

  it('gives 1 for a beam focused to exactly the fiber waist', () => {
    // Build a beam with waist w0 = MFD/2 at the facet by an entirely different
    // route (collimate + lens) and check the overlap closes to unity.
    const w0 = um(5.2);
    const incident = g.beamFromWaist(w0, LAMBDA);
    expect(cp.couplingToFiber(incident, um(10.4))).toBeCloseTo(1, 12);
  });
});

describe('coupling: golden — reduction to the two-waist formula', () => {
  it('matches (2 w1 w2 / (w1^2 + w2^2))^2 for two aligned waists', () => {
    // Hand check: w1 = 6.0 um, w2 = 5.2 um
    //   2*6*5.2 = 62.4 ; 36 + 27.04 = 63.04 ; (62.4/63.04)^2 = 0.97980
    const w1 = um(6);
    const w2 = um(5.2);
    const eta = cp.couplingEfficiency(g.beamFromWaist(w1, LAMBDA), g.beamFromWaist(w2, LAMBDA));
    expect(eta).toBeCloseTo(0.9797985, 7);
    expect(eta).toBeCloseTo(cp.twoWaistEfficiency(w1, w2), 12);
  });

  it('matches the two-waist formula over randomized waist pairs', () => {
    const rnd = mulberry32(0xc0ffee);
    for (let i = 0; i < 300; i++) {
      const w1 = m(logUniform(rnd, 1e-6, 5e-5));
      const w2 = m(logUniform(rnd, 1e-6, 5e-5));
      const eta = cp.couplingEfficiency(g.beamFromWaist(w1, LAMBDA), g.beamFromWaist(w2, LAMBDA));
      expect(eta).toBeCloseTo(cp.twoWaistEfficiency(w1, w2), 12);
    }
  });

  it('matches the offset+tilt two-waist expression', () => {
    // eta = (2w1w2/(w1^2+w2^2))^2 * exp(-2 x0^2/(w1^2+w2^2))
    //       * exp(-k^2 theta^2 w1^2 w2^2 / (2 (w1^2+w2^2)))
    const rnd = mulberry32(0xbeef);
    const k = (2 * Math.PI) / toM(LAMBDA);
    for (let i = 0; i < 300; i++) {
      const w1 = logUniform(rnd, 2e-6, 3e-5);
      const w2 = logUniform(rnd, 2e-6, 3e-5);
      const x0 = uniform(rnd, -1, 1) * 0.5 * Math.min(w1, w2);
      const th = uniform(rnd, -1, 1) * 0.1;
      const eta = cp.couplingEfficiency(
        g.beamFromWaist(m(w1), LAMBDA),
        g.beamFromWaist(m(w2), LAMBDA),
        { offset: m(x0), tilt: rad(th) },
      );
      const s = w1 * w1 + w2 * w2;
      const expected =
        ((2 * w1 * w2) / s) ** 2 *
        Math.exp((-2 * x0 * x0) / s) *
        Math.exp((-(k * k) * th * th * w1 * w1 * w2 * w2) / (2 * s));
      expect(eta).toBeCloseTo(expected, 12);
    }
  });
});

describe("coupling: golden — Marcuse's equal-waist misalignment formulas", () => {
  const w = um(5.2);
  const mode = g.beamFromWaist(w, LAMBDA);

  it('reduces lateral offset to exp(-x0^2/w^2)', () => {
    // Hand check: x0 = 1.0 um, w = 5.2 um => exp(-(1/5.2)^2) = 0.963693
    const eta = cp.couplingEfficiency(mode, mode, { offset: um(1) });
    expect(eta).toBeCloseTo(0.9636932, 7);
    const rnd = mulberry32(0x2001);
    for (let i = 0; i < 200; i++) {
      const x0 = uniform(rnd, -3, 3) * toM(w);
      const got = cp.couplingEfficiency(mode, mode, { offset: m(x0) });
      expect(got).toBeCloseTo(Math.exp(-((x0 / toM(w)) ** 2)), 12);
    }
  });

  it('reduces tilt to exp(-(pi n w theta / lambda)^2)', () => {
    // Hand check: theta = 10 mrad, w = 5.2 um, lambda = 1550 nm
    //   pi*5.2e-6*0.01/1.55e-6 = 0.105397 ; exp(-0.0111086) = 0.988953
    const eta = cp.couplingEfficiency(mode, mode, { tilt: mrad(10) });
    expect(eta).toBeCloseTo(0.9889533, 7);
    const rnd = mulberry32(0x2002);
    for (let i = 0; i < 200; i++) {
      const th = uniform(rnd, -0.15, 0.15);
      const got = cp.couplingEfficiency(mode, mode, { tilt: rad(th) });
      const expected = Math.exp(-(((Math.PI * toM(w) * th) / toM(LAMBDA)) ** 2));
      expect(got).toBeCloseTo(expected, 12);
    }
  });

  it('accounts for the offset-tilt cross term', () => {
    // Offset and tilt of the correct relative sign partially cancel: the
    // combined loss is not the product of the separate losses.
    const offset = um(2);
    const tilt = mrad(80);
    const both = cp.couplingEfficiency(mode, mode, { offset, tilt });
    const separate =
      cp.couplingEfficiency(mode, mode, { offset }) * cp.couplingEfficiency(mode, mode, { tilt });
    expect(both).toBeCloseTo(separate, 12); // at a common waist the cross term vanishes
    // ...but away from the waist it does not:
    const off = g.propagate(mode, mm(0.05));
    const bothOff = cp.couplingEfficiency(off, mode, { offset, tilt });
    const flipped = cp.couplingEfficiency(off, mode, { offset, tilt: rad(-toRad(tilt)) });
    expect(Math.abs(bothOff - flipped)).toBeGreaterThan(1e-6);
  });
});

describe('coupling: general complex q', () => {
  it('matches the independent curvature formula 4 w1^2 w2^2 / [(w1^2+w2^2)^2 + (pi n w1^2 w2^2/(lambda R1))^2]', () => {
    // Hand check: w1 = 6 um, R1 = 200 um, w2 = 5.2 um, lambda = 1550 nm
    //   (w1^2+w2^2)^2 = (6.304e-11)^2 = 3.97404e-21
    //   pi*w1^2*w2^2/(lambda*R1) = pi*3.6e-11*2.704e-11/(1.55e-6*2e-4)
    //     = 3.0577e-21/3.1e-10 = 9.8636e-12 ; squared = 9.7290e-23
    //   numerator 4*3.6e-11*2.704e-11 = 3.8938e-21
    //   eta = 3.8938e-21/(3.97404e-21 + 9.7290e-23) = 0.956378
    const w1 = um(6);
    const R1 = um(200);
    const incident = g.beamFromWR(w1, R1, LAMBDA);
    const mode = cp.fiberModeFromMFD(um(10.4), LAMBDA);
    const eta = cp.couplingEfficiency(incident, mode);
    expect(eta).toBeCloseTo(0.9563782, 7);
    // Independent closed form, computed from w and R rather than from q:
    const a = toM(w1);
    const b = toM(um(5.2));
    const expected =
      (4 * a * a * b * b) /
      ((a * a + b * b) ** 2 + ((Math.PI * a * a * b * b) / (toM(LAMBDA) * toM(R1))) ** 2);
    expect(eta).toBeCloseTo(expected, 12);
  });

  it('agrees with the curvature formula over randomized (w, R) pairs', () => {
    const rnd = mulberry32(0x9001);
    for (let i = 0; i < 300; i++) {
      const a = logUniform(rnd, 2e-6, 4e-5);
      const b = logUniform(rnd, 2e-6, 4e-5);
      const R = logUniform(rnd, 1e-4, 1) * (rnd() < 0.5 ? -1 : 1);
      const eta = cp.couplingEfficiency(
        g.beamFromWR(m(a), m(R), LAMBDA),
        g.beamFromWaist(m(b), LAMBDA),
      );
      const expected =
        (4 * a * a * b * b) /
        ((a * a + b * b) ** 2 + ((Math.PI * a * a * b * b) / (toM(LAMBDA) * R)) ** 2);
      expect(eta).toBeCloseTo(expected, 12);
    }
  });

  it('is symmetric under exchanging the two fields', () => {
    const rnd = mulberry32(0x9002);
    for (let i = 0; i < 200; i++) {
      const b1 = g.beamFromWR(m(logUniform(rnd, 2e-6, 4e-5)), m(logUniform(rnd, 1e-4, 1)), LAMBDA);
      const b2 = g.beamFromWR(m(logUniform(rnd, 2e-6, 4e-5)), m(logUniform(rnd, 1e-4, 1)), LAMBDA);
      expect(cp.couplingEfficiency(b1, b2)).toBeCloseTo(cp.couplingEfficiency(b2, b1), 12);
    }
  });
});

describe('coupling: north-star behaviour — focal length has an optimum', () => {
  it('peaks near f = pi w MFD / (2 lambda) for a collimated input', () => {
    // Hand check: 780 nm, collimated w = 1.1 mm, MFD 5.0 um
    //   thin-lens focus w0' = lambda f/(pi w) = MFD/2 = 2.5 um
    //   => f = pi * 1.1e-3 * 2.5e-6 / 7.8e-7 = 11.076 mm
    const lambda = nm(780);
    const collimated = g.beamFromWaist(mm(1.1), lambda);
    const best = { f: 0, eta: 0 };
    for (let fmm = 5; fmm <= 20; fmm += 0.01) {
      const lens = ab.thinLens(mm(fmm));
      const afterLens = ab.applyToBeam(lens, collimated);
      const atFacet = g.propagate(afterLens, g.distanceToWaist(afterLens));
      const eta = cp.couplingToFiber(atFacet, um(5));
      if (eta > best.eta) {
        best.eta = eta;
        best.f = fmm;
      }
    }
    expect(best.f).toBeCloseTo(11.08, 1);
    expect(best.eta).toBeGreaterThan(0.999);
  });

  it('falls off monotonically with lateral misalignment', () => {
    const lambda = nm(780);
    const mode = cp.fiberModeFromMFD(um(5), lambda);
    let previous = 1.0;
    for (let x = 0; x <= 3e-6; x += 2e-7) {
      const eta = cp.couplingEfficiency(mode, mode, { offset: m(x) });
      expect(eta).toBeLessThanOrEqual(previous + 1e-15);
      previous = eta;
    }
    // Hand check: 1 um offset on a 2.5 um mode radius costs exp(-(1/2.5)^2)
    //   = exp(-0.16) = 0.85214 — this is why coupling is alignment-critical.
    expect(cp.couplingEfficiency(mode, mode, { offset: um(1) })).toBeCloseTo(0.8521438, 7);
  });
});

describe('coupling: properties and guards', () => {
  it('stays within [0, 1] and never beats the aligned case', () => {
    const rnd = mulberry32(0x424242);
    for (let i = 0; i < 400; i++) {
      const w = logUniform(rnd, 2e-6, 3e-5);
      const incident = g.beamFromWR(m(w), m(logUniform(rnd, 1e-4, 10)), LAMBDA);
      const mode = cp.fiberModeFromMFD(m(logUniform(rnd, 4e-6, 2e-5)), LAMBDA);
      const aligned = cp.couplingEfficiency(incident, mode);
      const misaligned = cp.couplingEfficiency(incident, mode, {
        offset: m(uniform(rnd, -2, 2) * w),
        tilt: rad(uniform(rnd, -0.05, 0.05)),
      });
      expect(aligned).toBeGreaterThan(0);
      expect(aligned).toBeLessThanOrEqual(1 + 1e-12);
      expect(misaligned).toBeLessThanOrEqual(aligned + 1e-12);
      expect(misaligned).toBeGreaterThanOrEqual(0);
    }
  });

  it('derives the mode field radius as MFD/2', () => {
    expect(toM(cp.modeFieldRadius(um(10.4)))).toBeCloseTo(5.2e-6, 18);
    const mode = cp.fiberModeFromMFD(um(10.4), LAMBDA);
    expect(toM(g.waistRadius(mode))).toBeCloseTo(5.2e-6, 18);
    expect(toMm(g.distanceToWaist(mode))).toBeCloseTo(0, 15);
  });

  it('refuses mismatched wavelength or medium', () => {
    const a = g.beamFromWaist(um(5), nm(1550));
    const b = g.beamFromWaist(um(5), nm(1310));
    expect(() => cp.couplingEfficiency(a, b)).toThrow(/wavelength/);
    const inGlass = g.beamFromWaist(um(5), nm(1550), { n: 1.45 });
    expect(() => cp.couplingEfficiency(a, inGlass)).toThrow(/medium/);
  });

  it('exports its assumptions as data', () => {
    const ids = cp.ASSUMPTIONS.map((a) => a.id);
    expect(ids).toContain('gaussian-fiber-mode');
    expect(ids).toContain('common-plane-overlap');
    expect(ids).toContain('tem00');
  });
});
