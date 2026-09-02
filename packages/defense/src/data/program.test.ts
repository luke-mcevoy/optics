import { describe, expect, it } from 'vitest';
import {
  emptyActivity,
  evalActivity,
  EVENTS,
  INSTRUMENTS,
  PHASES,
  phaseAt,
  pulse,
  type Instrument,
} from './program.ts';

describe('run program (source of truth for Fig. 8 and its timeline)', () => {
  it('phases tile [0, 1] contiguously and in order', () => {
    expect(PHASES[0]?.window[0]).toBe(0);
    expect(PHASES[PHASES.length - 1]?.window[1]).toBe(1);
    for (let i = 1; i < PHASES.length; i += 1) {
      expect(PHASES[i]?.window[0]).toBeCloseTo(PHASES[i - 1]?.window[1] ?? NaN, 12);
      expect(PHASES[i]!.window[1]).toBeGreaterThan(PHASES[i]!.window[0]);
    }
  });

  it('every event window is well formed and inside the run', () => {
    for (const e of EVENTS) {
      expect(e.window[0]).toBeGreaterThanOrEqual(0);
      expect(e.window[1]).toBeLessThanOrEqual(1);
      expect(e.window[1]).toBeGreaterThan(e.window[0]);
      expect(INSTRUMENTS).toContain(e.inst);
    }
  });

  it('every instrument fires at least once', () => {
    const used = new Set<Instrument>(EVENTS.map((e) => e.inst));
    for (const k of INSTRUMENTS) expect(used.has(k), `${k} never fires`).toBe(true);
  });

  it('activity is always in [0, 1] and is 1 in the interior of a window', () => {
    const a = emptyActivity();
    for (let u = 0; u <= 1; u += 1 / 997) {
      evalActivity(u, a);
      for (const k of INSTRUMENTS) {
        expect(a[k]).toBeGreaterThanOrEqual(0);
        expect(a[k]).toBeLessThanOrEqual(1);
      }
    }
    evalActivity(0.5, a);
    expect(a.trapLaser).toBe(1);
    expect(a.slm).toBe(1);
    expect(a.ryd420).toBe(1);
    expect(a.shield).toBe(0);
  });

  it('a pulse is off outside its window and on in the middle', () => {
    expect(pulse(0.1, [0.2, 0.4])).toBe(0);
    expect(pulse(0.5, [0.2, 0.4])).toBe(0);
    expect(pulse(0.3, [0.2, 0.4])).toBe(1);
    expect(pulse(0.2, [0.2, 0.4])).toBe(0);
  });

  it('physics constraints the scene relies on', () => {
    const a = emptyActivity();
    // Both Rydberg colours are on together (two-photon gate) and never without the AWG.
    for (let u = 0; u <= 1; u += 1 / 1999) {
      evalActivity(u, a);
      expect(Math.abs(a.ryd420 - a.ryd1013)).toBeLessThan(1e-9);
      if (a.ryd420 > 0) expect(a.awgRydberg).toBeGreaterThan(0);
      // Raman light needs the 6.8 GHz source.
      if (a.ramanGlobal > 0 || a.ramanAod > 0) expect(a.microwave).toBeGreaterThan(0);
      // The shield is fully on whenever the readout zone is being imaged mid-circuit.
      if (u > 0.675 && u < 0.775) {
        expect(a.imaging).toBeGreaterThan(0.9);
        expect(a.shield).toBeGreaterThan(0.9);
      }
      // Traps never drop out once loaded (the loop's last frames fade for the wrap).
      if (u > 0.12 && u < 0.99) expect(a.trapLaser).toBe(1);
    }
  });

  it('phaseAt returns the enclosing phase', () => {
    for (const p of PHASES) {
      const mid = (p.window[0] + p.window[1]) / 2;
      expect(phaseAt(mid).id).toBe(p.id);
    }
  });
});
