export interface LabLayers {
  readonly envelope: boolean;
  readonly rays: boolean;
  readonly wavefronts: boolean;
  readonly labels: boolean;
  readonly polarization: boolean;
}

export const DEFAULT_LAYERS: LabLayers = {
  envelope: true,
  rays: true,
  wavefronts: true,
  labels: true,
  polarization: true,
};

export const LAYER_KEYS: readonly (keyof LabLayers)[] = [
  'envelope',
  'rays',
  'wavefronts',
  'labels',
  'polarization',
];

export const LAYER_LABEL: Record<keyof LabLayers, string> = {
  envelope: 'w(z)',
  rays: 'Rays',
  wavefronts: 'Phase',
  labels: 'Labels',
  polarization: 'Jones',
};

export type CameraPreset = 'oblique' | 'side' | 'top';
