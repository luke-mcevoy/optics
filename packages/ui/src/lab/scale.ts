/** World units are centimetres. Axial distances are true. Transverse beam size is magnified. */

export const M_TO_WORLD = 100;
export const BEAM_HEIGHT = 4.4;
export const TABLE_LENGTH = 36;
export const TABLE_WIDTH = 18;
export const TABLE_THICKNESS = 1.15;
export const TABLE_MARGIN = 4.2;
export const HOLE_PITCH = 2.5;

export const toWorld = (metres: number): number => metres * M_TO_WORLD;

export const opticX = (zMetres: number, zMinMetres: number): number =>
  TABLE_MARGIN + (zMetres - zMinMetres) * M_TO_WORLD - TABLE_LENGTH / 2;

export const worldXToZMetres = (x: number, zMinMetres: number): number =>
  zMinMetres + (x + TABLE_LENGTH / 2 - TABLE_MARGIN) / M_TO_WORLD;


/**
 * Teaching-scale 1/e² radius. A 1 mm collimated beam reads as ~2.3 cm;
 * a 17 μm waist still has a visible core instead of vanishing.
 */
export const visualRadius = (wMetres: number): number => {
  const wMm = Math.max(wMetres, 1e-9) * 1e3;
  return 0.1 + 1.25 * wMm ** 0.55;
};

export const wavelengthColor = (lambdaNm: number): string => {
  if (lambdaNm < 380) return '#8a62ff';
  if (lambdaNm < 450) return '#4f6dff';
  if (lambdaNm < 495) return '#2ec6ff';
  if (lambdaNm < 570) return '#3dff7a';
  if (lambdaNm < 590) return '#ffe14a';
  if (lambdaNm < 630) return '#ff8a1a';
  if (lambdaNm < 700) return '#ff2d3a';
  if (lambdaNm < 850) return '#ff1a3c';
  if (lambdaNm < 1100) return '#c41228';
  return '#8a1020';
};

export const wavelengthGlow = (lambdaNm: number): string => {
  if (lambdaNm < 495) return '#7ad8ff';
  if (lambdaNm < 570) return '#8affb0';
  if (lambdaNm < 630) return '#ffc878';
  if (lambdaNm < 850) return '#ff6a7a';
  return '#ff4458';
};
