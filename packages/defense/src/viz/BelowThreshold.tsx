import { useState } from 'react';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';

/** LEPR (%) with 1σ uncertainty, as stated in the paper's Methods. */
const STAGES = [
  { label: 'ML decoder, ensembled', d3: [1.37, 0.03], d5: [0.78, 0.04] },
  { label: '+ fine-tuned on experiment', d3: [1.33, 0.04], d5: [0.71, 0.04] },
  { label: '+ loss info, hybrid ML + MLE', d3: [1.33, 0.04], d5: [0.62, 0.03] },
] as const;

const NO_LOSS_PCT = 0.1;

const W = 640;
const H = 300;
const PAD = { l: 56, r: 16, t: 24, b: 64 };
const Y_MAX = 1.6;

function y(v: number): number {
  return PAD.t + (H - PAD.t - PAD.b) * (1 - v / Y_MAX);
}

export function BelowThreshold() {
  const [step, setStep] = useState(0);

  const steps: readonly StepDef[] = [
    {
      label: 'read the pairs',
      text: (
        <>
          Each pair of bars is the same dataset decoded the same way: gold is the small
          distance-3 surface code, cyan the distance-5 code. In every pair the bigger code has a{' '}
          <em>lower</em> logical error per round. That is the definition of operating below
          threshold: adding more physical qubits — more places for physical errors to happen —
          still makes the encoded qubit quieter.
        </>
      ),
    },
    {
      label: 'decoding is physics',
      text: (
        <>
          Read left to right: the atoms never change, only the software interpreting the
          parity checks does. Ensembling neural decoders, fine-tuning them on experimental
          shots, and finally folding in atom-loss (erasure) information with a hybrid
          maximum-likelihood decoder takes d = 5 from 0.78(4)% to 0.62(3)% per round. The
          final d = 5 / d = 3 ratio is 2.14(13)× — the paper&rsquo;s headline number.
        </>
      ),
    },
    {
      label: 'loss is half the budget',
      text: (
        <>
          The dashed line near the bottom: on shots where <em>no</em> atom was lost, the d = 5
          error per round falls toward ~0.1%. Roughly half the error budget is atoms physically
          leaving the trap — which is exactly why detecting loss and treating it as an erasure
          (a flagged error at a known location) is worth so much to the decoder.
        </>
      ),
    },
  ];

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="11"
        title="The headline number, drawn from the paper's stated values"
        caption={
          <>
            Logical error per round (LEPR) for d = 3 and d = 5 surface codes over a four-round
            characterization circuit, for three stages of the same decoding pipeline. All values
            and 1σ uncertainties are stated in the paper&rsquo;s Methods (ensembled machine
            learning: 1.37(3)% / 0.78(4)%; fine-tuned: 1.33(4)% / 0.71(4)%; hybrid with loss
            information, as reported in Fig. 2d: 1.33(4)% / 0.62(3)%, ratio 2.14(13)×). Dashed
            line: d = 5 shots with no detected atom loss approach ~0.1% per round. This chart
            redraws stated numbers; it is not a re-analysis of the released dataset.
          </>
        }
      >
        <Panel tag="a" title="Logical error per round vs code distance and decoder" wide>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="LEPR bar chart">
            {[0.5, 1.0, 1.5].map((v) => (
              <g key={v}>
                <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="#1d1e20" />
                <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fill="#9b9790" fontSize="11">
                  {v.toFixed(1)}
                </text>
              </g>
            ))}
            <text x={PAD.l - 8} y={y(0) + 4} textAnchor="end" fill="#9b9790" fontSize="11">
              0
            </text>
            <line x1={PAD.l} y1={y(0)} x2={W - PAD.r} y2={y(0)} stroke="#4f555c" />
            <text
              x={14}
              y={(y(0) + y(Y_MAX)) / 2}
              fill="#9b9790"
              fontSize="11"
              transform={`rotate(-90 14 ${(y(0) + y(Y_MAX)) / 2})`}
              textAnchor="middle"
            >
              LEPR (%)
            </text>

            <line
              x1={PAD.l}
              y1={y(NO_LOSS_PCT)}
              x2={W - PAD.r}
              y2={y(NO_LOSS_PCT)}
              stroke="#e8e4dc"
              strokeDasharray="5 4"
              opacity={step === 2 ? 0.9 : 0.35}
            />
            <text
              x={W - PAD.r - 4}
              y={y(NO_LOSS_PCT) - 6}
              textAnchor="end"
              fill="#e8e4dc"
              fontSize="10"
              opacity={step === 2 ? 1 : 0.5}
            >
              d = 5, shots with no loss (~0.1%)
            </text>

            {STAGES.map((stage, i) => {
              const groupW = (W - PAD.l - PAD.r) / STAGES.length;
              const gx = PAD.l + i * groupW + groupW / 2;
              const barW = 42;
              const bars = [
                { v: stage.d3[0], e: stage.d3[1], color: '#d4a24a', dx: -barW - 6, name: 'd = 3' },
                { v: stage.d5[0], e: stage.d5[1], color: '#6ea8d4', dx: 6, name: 'd = 5' },
              ];
              const highlight = step !== 1 || i === STAGES.length - 1 ? 1 : 0.85;
              return (
                <g key={stage.label} opacity={highlight}>
                  {bars.map((b) => (
                    <g key={b.name}>
                      <rect
                        x={gx + b.dx}
                        y={y(b.v)}
                        width={barW}
                        height={y(0) - y(b.v)}
                        fill={b.color}
                        opacity={0.85}
                      />
                      <line
                        x1={gx + b.dx + barW / 2}
                        y1={y(b.v - b.e)}
                        x2={gx + b.dx + barW / 2}
                        y2={y(b.v + b.e)}
                        stroke="#f4f1ea"
                        strokeWidth="1.4"
                      />
                      <text
                        x={gx + b.dx + barW / 2}
                        y={y(b.v) - 8}
                        textAnchor="middle"
                        fill="#e8e4dc"
                        fontSize="10.5"
                      >
                        {b.v.toFixed(2)}
                      </text>
                    </g>
                  ))}
                  <text x={gx} y={H - PAD.b + 18} textAnchor="middle" fill="#9b9790" fontSize="10.5">
                    {stage.label.split(', ').map((part, k) => (
                      <tspan key={part} x={gx} dy={k === 0 ? 0 : 13}>
                        {part}
                      </tspan>
                    ))}
                  </text>
                  {i === STAGES.length - 1 ? (
                    <text x={gx} y={PAD.t + 6} textAnchor="middle" fill="#c81e1e" fontSize="11.5" fontWeight="700">
                      ratio 2.14(13)×
                    </text>
                  ) : null}
                </g>
              );
            })}

            <g>
              <rect x={PAD.l + 6} y={PAD.t - 6} width={11} height={11} fill="#d4a24a" opacity={0.85} />
              <text x={PAD.l + 22} y={PAD.t + 4} fill="#9b9790" fontSize="11">
                d = 3
              </text>
              <rect x={PAD.l + 70} y={PAD.t - 6} width={11} height={11} fill="#6ea8d4" opacity={0.85} />
              <text x={PAD.l + 86} y={PAD.t + 4} fill="#9b9790" fontSize="11">
                d = 5
              </text>
            </g>
          </svg>
        </Panel>
      </Figure>
    </div>
  );
}
