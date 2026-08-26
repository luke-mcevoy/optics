import { describe, expect, it } from 'vitest';
import * as g from '../src/gaussian.js';
import * as ab from '../src/abcd.js';
import { m, mm, nm, um, toDeg, toMm, toM, toRad, toUm } from '../src/units.js';
import { mulberry32, logUniform } from './rng.js';

describe('gaussian: golden — collimated 1064 nm beam focused by f = 50 mm', () => {
  // GOLDEN CASE (SESSION.md). Hand calculation:
  //   zR_in = pi*n*w^2/(M2*lambda0) = pi*(1e-3 m)^2/1.064e-6 m = 2.952625 m
  //   waist at the lens  => q_in = i*2.952625 m
  //   1/q' = 1/q_in - 1/f = -i/2.952625 - 1/0.05  = -20 - 0.338682i  1/m
  //   q'   = -0.04998567 + 0.00084646i  m
  //   waist lies at z = -Re(q') = 49.98566 mm past the lens
  //   zR_out = Im(q') = 0.8464616 mm
  //   w0'  = sqrt(lambda0*zR_out/pi) = sqrt(1.064e-6*8.464616e-4/pi)
  //        = 1.693166e-5 m = 16.93166 um
  // Thin-lens far-field shortcut for w >> w0':  lambda*f/(pi*w) = 16.9341 um,
  // 0.014% above the exact value — the expected sign and size of the error.
  const lambda0 = nm(1064);
  const beamAtLens = g.beamFromWaist(mm(1), lambda0);
  const focused = ab.applyToBeam(ab.thinLens(mm(50)), beamAtLens);

  it('puts the waist at 49.986 mm past the lens', () => {
    expect(toMm(g.distanceToWaist(focused))).toBeCloseTo(49.986, 2);
    expect(toMm(g.distanceToWaist(focused))).toBeCloseTo(49.98566, 4);
  });

  it('gives a waist radius of 16.931 um', () => {
    expect(toUm(g.waistRadius(focused))).toBeCloseTo(16.931, 2);
    expect(toUm(g.waistRadius(focused))).toBeCloseTo(16.93166, 4);
  });

  it('agrees with the analytic far-field waist to better than 0.02%', () => {
    const wAnalytic = (toM(lambda0) * 0.05) / (Math.PI * 1e-3);
    const wExact = toM(g.waistRadius(focused));
    expect(Math.abs(wAnalytic - wExact) / wExact).toBeLessThan(2e-4);
  });

  it('has a flat wavefront and zero Gouy phase at the new waist', () => {
    const atWaist = g.atWaist(focused);
    expect(toM(g.radiusOfCurvature(atWaist))).toBe(Infinity);
    expect(toDeg(g.gouyPhase(atWaist))).toBeCloseTo(0, 12);
    expect(toUm(g.spotRadius(atWaist))).toBeCloseTo(16.93166, 4);
  });

  it('recovers the input spot size when propagated back to the lens', () => {
    const backAtLens = g.propagate(focused, m(0));
    expect(toMm(g.spotRadius(backAtLens))).toBeCloseTo(1, 9);
  });
});

