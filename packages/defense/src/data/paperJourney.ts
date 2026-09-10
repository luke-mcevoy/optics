import { PAPER } from './paper.ts';

export const PAPER_URL = `https://www.nature.com/articles/s41586-025-09848-5`;
export const PAPER_STOPS = [
  {
    short: 'The paper', title: ['The Harvard–MIT', 'quantum', 'experiment.'],
    question: 'How do fragile atoms become a useful architecture?',
    body: 'This paper connects two essential jobs: computing with protected quantum information, and removing the errors that accumulate in the physical atoms. Follow the machine, then the experiments that test those ideas.',
    takeaway: 'A tour of this experiment: what they built, what they measured, and what is still ahead.',
    figure: 'Fig. 1a', figures: [1], anchor: '#thesis',
    model: 'Illustrated optical hardware; enlarged atoms and schematic layout. The scenes explain the paper’s mechanisms, not a reconstruction of laboratory geometry.',
    result: 'Reconfigurable arrays of up to 448 rubidium atoms implement the building blocks of a universal, fault-tolerant architecture.',
  },
  {
    short: 'Move the atoms', title: ['Atoms move.', 'The circuit changes.'],
    question: 'Fig. 1a · The reconfigurable logical processor',
    body: 'Laser traps hold the atoms in separate work areas. The team moves whole groups between storage, gates, and readout. A protected “logical qubit” lives in a pattern across a group, not in one atom.',
    takeaway: 'Move the highlighted block through the processor. The other blocks can stay protected while it is being read.',
    figure: 'Fig. 1a · Methods: system overview', figures: [1], anchor: '#zones',
    model: 'The paper’s four functional zones, shown schematically with a reduced atom count. Positions, routes, and animation times are illustrative.',
    result: 'An SLM supplies static traps; a two-dimensional AOD supplies movable traps. Storage, entangling, readout, and reservoir have different jobs.',
  },
  {
    short: 'Read & retain', title: ['Read the bit.', 'Keep the atom.'],
    question: 'Fig. 1b · A crucial readout upgrade',
    body: 'Instead of deliberately ejecting one state to tell 0 from 1, this experiment separates the two states into different positions. The atom can be kept and reused. If both positions are empty, the system can identify atom loss.',
    takeaway: 'Choose a state—or a lost atom—and follow how it becomes a camera record.',
    figure: 'Fig. 1b · Methods: spin-to-position conversion', figures: [1], anchor: '#readout',
    model: 'A staged diagram of spin-to-position readout. The state is selected for explanation; the camera spots are illustrations, not data or a sampled noise model.',
    result: 'The paper reports 0.46(4)% bit-flip error and 0.24(2)% atom loss for this readout. “Non-destructive” retains the atom, not its original superposition.',
  },
  {
    short: 'Suppress errors', title: ['A bigger code.', 'Fewer errors.'],
    question: 'Fig. 2d · The below-threshold result',
    body: 'More atoms introduce more opportunities for mistakes. Error correction earns its keep only if the larger pattern still protects the information better. In this experiment, the larger surface code did exactly that.',
    takeaway: 'Compare the two code sizes. These error rates are reported measurements, not an animation’s prediction.',
    figure: 'Fig. 2d · Methods: benchmarking', figures: [2], anchor: '#qec',
    model: 'A standard rotated surface-code diagram, not the experimental coordinates. Gold dots hold data; cyan dots are check atoms. The chart redraws reported results.',
    result: 'With loss information and the hybrid decoder, d = 5 had a 2.14(13)× lower logical error per round than d = 3 in the four-round characterization. No postselection in Fig. 2d.',
  },
  {
    short: 'Do logical gates', title: ['Whole blocks.', 'Parallel gates.'],
    question: 'Fig. 3 · Two routes to logical entanglement',
    body: 'The movable array lets matching atoms in two encoded blocks interact in parallel. The paper compares these transversal gates with lattice surgery, where measurements across a boundary perform the logical operation.',
    takeaway: 'Switch between the two arrangements. In one, data pairs do the gate; in the other, boundary measurements are part of the gate.',
    figure: 'Fig. 3 · Transversal gates and lattice surgery', figures: [3], anchor: '#logic',
    model: 'Mechanism diagrams with a reduced number of data atoms. They do not simulate logical fidelity or reproduce the full experimental circuits.',
    result: 'In the tested protocols, transversal operations were less sensitive to injected ancilla measurement errors. Their optimum was roughly three CNOTs per correction round.',
  },
  {
    short: 'Reach universality', title: ['Protected moves.', 'A universal toolkit.'],
    question: 'Fig. 4 · Transversal T gates and teleportation',
    body: 'A computer needs a sufficiently rich set of moves. The team uses Reed–Muller blocks with a protected T rotation, then logical teleportation to supply another essential move, H. Together with entangling gates, these enable general quantum computation.',
    takeaway: 'Follow how prepared helper blocks, gates, and measurements create the missing logical operation.',
    figure: 'Fig. 4a–d · Universal unitary synthesis', figures: [4], anchor: '#universal',
    model: 'A mechanism sketch, not reconstructed Bloch-sphere data. “3D code” refers to the code structure; the physical atom array remains planar.',
    result: 'The experiment demonstrated synthesis sequences with up to three T gates. Measurement-dependent corrections were handled in software, not real-time adaptive feedback.',
  },
  {
    short: 'Reset & reuse', title: ['Move the information.', 'Refresh the atoms.'],
    question: 'Figs. 5–6 · Mid-circuit reuse and deep computation',
    body: 'Teleport the encoded information into another block. The old block can then be measured, cooled, refilled, and prepared again while computation continues elsewhere. This makes physical reset part of the computational workflow.',
    takeaway: 'Step through a layer, then swap the roles of the blocks. The information continues; the used atoms get a fresh start.',
    figure: 'Figs. 5–6 · Deep-circuit protocols', figures: [5, 6], anchor: '#entropy',
    model: 'Two representative blocks with reduced atom counts illustrate alternating groups. No shot replay, entropy calculation, or logical-fidelity prediction. The counter follows the demonstrated layer limit.',
    result: 'Fig. 6 includes Steane-code runs up to 27 layers, and other runs with up to 96 logical qubits in [[16,6,4]] blocks. These are different experimental configurations.',
  },
] as const;

