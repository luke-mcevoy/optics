export interface CatalogItem {
  readonly type: string;
  readonly label: string;
  readonly params: Record<string, number>;
}

export const CATALOG: readonly CatalogItem[] = [
  { type: 'thin_lens', label: 'Thin lens', params: { f: 0.05, diameter: 0.0254, T: 0.995 } },
  { type: 'aperture_iris', label: 'Iris', params: { diameter: 0.012, T: 1 } },
  { type: 'fiber_smf', label: 'SM fiber', params: { mfd: 0.000005, T: 1, offset: 0, tilt: 0 } },
  { type: 'waveplate_quarter', label: 'QWP', params: { theta: Math.PI / 4, diameter: 0.0254, T: 0.995 } },
  { type: 'waveplate_half', label: 'HWP', params: { theta: Math.PI / 8, diameter: 0.0254, T: 0.995 } },
  { type: 'polarizer_linear', label: 'Polarizer', params: { theta: 0, diameter: 0.0254, T: 1 } },
  { type: 'pbs', label: 'PBS', params: { diameter: 0.01, T: 1 } },
  { type: 'attenuator', label: 'Attenuator', params: { T: 0.5, diameter: 0.0127 } },
  { type: 'mirror_flat', label: 'Flat mirror', params: { R: 0.99, diameter: 0.0254 } },
  { type: 'mirror_curved', label: 'Curved mirror', params: { R: 0.1, R_power: 0.99, diameter: 0.0254 } },
];

export const PARAM_SPECS: Record<string, { readonly label: string; readonly unit: 'm' | 'rad' | '1'; readonly min: number; readonly max: number; readonly step: number }> = {
  f: { label: 'f', unit: 'm', min: 0.006, max: 0.15, step: 0.001 },
  T: { label: 'T', unit: '1', min: 0, max: 1, step: 0.005 },
  R: { label: 'R', unit: 'm', min: -0.5, max: 0.5, step: 0.001 },
  R_power: { label: 'R power', unit: '1', min: 0, max: 1, step: 0.01 },
  theta: { label: 'θ', unit: 'rad', min: 0, max: Math.PI, step: Math.PI / 180 },
  diameter: { label: 'Ø', unit: 'm', min: 0.00005, max: 0.04, step: 0.00005 },
  mfd: { label: 'MFD', unit: 'm', min: 0.000002, max: 0.000015, step: 0.0000001 },
  offset: { label: 'offset', unit: 'm', min: -0.00002, max: 0.00002, step: 0.0000001 },
  tilt: { label: 'tilt', unit: 'rad', min: -0.005, max: 0.005, step: 0.00001 },
};

export const Z_MIN = 0.002;
export const Z_MAX = 0.28;

export const labelForType = (type: string): string =>
  CATALOG.find((item) => item.type === type)?.label ?? type.replaceAll('_', ' ');
