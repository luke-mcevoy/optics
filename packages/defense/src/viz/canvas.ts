/**
 * Size a 2D canvas for a `cssW × cssH` drawing surface at device resolution. By default the
 * element may shrink below `cssW` on narrow screens (keeping its aspect ratio); pass
 * `fixed` when pointer coordinates must map 1:1 onto drawing coordinates.
 */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  fixed = false,
): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = fixed ? `${cssH}px` : 'auto';
  canvas.style.maxWidth = fixed ? 'none' : '100%';
  canvas.style.aspectRatio = fixed ? '' : `${cssW} / ${cssH}`;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2d context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, fill = '#0c1014'): void {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
}

export function fft1d(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  let j = 0;
  for (let i = 0; i < n; i += 1) {
    if (i < j) {
      const tr = re[j] ?? 0;
      const ti = im[j] ?? 0;
      re[j] = re[i] ?? 0;
      im[j] = im[i] ?? 0;
      re[i] = tr;
      im[i] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const ang = ((inverse ? 2 : -2) * Math.PI) / size;
    const wr0 = Math.cos(ang);
    const wi0 = Math.sin(ang);
    for (let i = 0; i < n; i += size) {
      let wr = 1;
      let wi = 0;
      for (let k = 0; k < half; k += 1) {
        const even = i + k;
        const odd = even + half;
        const or = re[odd] ?? 0;
        const oi = im[odd] ?? 0;
        const tr = wr * or - wi * oi;
        const ti = wr * oi + wi * or;
        const er = re[even] ?? 0;
        const ei = im[even] ?? 0;
        re[odd] = er - tr;
        im[odd] = ei - ti;
        re[even] = er + tr;
        im[even] = ei + ti;
        const nwr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = nwr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i += 1) {
      re[i] = (re[i] ?? 0) / n;
      im[i] = (im[i] ?? 0) / n;
    }
  }
}

export function fft2d(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  const rowRe = new Float64Array(n);
  const rowIm = new Float64Array(n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const i = y * n + x;
      rowRe[x] = re[i] ?? 0;
      rowIm[x] = im[i] ?? 0;
    }
    fft1d(rowRe, rowIm, n, inverse);
    for (let x = 0; x < n; x += 1) {
      const i = y * n + x;
      re[i] = rowRe[x] ?? 0;
      im[i] = rowIm[x] ?? 0;
    }
  }
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      const i = y * n + x;
      rowRe[y] = re[i] ?? 0;
      rowIm[y] = im[i] ?? 0;
    }
    fft1d(rowRe, rowIm, n, inverse);
    for (let y = 0; y < n; y += 1) {
      const i = y * n + x;
      re[i] = rowRe[y] ?? 0;
      im[i] = rowIm[y] ?? 0;
    }
  }
}

export function fftShiftIndex(i: number, n: number): number {
  return (i + n / 2) % n;
}
