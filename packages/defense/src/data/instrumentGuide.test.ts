import { describe, expect, it } from 'vitest';
import { INSTRUMENT_GUIDE } from './instrumentGuide.ts';
import { emptyActivity, evalActivity, phaseAt } from './program.ts';

describe('guided instrument sequence', () => {
  it('uses the actual program events in chronological order', () => {
    expect(INSTRUMENT_GUIDE.map(stop => phaseAt(stop.time).id)).toEqual(['rearrange', 'local', 'cz', 'lattice', 'image', 'cool']);
    expect(INSTRUMENT_GUIDE.map(stop => stop.time)).toEqual(INSTRUMENT_GUIDE.map(stop => stop.time).sort((a, b) => a - b));
    for (const stop of INSTRUMENT_GUIDE) {
      const activity = emptyActivity(); evalActivity(stop.time, activity);
      expect(stop.focus.some(id => activity[id] > 0.5)).toBe(true);
      expect(stop.pins).toHaveLength(3);
    }
  });
});
