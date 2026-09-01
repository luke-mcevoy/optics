import { useMemo, useState } from 'react';
import { Claim } from '../components/Claim.tsx';
import { Slider } from '../components/Slider.tsx';
import { fmt } from '../lib/format.ts';
import { useCanvas } from '../lib/useCanvas.ts';
import { drawFocus, focusModel } from './beam.ts';

export function BeamFocus({ variant = 'board' }: { variant?: 'hero' | 'board' }) {
  const [fMm, setFMm] = useState(50);
  const [lambdaNm, setLambdaNm] = useState(780);
  const [wMm, setWMm] = useState(1);
  const model = useMemo(() => focusModel(fMm, lambdaNm, wMm), [fMm, lambdaNm, wMm]);
  const { wrap, canvas } = useCanvas((ctx, w, h, t) => {
    drawFocus(ctx, w, h, t, model, { showAxis: variant === 'board' });
  });
  const w0 =
    model.w0pMm < 0.1
      ? { value: fmt(model.w0pMm * 1e3), unit: 'μm' }
      : { value: fmt(model.w0pMm), unit: 'mm' };
  const zR =
    model.zRMm < 1
      ? { value: fmt(model.zRMm * 1e3), unit: 'μm' }
      : { value: fmt(model.zRMm), unit: 'mm' };

  return (
    <div className={variant === 'hero' ? 'viz viz-hero' : 'viz'}>
      <div className="viz-stage" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      {variant === 'board' ? (
        <>
          <div className="claims">
            <Claim symbol="w₀′" value={w0.value} unit={w0.unit} note="waist after the lens" />
            <Claim symbol="z_w" value={fmt(model.zWaistMm)} unit="mm" note="downstream of the lens" />
            <Claim symbol="z_R′" value={zR.value} unit={zR.unit} note="output Rayleigh range" />
          </div>
          <div className="controls">
            <Slider label="focal length" value={fMm} min={20} max={150} step={1} unit="mm" onChange={setFMm} />
            <Slider
              label="wavelength"
              value={lambdaNm}
              min={400}
              max={1550}
              step={10}
              unit="nm"
              onChange={setLambdaNm}
            />
            <Slider
              label="input spot"
              value={wMm}
              min={0.3}
              max={2.5}
              step={0.05}
              unit="mm"
              onChange={setWMm}
            />
          </div>
        </>
      ) : (
        <p className="viz-caption">
          Collimated {lambdaNm} nm, w = {fmt(wMm)} mm, f = {fMm} mm → waist {w0.value} {w0.unit} at z ={' '}
          {fmt(model.zWaistMm)} mm. Numbers from the Optics Studio kernel.
        </p>
      )}
    </div>
  );
}
