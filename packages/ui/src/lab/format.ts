export const formatMetres = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 0.01 || abs === 0) return `${fmt(value * 1e3)} mm`;
  if (abs >= 1e-6) return `${fmt(value * 1e6)} μm`;
  return `${fmt(value * 1e9)} nm`;
};

export const formatPower = (watts: number): string => {
  const abs = Math.abs(watts);
  if (abs >= 1) return `${fmt(watts)} W`;
  if (abs >= 1e-3) return `${fmt(watts * 1e3)} mW`;
  if (abs >= 1e-6) return `${fmt(watts * 1e6)} μW`;
  return `${fmt(watts * 1e9)} nW`;
};

export const formatPercent = (value: number): string => `${fmt(value * 100, 2)}%`;

export const formatNm = (metres: number): string => `${fmt(metres * 1e9, 0)} nm`;

export const formatCurvature = (metres: number): string => {
  if (!Number.isFinite(metres) || Math.abs(metres) > 50) return '∞  plane';
  const sign = metres < 0 ? '−' : '+';
  return `${sign}${formatMetres(Math.abs(metres))}`;
};

export const formatPolarization = (handedness: string, orientationRad: number, ellipticity: number): string => {
  if (handedness === 'linear') return `linear  ${fmt((orientationRad * 180) / Math.PI, 1)}°`;
  const hand = handedness === 'left' ? 'left-circ' : handedness === 'right' ? 'right-circ' : handedness;
  return `${hand}  |ε| ${fmt(Math.abs(ellipticity), 2)}`;
};

export const fmt = (value: number, digits = 3): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
