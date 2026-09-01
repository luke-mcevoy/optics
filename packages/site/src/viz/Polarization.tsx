import { useMemo, useState } from 'react';
import { complex, jones, units } from '@optics/kernel';
import { Claim } from '../components/Claim.tsx';
import { Slider } from '../components/Slider.tsx';
import { fmt } from '../lib/format.ts';
import { useCanvas } from '../lib/useCanvas.ts';

export function Polarization() {
  const [thetaDeg, setThetaDeg] = useState(45);
  const state = useMemo(() => {
    const qwp = jones.quarterWavePlate(units.deg(thetaDeg));
    const out = jones.applyJones(qwp, jones.HORIZONTAL);
    const ell = jones.ellipse(out);
    const circ = jones.degreeOfCircularity(out);
    const s = jones.stokes(out);
    return { out, ell, circ, s };
  }, [thetaDeg]);

  const { wrap, canvas } = useCanvas((ctx, w, h, t) => {
    ctx.fillStyle = '#0c1014';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.32;
    ctx.strokeStyle = 'rgba(236, 228, 212, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r - 18, cy);
    ctx.lineTo(cx + r + 18, cy);
    ctx.moveTo(cx, cy - r - 18);
    ctx.lineTo(cx, cy + r + 18);
    ctx.stroke();
    ctx.fillStyle = '#6d6558';
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Ex', cx + r + 10, cy - 6);
    ctx.fillText('Ey', cx + 6, cy - r - 8);

    const omega = t * 0.004;
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 1) {
      const wt = (i / 180) * Math.PI * 2;
      const ex = r * complex.cAbs(state.out.x) * Math.cos(complex.cArg(state.out.x) - wt);
      const ey = r * complex.cAbs(state.out.y) * Math.cos(complex.cArg(state.out.y) - wt);
      if (i === 0) ctx.moveTo(cx + ex, cy - ey);
      else ctx.lineTo(cx + ex, cy - ey);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(201, 160, 255, 0.85)';
    ctx.stroke();

    const ex = r * complex.cAbs(state.out.x) * Math.cos(complex.cArg(state.out.x) - omega);
    const ey = r * complex.cAbs(state.out.y) * Math.cos(complex.cArg(state.out.y) - omega);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ex, cy - ey);
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.9)';
    ctx.stroke();
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.arc(cx + ex, cy - ey, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const circular = Math.abs(state.circ) > 0.98;

  return (
    <div className="viz">
      <div className="viz-stage viz-square" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <div className="claims">
        <Claim
          symbol="S₃/S₀"
          value={fmt(state.circ)}
          note={circular ? 'circular' : state.ell.handedness}
        />
        <Claim symbol="χ" value={fmt(units.toDeg(state.ell.ellipticityAngle))} unit="°" note="ellipticity angle" />
        <Claim
          symbol="ψ"
          value={circular ? '—' : fmt(units.toDeg(state.ell.orientation))}
          unit={circular ? undefined : '°'}
          note={circular ? 'undefined for circular' : 'major-axis azimuth'}
        />
      </div>
      <div className="controls">
        <Slider
          label="QWP fast axis"
          value={thetaDeg}
          min={0}
          max={90}
          step={1}
          unit="°"
          onChange={setThetaDeg}
        />
      </div>
    </div>
  );
}
