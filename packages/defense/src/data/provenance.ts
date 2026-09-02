/**
 * Where every constant in `paper.ts` comes from.
 *
 * `path` is the dotted key into PAPER; `where` is the section of Bluvstein, Geim et al.
 * (Nature 649, 39–46, 2026) that states it; `quote` is a short verbatim fragment that the
 * test suite checks against the paper text when PAPER_TXT points at a `pdftotext` dump.
 * `kind` separates paper-stated values from values this site assumes or computes.
 * `docs/CLAIMS.md` is generated from this file (`npm run ledger`).
 */

export type Kind = 'paper' | 'assumed' | 'standard';

export type Provenance = {
  path: string;
  where: string;
  quote: string;
  kind?: Kind;
  note?: string;
};

const P = (path: string, where: string, quote: string, note?: string): Provenance =>
  note === undefined ? { path, where, quote, kind: 'paper' } : { path, where, quote, kind: 'paper', note };

export const PROVENANCE: readonly Provenance[] = [
  P('atoms', 'Abstract', 'up to 448 neutral atoms'),
  P('slm.wavelengthNm', 'Methods, System overview', '852-nm traps'),
  P('slm.model', 'Methods, System overview', 'X13138-02'),
  P('aod.model', 'Methods, System overview', 'DTSX-400'),
  P('imaging.na', 'Methods, System overview', '0.65-NA'),
  P('imaging.camera', 'Methods, System overview', 'ORCA-Quest C15550-20UP'),
  P('loadingPct', 'Methods, System overview', '75% (ref. 64)'),
  P('qubit.hyperfineGHz', 'Methods, System overview', '6.8-GHz source'),
  P('qubit.t2s', 'Methods, Error budget', 'coherence time in 852-nm traps is approximately 1–2 s', 'with dynamical decoupling'),
  P('qubit.trapT2s', 'Methods, Error budget', '1–2 s'),
  P('raman.globalRabiMHz', 'Methods, System overview', 'Rabi frequency of about 0.5 MHz'),
  P('raman.compositeUs', 'Methods, System overview', 'around 5 μs'),
  P('raman.intermediateDetuningGHz', 'Methods, System overview', '550 GHz'),
  P('raman.scatteringPerPulse', 'Methods, System overview', '5 × 10'),
  P('raman.localFidelityPct', 'Methods, Error budget', 'Local single-qubit gates have approximately 99.9% fidelity'),
  P('raman.localWaistUm', 'Methods, Local single-qubit gate details', '2.5 μm'),
  P('rydberg.n', 'Methods, System overview', 'n = 53'),
  P('rydberg.blueNm', 'Methods, System overview', '420-nm'),
  P('rydberg.irNm', 'Methods, System overview', '1,013-nm'),
  P('rydberg.gateNs', 'Methods, System overview', '270-ns'),
  P('rydberg.intermediateDetuningGHz', 'Methods, System overview', '4.8 GHz from the intermediate state'),
  P('rydberg.rabiMHz', 'Methods, Error budget', '4.6 MHz'),
  P('rydberg.czFidelityPct', 'Methods, Error budget', '99.6%'),
  P('zones', 'Main text; Fig. 1a', 'storage, entangling, readout and reservoir zones'),
  P('surface.readoutHeightUm', 'Methods, Surface code', '12 rows tall (55 μm)'),
  P('surface.arrayWidthUm', 'Methods, Surface code', 'total array width of 165 μm'),
  P('surface.rydbergRows', 'Methods, Surface code', 'tophat beams cover 7 rows'),
  P('surface.homogeneityPct', 'Methods, Surface code', 'homogenized to about 1%'),
  P('surface.homogeneityExtentUm', 'Methods, Surface code', 'vertical extent of 60 μm'),
  P('surface.zoneSepUm', 'Methods, Surface code', 'separated by 40 μm'),
  P('deep.entangleQubits', 'Methods, Deep circuits', 'up to 256 qubits'),
  P('deep.grid', 'Methods, Deep circuits', '8 rows'),
  P('deep.horizontalUm', 'Methods, Deep circuits', 'horizontal extent of 175 μm'),
  P('deep.entanglingHeightUm', 'Methods, Deep circuits', 'same 60 μm vertical'),
  P('deep.readoutAtoms', 'Methods, Deep circuits', 'up to 128 atoms'),
  P('deep.readoutRows', 'Methods, Deep circuits', 'arranged in four rows'),
  P('deep.reservoirAtoms', 'Methods, Deep circuits', 'up to 196 atoms'),
  P('deep.reservoirRows', 'Methods, Deep circuits', 'in six rows'),
  P('deep.storageSepUm', 'Methods, Deep circuits', '50 μm from the entangling zone'),
  P('deep.storageHeightUm', 'Methods, Deep circuits', 'beam waist of 35 μm'),
  P('deep.layers', 'Fig. 6 caption', 'up to 27 layers'),
  P('deep.circuitS', 'Methods, System overview', 'circuits as long as 1.1 s'),
  P('beams.imagingWaistUm', 'Methods, Deep circuits', 'waist 50 μm'),
  P('beams.latticeWaistUm', 'Methods, Deep circuits', 'average waist 60 μm'),
  P('beams.shieldWaistUm', 'Methods, Shielding beam', '35 μm × 65 μm'),
  P('beams.rydbergTophatUm', 'Methods, Surface code', 'vertical extent of 60 μm'),
  {
    path: 'beams.pairSpacingUm',
    where: 'Not in this paper',
    quote: '',
    kind: 'assumed',
    note: 'Intra-pair gate spacing taken from the group’s earlier gate work (ref. 36, Evered et al. 2023).',
  },
  P('lattice.wavelengthNm', 'Methods, Spin-to-position conversion', '795-nm'),
  P('lattice.d1BlueGHz', 'Methods, Spin-to-position conversion', '50–200 GHz blue-detuned'),
  P('lattice.brightShiftMHz', 'Methods, Spin-to-position conversion', 'approximately 6 MHz'),
  P('lattice.trapFreqKHz', 'Methods, Spin-to-position conversion', '300 kHz'),
  P('lattice.pumpNm', 'Methods, Spin-to-position conversion', '780-nm σ−-polarized'),
  P('lattice.rampUs', 'Methods, Spin-to-position conversion', 'approximately 100 μs'),
  P('lattice.splitUm', 'Methods, Spin-to-position conversion', 'approximately 2 μm'),
  P('lattice.splitUs', 'Methods, Spin-to-position conversion', '500 μs'),
  P('lattice.bitFlipPct', 'Fig. 1 caption / Methods', '0.46(4)%'),
  P('lattice.lossPct', 'Fig. 1 caption / Methods', '0.24(2)%'),
  P('lattice.darkErrPct', 'Methods, Spin-to-position conversion', '0.87(7)%'),
  P('lattice.brightErrPct', 'Methods, Spin-to-position conversion', '0.05(5)%'),
  P('cooling.wavelengthNm', 'Methods, Local cooling and imaging', '780-nm'),
  P('cooling.bFieldG', 'Methods, Local cooling and imaging', '8.6 G'),
  P('cooling.eitBlueMHz', 'Methods, Local cooling and imaging', 'about 80 MHz'),
  P('shield.resonanceNm', 'Methods, Shielding beam', '1,529.365'),
  P('shield.operateNm', 'Methods, Shielding beam', '1,529.49'),
  P('shield.powerW', 'Methods, Shielding beam', 'about 1.2 W'),
  P('shield.lightshiftGHz', 'Methods, Shielding beam', 'lightshift of 6 GHz'),
  P('control.awgs', 'Methods, System overview', 'five arbitrary waveform generators'),
  P('control.vendor', 'Methods, System overview', 'Spectrum'),
  P('control.jitterNs', 'Methods, System overview', 'less than 10-ns jitter'),
  P('control.qecRoundMs', 'Methods, Processor clock speed', '4.45 ms'),
  P('control.gateGapMs', 'Methods, Processor clock speed', '0.47 ms'),
  P('control.ancillaExchangeMs', 'Methods, Processor clock speed', '2.57 ms'),
  P('control.cnotCircuitMs', 'Methods, Processor clock speed', '17.7 ms'),
  P('control.cnotAvgMs', 'Methods, Processor clock speed', '0.655 ms'),
  P('control.teleportLayerMs', 'Methods, Processor clock speed', '41.9 ms'),
  P('control.fastCycleMs', 'Methods, Processor clock speed', 'cycle time of 4 ms'),
  P('qec.belowThreshold', 'Abstract; Fig. 2d', '2.14(13)'),
  P('qec.lossMlGain', 'Fig. 2 caption', '1.73(13)'),
  P('qec.d5LeprPct', 'Fig. 2d', '0.62(3)%'),
  P('qec.d3LeprPct', 'Methods, Benchmarking', '1.33(4)%'),
  P('qec.noLossLeprPct', 'Main text, Below-threshold performance', 'towards 0.1% per round'),
  P('qec.leakageIsLossPct', 'Main text', '80%'),
  P('qec.shots', 'Methods, Benchmarking', '14,855 shots'),
  P('qec.detectorsPerShot', 'Methods, Benchmarking', '96'),
  P('logic.optimalCnotsPerRound', 'Fig. 3 caption', 'optimum of roughly three CNOTs'),
  P('logic.surgeryRounds', 'Fig. 3 / Methods', 'two rounds'),
  P('codes.steane', 'Main text', '[[7, 1, 3]]'),
  P('codes.reedMuller', 'Abstract', '[[15,1,3]]'),
  P('codes.tesseract', 'Fig. 6 caption', '[[16, 6, 4]]'),
  P('codes.maxLogicals', 'Fig. 6 caption', 'up to 96 d = 4 logical qubits'),
  P('codes.tGatesShown', 'Main text, Universality', 'to three T gates'),
  P('codes.chsh', 'Extended Data Fig. 9f', '1.99(3)'),
  P('instruments.molasses', 'Methods, System overview', 'grey molasses'),
  P('instruments.microwave', 'Methods, System overview', 'SMW200A'),
  P('instruments.latticeLaser', 'Methods, Spin-to-position conversion', 'M Squared'),
  P('instruments.shieldLaser', 'Methods, Shielding beam', 'Connet'),
  P('instruments.objective', 'Methods, System overview', 'Special Optics'),
  P('instruments.shieldShaping', 'Methods, Shielding beam', 'knife-edge'),
];

/** Values used on the page that are standard atomic data, not from the paper. */
export const STANDARD_VALUES: readonly Provenance[] = [
  { path: 'RB87.d2Nm', where: 'Steck, Rubidium 87 D Line Data', quote: '', kind: 'standard', note: '780.241 nm' },
  { path: 'RB87.d1Nm', where: 'Steck, Rubidium 87 D Line Data', quote: '', kind: 'standard', note: '794.978 nm' },
  { path: 'RB87.hyperfineHz', where: 'Steck, Rubidium 87 D Line Data', quote: '', kind: 'standard', note: '6.834 682 610 904 GHz' },
  { path: 'quantum defects', where: 'Li et al. 2003; Mack et al. 2011', quote: '', kind: 'standard', note: 'δs = 3.131, δp = 2.648' },
  { path: 'C6 (70S)', where: 'Bernien et al., Nature 551, 579 (2017)', quote: '', kind: 'standard', note: 'C6/h ≈ 862 GHz·μm⁶, scaled as n*¹¹' },
];