describe('gaussian: analytic identities', () => {
  it('w(zR) = w0 * sqrt(2) and R(zR) = 2 zR', () => {
    // Hand check: at one Rayleigh range the spot has grown by sqrt(2) = 1.41421
    // and the wavefront curvature is at its minimum, R = 2 zR.
    const beam = g.beamFromWaist(um(50), nm(780));
    const zR = g.rayleighRange(beam);
    // zR = pi*(50e-6)^2/780e-9 = 1.006920722e-2 m = 10.069207 mm
    expect(toMm(zR)).toBeCloseTo(10.069207223, 9);
    const at = g.propagate(beam, zR);
    expect(toUm(g.spotRadius(at))).toBeCloseTo(50 * Math.SQRT2, 9);
    expect(toMm(g.radiusOfCurvature(at))).toBeCloseTo(2 * toMm(zR), 9);
    expect(toDeg(g.gouyPhase(at))).toBeCloseTo(45, 12);
  });

  it('divergence obeys theta = M2*lambda0/(pi*n*w0)', () => {
    // Hand check: 1550 nm, w0 = 5.2 um, n = 1, M2 = 1
    //   theta = 1.55e-6/(pi*5.2e-6) = 0.094880831 rad = 94.880831 mrad
    const beam = g.beamFromWaist(um(5.2), nm(1550));
    expect(toRad(g.divergence(beam))).toBeCloseTo(0.094880831, 9);
    // far field: w(z) -> theta * z
    const far = g.propagate(beam, m(1));
    expect(toM(g.spotRadius(far)) / 1).toBeCloseTo(0.094880831, 5);
  });

  it('beamFromWR inverts spotRadius/radiusOfCurvature', () => {
    const beam = g.beamFromWaist(um(120), nm(633));
    const at = g.propagate(beam, mm(37));
    const rebuilt = g.beamFromWR(g.spotRadius(at), g.radiusOfCurvature(at), nm(633));
    expect(rebuilt.q.re).toBeCloseTo(at.q.re, 12);
    expect(rebuilt.q.im).toBeCloseTo(at.q.im, 12);
  });

  it('beamFromWR with R = Infinity reproduces a waist', () => {
    const beam = g.beamFromWR(um(9.2), m(Infinity), nm(1550));
    expect(toUm(g.waistRadius(beam))).toBeCloseTo(9.2, 12);
    expect(toM(g.distanceToWaist(beam))).toBeCloseTo(0, 15);
  });

  it('folds M2 into the beam parameter product', () => {
    const beam = g.beamFromWaist(um(300), nm(1064), { M2: 1.3 });
    expect(g.beamParameterProduct(beam)).toBeCloseTo((1.3 * 1.064e-6) / Math.PI, 15);
  });

  it('scales the Rayleigh range with the local index', () => {
    // Same physical waist inside glass: zR = pi*n*w0^2/lambda0 grows with n.
    const air = g.beamFromWaist(um(50), nm(1550));
    const glass = g.beamFromWaist(um(50), nm(1550), { n: 1.5 });
    expect(toM(g.rayleighRange(glass)) / toM(g.rayleighRange(air))).toBeCloseTo(1.5, 12);
  });
});

describe('gaussian: propagation is additive', () => {
  it('propagate(d1) then propagate(d2) equals propagate(d1 + d2)', () => {
    const beam = g.beamFromWaist(um(80), nm(1064), { M2: 1.2 });
    const d1 = mm(37);
    const d2 = mm(-12.5);
    const stepwise = g.propagate(g.propagate(beam, d1), d2);
    const oneShot = g.propagate(beam, mm(37 - 12.5));
    expect(stepwise.q.re).toBeCloseTo(oneShot.q.re, 15);
    expect(stepwise.q.im).toBeCloseTo(oneShot.q.im, 15);
    expect(toUm(g.spotRadius(stepwise))).toBeCloseTo(toUm(g.spotRadius(oneShot)), 12);
  });

  it('matches free-space ABCD propagation', () => {
    const beam = g.beamFromWaist(um(80), nm(1064));
    const viaQ = g.propagate(beam, mm(250));
    const viaABCD = ab.applyToBeam(ab.freeSpace(mm(250)), beam);
    expect(viaABCD.q.re).toBeCloseTo(viaQ.q.re, 15);
    expect(viaABCD.q.im).toBeCloseTo(viaQ.q.im, 15);
  });

  it('is additive over randomized distances (property)', () => {
    const rnd = mulberry32(0x5eed);
    for (let i = 0; i < 200; i++) {
      const beam = g.beamFromWaist(
        m(logUniform(rnd, 1e-6, 1e-2)),
        m(logUniform(rnd, 300e-9, 2000e-9)),
        { n: logUniform(rnd, 1, 2), M2: logUniform(rnd, 1, 3) },
      );
      const d1 = m(logUniform(rnd, 1e-4, 1) * (rnd() < 0.5 ? -1 : 1));
      const d2 = m(logUniform(rnd, 1e-4, 1) * (rnd() < 0.5 ? -1 : 1));
      const stepwise = g.propagate(g.propagate(beam, d1), d2);
      const oneShot = g.propagate(beam, m(toM(d1) + toM(d2)));
      expect(stepwise.q.re).toBeCloseTo(oneShot.q.re, 12);
      expect(stepwise.q.im).toBeCloseTo(oneShot.q.im, 12);
    }
  });
});

describe('gaussian: guards and assumptions', () => {
  it('rejects unphysical parameters', () => {
    expect(() => g.beamFromWaist(um(-1), nm(1064))).toThrow();
    expect(() => g.beamFromWaist(um(1), nm(1064), { M2: 0.5 })).toThrow();
    expect(() => g.beamFromWaist(um(1), nm(1064), { n: 0 })).toThrow();
  });

  it('declares its assumptions as data', () => {
    const ids = g.ASSUMPTIONS.map((a) => a.id);
    expect(ids).toContain('paraxial');
    expect(ids).toContain('tem00');
    expect(ids).toContain('scalar');
    for (const a of g.ASSUMPTIONS) expect(a.detail.length).toBeGreaterThan(20);
  });
});
