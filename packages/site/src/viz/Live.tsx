import type { LiveKind } from '../data/works.ts';
import { BeamFocus } from './BeamFocus.tsx';
import { Polarization } from './Polarization.tsx';
import { SparsePhotons } from './SparsePhotons.tsx';
import { Zeeman } from './Zeeman.tsx';

export function Live({ kind }: { kind: LiveKind }) {
  if (kind === 'beam') return <BeamFocus />;
  if (kind === 'jones') return <Polarization />;
  if (kind === 'zeeman') return <Zeeman />;
  return <SparsePhotons />;
}