export const SURFACE_RESULTS = [
  { d: 3, errorPct: PAPER.qec.d3LeprPct, uncertaintyPct: 0.04 },
  { d: 5, errorPct: PAPER.qec.d5LeprPct, uncertaintyPct: PAPER.qec.d5LeprUnc },
] as const;

export type PatchCheck = { x: number; z: number; type: 'X' | 'Z'; support: number[] };
/** Standard rotated-code drawing: d² data sites and d²−1 check sites. */
export function rotatedPatch(d: 3 | 5) {
  const data = Array.from({ length: d * d }, (_, i) => ({ x: i % d - (d - 1) / 2, z: Math.floor(i / d) - (d - 1) / 2 }));
  const checks: PatchCheck[] = [];
  const add = (r: number, c: number, type: 'X' | 'Z') => {
    const support: number[] = [];
    for (const rr of [r, r + 1]) for (const cc of [c, c + 1]) if (rr >= 0 && rr < d && cc >= 0 && cc < d) support.push(rr * d + cc);
    checks.push({ x: c + 0.5 - (d - 1) / 2, z: r + 0.5 - (d - 1) / 2, type, support });
  };
  for (let r = 0; r < d - 1; r++) for (let c = 0; c < d - 1; c++) add(r, c, (r + c) % 2 === 0 ? 'X' : 'Z');
  for (let i = 0; i < d - 1; i++) {
    if (i % 2 === 1) { add(-1, i, 'X'); add(i, d - 1, 'Z'); }
    else { add(d - 1, i, 'X'); add(i, -1, 'Z'); }
  }
  return { data, checks };
}
