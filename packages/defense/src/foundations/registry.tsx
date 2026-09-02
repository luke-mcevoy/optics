import type { ReactNode } from 'react';
import { COOLING_SECTIONS } from './CoolingAndImaging.tsx';
import { ENTANGLEMENT_SECTIONS } from './Entanglement.tsx';
import { QEC_SECTIONS } from './ErrorCorrection.tsx';
import { LIGHT_SECTIONS } from './LightAndAtoms.tsx';
import { QUBIT_SECTIONS } from './Qubit.tsx';
import { RYDBERG_SECTIONS } from './Rydberg.tsx';
import { RUBIDIUM_ATOM_SECTIONS } from './RubidiumAtom.tsx';

export type FoundationSection = {
  id: string;
  title: string;
  kicker: string;
  body: ReactNode;
};

export type Foundation = {
  slug: string;
  title: string;
  kicker: string;
  /** One paragraph for the index card. */
  summary: string;
  /** Concepts the page assumes; slugs of other foundations pages. */
  needs: readonly string[];
  status: 'live' | 'planned';
  sections: readonly FoundationSection[];
};

export const FOUNDATIONS: readonly Foundation[] = [
  {
    slug: 'qubit',
    title: 'A qubit, physically',
    kicker: 'Two levels, a rotation, and what measurement does',
    summary:
      'Two-level systems, the Bloch sphere, superposition versus mixture, Rabi oscillation, detuning and phase.',
    needs: [],
    status: 'live',
    sections: QUBIT_SECTIONS,
  },
  {
    slug: 'rubidium-atom',
    title: 'Inside the rubidium atom',
    kicker: 'Where the qubit’s two levels come from, and why they ignore magnetic fields',
    summary:
      'Gross, fine and hyperfine structure; the nuclear and electron spins that make F and m_F; the Zeeman effect; why the m_F = 0 clock states are the qubit.',
    needs: [],
    status: 'live',
    sections: RUBIDIUM_ATOM_SECTIONS,
  },
  {
    slug: 'light-and-atoms',
    title: 'What light does to an atom',
    kicker: 'Light shifts, traps, scattering, selection rules, and two-photon transitions',
    summary:
      'The AC Stark shift and the dipole force that make a tweezer, why far-detuned light scatters less, σ± and π selection rules, optical pumping, and Raman transitions through a virtual level.',
    needs: ['rubidium-atom'],
    status: 'live',
    sections: LIGHT_SECTIONS,
  },
  {
    slug: 'cooling-and-imaging',
    title: 'Cooling and seeing atoms',
    kicker: 'From a hot vapour to a picture of single atoms',
    summary: 'Doppler cooling, the magneto-optical trap, sub-Doppler cooling, fluorescence imaging and photon statistics.',
    needs: ['light-and-atoms'],
    status: 'live',
    sections: COOLING_SECTIONS,
  },
  {
    slug: 'rydberg',
    title: 'Rydberg atoms',
    kicker: 'Why a highly excited atom is a giant and how giants talk',
    summary: 'Scaling laws with n, the van der Waals interaction, and the blockade that makes a gate.',
    needs: ['rubidium-atom'],
    status: 'live',
    sections: RYDBERG_SECTIONS,
  },
  {
    slug: 'entanglement',
    title: 'Entanglement and two-qubit gates',
    kicker: 'Correlations that no classical bits can have',
    summary: 'Correlation versus entanglement, CZ and CNOT, Bell tests, and what “fidelity” measures.',
    needs: ['qubit'],
    status: 'live',
    sections: ENTANGLEMENT_SECTIONS,
  },
  {
    slug: 'error-correction',
    title: 'Why error correction can work at all',
    kicker: 'Measuring parity without measuring the bit',
    summary:
      'Bit and phase flips, stabilizer measurements that do not collapse the state, code distance, thresholds, Clifford versus non-Clifford gates, magic states, Eastin–Knill and teleportation.',
    needs: ['entanglement'],
    status: 'live',
    sections: QEC_SECTIONS,
  },
];

export function findFoundation(slug: string | undefined): Foundation | undefined {
  return FOUNDATIONS.find((f) => f.slug === slug);
}
