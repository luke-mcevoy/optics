import { abcd, gaussian, units } from '@optics/kernel';

export interface FocusModel {
  readonly zs: Float64Array;
  readonly ws: Float64Array;
  readonly zMin: number;
  readonly zMax: number;
  readonly zWaistMm: number;
  readonly w0pMm: number;
  readonly zRMm: number;
  readonly wInMm: number;
}

export function focusModel(fMm: number, lambdaNm: number, wMm: number): FocusModel {
  const lambda = units.nm(lambdaNm);
  const w = units.mm(wMm);
  const f = units.mm(fMm);
  const incoming = gaussian.beamFromWR(w, units.m(Infinity), lambda);
  const after = abcd.applyToBeam(abcd.thinLens(f), incoming);
  const zWaistMm = units.toMm(gaussian.distanceToWaist(after));
  const w0pMm = units.toMm(gaussian.waistRadius(after));
  const zRMm = units.toMm(gaussian.rayleighRange(after));
  const zMin = -48;
  const zMax = Math.max(180, zWaistMm + 70);
  const n = 280;
  const zs = new Float64Array(n + 1);
  const ws = new Float64Array(n + 1);
  for (let i = 0; i <= n; i += 1) {
    const z = zMin + ((zMax - zMin) * i) / n;
    const beam =
      z < 0 ? gaussian.propagate(incoming, units.mm(z)) : gaussian.propagate(after, units.mm(z));
    zs[i] = z;
    ws[i] = units.toMm(gaussian.spotRadius(beam));
  }
  return { zs, ws, zMin, zMax, zWaistMm, w0pMm, zRMm, wInMm: wMm };
}

export function drawFocus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  model: FocusModel,
  opts: { showAxis: boolean },
): void {
  ctx.fillStyle = '#0c1014';
  ctx.fillRect(0, 0, w, h);

  const padL = opts.showAxis ? 44 : 16;
  const padR = 20;
  const padY = 28;
  const xOf = (z: number): number => padL + ((z - model.zMin) / (model.zMax - model.zMin)) * (w - padL - padR);
  const yMid = h / 2;
  const wMax = Math.max(model.wInMm * 1.25, 1.4);
  const yOf = (spot: number): number => (spot / wMax) * (h / 2 - padY);

  const lensX = xOf(0);
  const n = model.zs.length;

  ctx.beginPath();
  for (let i = 0; i < n; i += 1) {
    const x = xOf(model.zs[i] ?? 0);
    const y = yMid - yOf(model.ws[i] ?? 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    ctx.lineTo(xOf(model.zs[i] ?? 0), yMid + yOf(model.ws[i] ?? 0));
  }
  ctx.closePath();
  const glow = ctx.createLinearGradient(padL, 0, w - padR, 0);
  glow.addColorStop(0, 'rgba(94, 200, 229, 0.10)');
  glow.addColorStop(Math.max(0.05, (0 - model.zMin) / (model.zMax - model.zMin)), 'rgba(94, 200, 229, 0.22)');
  glow.addColorStop(Math.min(0.95, (model.zWaistMm - model.zMin) / (model.zMax - model.zMin)), 'rgba(245, 185, 66, 0.38)');
  glow.addColorStop(1, 'rgba(245, 185, 66, 0.08)');
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.strokeStyle = 'rgba(236, 228, 212, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const period = 4200;
  const u = ((t % period) / period) * (model.zMax - model.zMin) + model.zMin;
  const px = xOf(u);
  const packet = ctx.createRadialGradient(px, yMid, 0, px, yMid, 38);
  packet.addColorStop(0, 'rgba(245, 185, 66, 0.45)');
  packet.addColorStop(1, 'rgba(245, 185, 66, 0)');
  ctx.fillStyle = packet;
  ctx.fillRect(px - 40, yMid - 40, 80, 80);

  ctx.strokeStyle = 'rgba(236, 228, 212, 0.22)';
  ctx.beginPath();
  ctx.moveTo(padL, yMid);
  ctx.lineTo(w - padR, yMid);
  ctx.stroke();

  ctx.save();
  ctx.translate(lensX, yMid);
  ctx.strokeStyle = 'rgba(236, 228, 212, 0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, yOf(wMax) + 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const wx = xOf(model.zWaistMm);
  ctx.strokeStyle = 'rgba(245, 185, 66, 0.7)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(wx, yMid - yOf(model.w0pMm) - 8);
  ctx.lineTo(wx, yMid + yOf(model.w0pMm) + 8);
  ctx.stroke();
  ctx.setLineDash([]);

  if (opts.showAxis) {
    ctx.fillStyle = '#6d6558';
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('lens', lensX, h - 10);
    ctx.fillText('waist', wx, 16);
    ctx.textAlign = 'right';
    ctx.fillText('z', w - 8, yMid - 8);
  }
}
