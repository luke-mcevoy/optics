import type { ReactNode } from 'react';

export type StepDef = {
  label: string;
  text: ReactNode;
};

/** Numbered walkthrough for a figure: chips, a "where to look" note, back/next. */
export function Steps({
  steps,
  current,
  onStep,
}: {
  steps: readonly StepDef[];
  current: number;
  onStep: (index: number) => void;
}) {
  const step = steps[current];
  return (
    <div className="steps">
      <div className="steps-row">
        {steps.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={i === current ? 'step-chip active' : 'step-chip'}
            onClick={() => onStep(i)}
          >
            <span className="step-num">{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>
      {step !== undefined ? (
        <div className="step-note">
          <p>{step.text}</p>
          <div className="step-nav">
            <button type="button" disabled={current === 0} onClick={() => onStep(current - 1)}>
              ← back
            </button>
            <span>
              {current + 1} / {steps.length}
            </span>
            <button
              type="button"
              disabled={current === steps.length - 1}
              onClick={() => onStep(current + 1)}
            >
              next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
