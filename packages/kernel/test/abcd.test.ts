import { describe, expect, it } from 'vitest';
import * as ab from '../src/abcd.js';
import * as g from '../src/gaussian.js';
import { m, mm, nm, toM, toMm, um } from '../src/units.js';
import { mulberry32, logUniform, pick, uniform } from './rng.js';

describe('abcd: individual elements', () => {
  it('free space is [[1, d], [0, 1]]', () => {
    const M = ab.freeSpace(mm(250));
    expect(M.A).toBe(1);
    expect(M.B).toBeCloseTo(0.25, 15);
    expect(M.C).toBe(0);
    expect(M.D).toBe(1);
    expect(ab.det(M)).toBeCloseTo(1, 15);
  });

  it('a thin lens has C = -1/f', () => {
    // Hand check: f = 11 mm => C = -1/0.011 m = -90.9091 1/m
    const M = ab.thinLens(mm(11));
    expect(M.C).toBeCloseTo(-90.909090909, 6);
    expect(ab.det(M)).toBeCloseTo(1, 15);
  });

  it('a curved mirror of radius R focuses like a lens of f = R/2', () => {
    const mirror = ab.curvedMirror(mm(100));
    const lens = ab.thinLens(mm(50));
    expect(mirror.C).toBeCloseTo(lens.C, 12);
    expect(ab.det(mirror)).toBeCloseTo(1, 15);
  });

  it('a flat interface is [[1, 0], [0, n1/n2]] with det = n1/n2', () => {
    const M = ab.flatInterface(1, 1.5);
    expect(M.D).toBeCloseTo(1 / 1.5, 15);
    expect(ab.det(M)).toBeCloseTo(1 / 1.5, 15);
  });

  it('a curved interface reduces to a flat one as R -> Infinity', () => {
    const flat = ab.flatInterface(1, 1.45);
    const huge = ab.curvedInterface(m(Infinity), 1, 1.45);
    expect(huge.C).toBeCloseTo(flat.C, 15);
    expect(huge.D).toBeCloseTo(flat.D, 15);
  });
});

describe('abcd: golden — lensmaker equation from composed curved interfaces', () => {
  it('reproduces 1/f = (n - 1)(1/R1 - 1/R2) for a biconvex lens', () => {
    // Hand check: n = 1.5, R1 = +50 mm, R2 = -50 mm
    //   1/f = 0.5 * (1/0.05 + 1/0.05) = 20 1/m  => f = 50 mm
    const n = 1.5;
    const s1 = ab.curvedInterface(mm(50), 1, n);
    const s2 = ab.curvedInterface(mm(-50), n, 1);
    const lens = ab.compose(s1, s2);
    expect(lens.A).toBeCloseTo(1, 12);
    expect(lens.B).toBeCloseTo(0, 12);
    expect(lens.D).toBeCloseTo(1, 12);
    expect(lens.C).toBeCloseTo(-20, 12); // -1/f with f = 50 mm
    expect(ab.det(lens)).toBeCloseTo(1, 12);
    expect(-1 / lens.C).toBeCloseTo(0.05, 12);
  });

  it('matches the lensmaker equation for a plano-convex lens', () => {
    // Hand check: n = 1.515 (N-BK7 at 780 nm), R1 = 25.8 mm, R2 = flat
    //   1/f = 0.515/0.0258 = 19.9612 1/m  => f = 50.0971 mm
    const n = 1.515;
    const lens = ab.compose(ab.curvedInterface(mm(25.8), 1, n), ab.flatInterface(n, 1));
    expect(-1 / lens.C).toBeCloseTo(0.0500971, 7);
  });

  it('composes a thick lens as interface + gap + interface, det = 1', () => {
    const n = 1.5;
    const thick = ab.compose(
      ab.curvedInterface(mm(50), 1, n),
      ab.freeSpace(mm(5)),
      ab.curvedInterface(mm(-50), n, 1),
    );
    expect(ab.det(thick)).toBeCloseTo(1, 12);
    // Thick-lens focal length: 1/f = (n-1)[1/R1 - 1/R2 + (n-1)d/(n R1 R2)]
    //   = 0.5*[20 + 20 + 0.5*0.005/(1.5*0.05*(-0.05))] = 0.5*[40 - 0.66667]
    //   = 19.66667 1/m  => f = 50.8475 mm
    expect(-1 / thick.C).toBeCloseTo(0.0508475, 7);
  });
});

describe('abcd: imaging', () => {
  it('satisfies the imaging condition B = 0 with magnification -1 at 2f', () => {
    const f = mm(50);
    const system = ab.compose(ab.freeSpace(mm(100)), ab.thinLens(f), ab.freeSpace(mm(100)));
    expect(system.B).toBeCloseTo(0, 12);
    expect(system.A).toBeCloseTo(-1, 12); // transverse magnification
    expect(system.D).toBeCloseTo(-1, 12);
  });

  it('obeys 1/s_o + 1/s_i = 1/f for a general conjugate pair', () => {
    // Hand check: f = 50 mm, s_o = 75 mm => 1/s_i = 1/50 - 1/75 = 1/150
    //   s_i = 150 mm, magnification = -s_i/s_o = -2
    const system = ab.compose(ab.freeSpace(mm(75)), ab.thinLens(mm(50)), ab.freeSpace(mm(150)));
    expect(system.B).toBeCloseTo(0, 12);
    expect(system.A).toBeCloseTo(-2, 12);
  });

  it('collimates a point source placed at the front focus', () => {
    const system = ab.compose(ab.freeSpace(mm(50)), ab.thinLens(mm(50)));
    const out = ab.applyToRay(system, 0, 0.01); // ray from the axial focal point
    expect(out.u).toBeCloseTo(0, 15);
    expect(out.y).toBeCloseTo(0.0005, 15); // 50 mm * 0.01 rad
  });
});

