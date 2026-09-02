import { type ComponentType, lazy, Suspense } from 'react';

/**
 * The WebGL boards pull in three.js and its React bindings (~1 MB). They are split into
 * their own chunks so the article text paints first. Each placeholder is sized to the
 * board's measured desktop height so the page does not reflow when the chunk arrives.
 */
function board(load: () => Promise<{ default: ComponentType }>, minHeight: number): ComponentType {
  const Inner = lazy(load);
  return function LazyBoard() {
    return (
      <Suspense fallback={<div className="board board-loading" style={{ minHeight }} aria-busy="true" />}>
        <Inner />
      </Suspense>
    );
  };
}

export const Apparatus3D = board(() => import('./Apparatus3D.tsx').then((m) => ({ default: m.Apparatus3D })), 1250);
export const AtomLevels = board(() => import('./AtomLevels.tsx').then((m) => ({ default: m.AtomLevels })), 1137);
export const RamanStark = board(() => import('./RamanStark.tsx').then((m) => ({ default: m.RamanStark })), 1421);
export const RydbergBlockade = board(
  () => import('./RydbergBlockade.tsx').then((m) => ({ default: m.RydbergBlockade })),
  941,
);
export const SLMHologram = board(() => import('./SLMHologram.tsx').then((m) => ({ default: m.SLMHologram })), 906);
export const AODShuttle = board(() => import('./AODShuttle.tsx').then((m) => ({ default: m.AODShuttle })), 720);
export const Instrument3D = board(() => import('./Instrument3D.tsx').then((m) => ({ default: m.Instrument3D })), 1472);
export const Processor = board(() => import('./Processor.tsx').then((m) => ({ default: m.Processor })), 511);
export const MachineCycle = board(() => import('./MachineCycle.tsx').then((m) => ({ default: m.MachineCycle })), 630);
export const SpinToPosition = board(
  () => import('./SpinToPosition.tsx').then((m) => ({ default: m.SpinToPosition })),
  735,
);
export const SurfaceCode = board(() => import('./SurfaceCode.tsx').then((m) => ({ default: m.SurfaceCode })), 777);
