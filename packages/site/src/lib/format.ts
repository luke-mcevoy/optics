/** Format a kernel number for display. Not a substitute for the value itself. */
export function fmt(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return '∞';
  const ax = Math.abs(x);
  if (ax !== 0 && (ax < 1e-3 || ax >= 1e4)) return x.toExponential(2);
  const s = x.toPrecision(digits);
  return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