describe('abcd: action on Gaussian beams', () => {
  it('a flat interface leaves the spot size unchanged and scales q by n2/n1', () => {
    // The unreduced convention pairs with the gaussian.ts q so that entering
    // glass leaves w continuous while zR grows by n2/n1.
    const beam = g.beamFromWaist(um(50), nm(1550));
    const at = g.propagate(beam, mm(5));
    const wBefore = toM(g.spotRadius(at));
    const after = ab.applyToBeam(ab.flatInterface(1, 1.5), at, 1.5);
    expect(toM(g.spotRadius(after))).toBeCloseTo(wBefore, 15);
    expect(after.q.re / at.q.re).toBeCloseTo(1.5, 12);
    expect(after.q.im / at.q.im).toBeCloseTo(1.5, 12);
  });

  it('a 3x beam expander triples the waist and thirds the divergence', () => {
    // Galilean expander: f1 = -25 mm, f2 = +75 mm, separation 50 mm => 3x.
    const beam = g.beamFromWaist(mm(0.5), nm(1064));
    const expander = ab.compose(
      ab.thinLens(mm(-25)),
      ab.freeSpace(mm(50)),
      ab.thinLens(mm(75)),
    );
    const out = ab.applyToBeam(expander, beam);
    const wIn = toM(g.waistRadius(beam));
    const wOut = toM(g.waistRadius(out));
    expect(wOut / wIn).toBeCloseTo(3, 3);
    const thetaIn = g.divergence(beam) as number;
    const thetaOut = g.divergence(out) as number;
    expect(thetaOut / thetaIn).toBeCloseTo(1 / 3, 3);
  });
});

describe('abcd: property — determinant equals n1/n2', () => {
  it('holds for randomized compositions', () => {
    const rnd = mulberry32(0xabcd);
    for (let trial = 0; trial < 300; trial++) {
      let nCurrent = pick(rnd, [1, 1.33, 1.45, 1.5, 1.76]);
      const nFirst = nCurrent;
      const parts: ab.ABCD[] = [];
      const count = 1 + Math.floor(rnd() * 6);
      for (let i = 0; i < count; i++) {
        const kind = pick(rnd, ['space', 'lens', 'mirror', 'flat', 'curved'] as const);
        if (kind === 'space') {
          parts.push(ab.freeSpace(m(logUniform(rnd, 1e-3, 1))));
        } else if (kind === 'lens') {
          parts.push(ab.thinLens(m(logUniform(rnd, 5e-3, 1) * (rnd() < 0.3 ? -1 : 1))));
        } else if (kind === 'mirror') {
          parts.push(ab.curvedMirror(m(logUniform(rnd, 1e-2, 2) * (rnd() < 0.3 ? -1 : 1))));
        } else {
          const nNext = pick(rnd, [1, 1.33, 1.45, 1.5, 1.76]);
          parts.push(
            kind === 'flat'
              ? ab.flatInterface(nCurrent, nNext)
              : ab.curvedInterface(m(logUniform(rnd, 1e-2, 1) * (rnd() < 0.5 ? -1 : 1)), nCurrent, nNext),
          );
          nCurrent = nNext;
        }
      }
      const system = ab.compose(...parts);
      expect(ab.det(system)).toBeCloseTo(nFirst / nCurrent, 9);
    }
  });

  it('gives det = 1 for same-index systems and is associative', () => {
    const rnd = mulberry32(0x1234);
    for (let trial = 0; trial < 200; trial++) {
      const a = ab.freeSpace(m(logUniform(rnd, 1e-3, 1)));
      const b = ab.thinLens(m(logUniform(rnd, 5e-3, 1)));
      const c = ab.curvedMirror(m(logUniform(rnd, 1e-2, 2)));
      expect(ab.det(ab.compose(a, b, c))).toBeCloseTo(1, 9);
      const left = ab.times(ab.times(c, b), a);
      const right = ab.times(c, ab.times(b, a));
      expect(left.A).toBeCloseTo(right.A, 9);
      expect(left.B).toBeCloseTo(right.B, 9);
      expect(left.C).toBeCloseTo(right.C, 9);
      expect(left.D).toBeCloseTo(right.D, 9);
    }
  });

  it('composes free space additively', () => {
    const rnd = mulberry32(0x777);
    for (let i = 0; i < 100; i++) {
      const d1 = uniform(rnd, 0, 2);
      const d2 = uniform(rnd, 0, 2);
      const composed = ab.compose(ab.freeSpace(m(d1)), ab.freeSpace(m(d2)));
      expect(composed.B).toBeCloseTo(d1 + d2, 12);
    }
  });
});

describe('abcd: assumptions', () => {
  it('exports per-element assumptions as data', () => {
    expect(ab.ELEMENT_ASSUMPTIONS['thinLens']?.map((a) => a.id)).toContain('thin-lens');
    expect(ab.ASSUMPTIONS.map((a) => a.id)).toContain('paraxial');
  });

  it('rejects degenerate parameters', () => {
    expect(() => ab.thinLens(mm(0))).toThrow();
    expect(() => ab.curvedMirror(mm(0))).toThrow();
    expect(() => ab.flatInterface(0, 1)).toThrow();
  });
});
