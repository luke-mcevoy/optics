# Claims ledger

Every constant shown on the explainer, with the place in Bluvstein, Geim et al.,
*Nature* **649**, 39–46 (2026), doi:10.1038/s41586-025-09848-5, that states it.
Generated from `src/data/provenance.ts` by `npm run ledger`; the test suite checks that
each quoted fragment appears verbatim in the paper text when `PAPER_TXT` is set.

## Stated in the paper (97)

| Key | Value | Where | Quoted fragment |
| --- | --- | --- | --- |
| `atoms` | 448 | Abstract | “up to 448 neutral atoms” |
| `slm.wavelengthNm` | 852 | Methods, System overview | “852-nm traps” |
| `slm.model` | Hamamatsu X13138-02 | Methods, System overview | “X13138-02” |
| `aod.model` | AA Opto-Electronic DTSX-400 (crossed pair) | Methods, System overview | “DTSX-400” |
| `imaging.na` | 0.65 | Methods, System overview | “0.65-NA” |
| `imaging.camera` | Hamamatsu ORCA-Quest C15550-20UP | Methods, System overview | “ORCA-Quest C15550-20UP” |
| `loadingPct` | 75 | Methods, System overview | “75% (ref. 64)” |
| `qubit.hyperfineGHz` | 6.8 | Methods, System overview | “6.8-GHz source” |
| `qubit.t2s` | 1 | Methods, Error budget | “coherence time in 852-nm traps is approximately 1–2 s” — with dynamical decoupling |
| `qubit.trapT2s` | 1–2 s | Methods, Error budget | “1–2 s” |
| `raman.globalRabiMHz` | 0.5 | Methods, System overview | “Rabi frequency of about 0.5 MHz” |
| `raman.compositeUs` | 5 | Methods, System overview | “around 5 μs” |
| `raman.intermediateDetuningGHz` | 550 | Methods, System overview | “550 GHz” |
| `raman.scatteringPerPulse` | 0.00005 | Methods, System overview | “5 × 10” |
| `raman.localFidelityPct` | 99.9 | Methods, Error budget | “Local single-qubit gates have approximately 99.9% fidelity” |
| `raman.localWaistUm` | 2.5 | Methods, Local single-qubit gate details | “2.5 μm” |
| `rydberg.n` | 53 | Methods, System overview | “n = 53” |
| `rydberg.blueNm` | 420 | Methods, System overview | “420-nm” |
| `rydberg.irNm` | 1013 | Methods, System overview | “1,013-nm” |
| `rydberg.gateNs` | 270 | Methods, System overview | “270-ns” |
| `rydberg.intermediateDetuningGHz` | 4.8 | Methods, System overview | “4.8 GHz from the intermediate state” |
| `rydberg.rabiMHz` | 4.6 | Methods, Error budget | “4.6 MHz” |
| `rydberg.czFidelityPct` | 99.6 | Methods, Error budget | “99.6%” |
| `zones` | storage × entangling × readout × reservoir | Main text; Fig. 1a | “storage, entangling, readout and reservoir zones” |
| `surface.readoutHeightUm` | 55 | Methods, Surface code | “12 rows tall (55 μm)” |
| `surface.arrayWidthUm` | 165 | Methods, Surface code | “total array width of 165 μm” |
| `surface.rydbergRows` | 7 | Methods, Surface code | “tophat beams cover 7 rows” |
| `surface.homogeneityPct` | 1 | Methods, Surface code | “homogenized to about 1%” |
| `surface.homogeneityExtentUm` | 60 | Methods, Surface code | “vertical extent of 60 μm” |
| `surface.zoneSepUm` | 40 | Methods, Surface code | “separated by 40 μm” |
| `deep.entangleQubits` | 256 | Methods, Deep circuits | “up to 256 qubits” |
| `deep.grid` | 8 × 16 | Methods, Deep circuits | “8 rows” |
| `deep.horizontalUm` | 175 | Methods, Deep circuits | “horizontal extent of 175 μm” |
| `deep.entanglingHeightUm` | 60 | Methods, Deep circuits | “same 60 μm vertical” |
| `deep.readoutAtoms` | 128 | Methods, Deep circuits | “up to 128 atoms” |
| `deep.readoutRows` | 4 | Methods, Deep circuits | “arranged in four rows” |
| `deep.reservoirAtoms` | 196 | Methods, Deep circuits | “up to 196 atoms” |
| `deep.reservoirRows` | 6 | Methods, Deep circuits | “in six rows” |
| `deep.storageSepUm` | 50 | Methods, Deep circuits | “50 μm from the entangling zone” |
| `deep.storageHeightUm` | 35 | Methods, Deep circuits | “beam waist of 35 μm” |
| `deep.layers` | 27 | Fig. 6 caption | “up to 27 layers” |
| `deep.circuitS` | 1.1 | Methods, System overview | “circuits as long as 1.1 s” |
| `beams.imagingWaistUm` | 50 | Methods, Deep circuits | “waist 50 μm” |
| `beams.latticeWaistUm` | 60 | Methods, Deep circuits | “average waist 60 μm” |
| `beams.shieldWaistUm` | 35 × 65 | Methods, Shielding beam | “35 μm × 65 μm” |
| `beams.rydbergTophatUm` | 60 | Methods, Surface code | “vertical extent of 60 μm” |
| `lattice.wavelengthNm` | 795 | Methods, Spin-to-position conversion | “795-nm” |
| `lattice.d1BlueGHz` | 50–200 | Methods, Spin-to-position conversion | “50–200 GHz blue-detuned” |
| `lattice.brightShiftMHz` | 6 | Methods, Spin-to-position conversion | “approximately 6 MHz” |
| `lattice.trapFreqKHz` | 300 | Methods, Spin-to-position conversion | “300 kHz” |
| `lattice.pumpNm` | 780 | Methods, Spin-to-position conversion | “780-nm σ−-polarized” |
| `lattice.rampUs` | 100 | Methods, Spin-to-position conversion | “approximately 100 μs” |
| `lattice.splitUm` | 2 | Methods, Spin-to-position conversion | “approximately 2 μm” |
| `lattice.splitUs` | 500 | Methods, Spin-to-position conversion | “500 μs” |
| `lattice.bitFlipPct` | 0.46 | Fig. 1 caption / Methods | “0.46(4)%” |
| `lattice.lossPct` | 0.24 | Fig. 1 caption / Methods | “0.24(2)%” |
| `lattice.darkErrPct` | 0.87 | Methods, Spin-to-position conversion | “0.87(7)%” |
| `lattice.brightErrPct` | 0.05 | Methods, Spin-to-position conversion | “0.05(5)%” |
| `cooling.wavelengthNm` | 780 | Methods, Local cooling and imaging | “780-nm” |
| `cooling.bFieldG` | 8.6 | Methods, Local cooling and imaging | “8.6 G” |
| `cooling.eitBlueMHz` | 80 | Methods, Local cooling and imaging | “about 80 MHz” |
| `shield.resonanceNm` | 1529.365 | Methods, Shielding beam | “1,529.365” |
| `shield.operateNm` | 1529.49 | Methods, Shielding beam | “1,529.49” |
| `shield.powerW` | 1.2 | Methods, Shielding beam | “about 1.2 W” |
| `shield.lightshiftGHz` | 6 | Methods, Shielding beam | “lightshift of 6 GHz” |
| `control.awgs` | 5 | Methods, System overview | “five arbitrary waveform generators” |
| `control.vendor` | Spectrum Instrumentation | Methods, System overview | “Spectrum” |
| `control.jitterNs` | 10 | Methods, System overview | “less than 10-ns jitter” |
| `control.qecRoundMs` | 4.45 | Methods, Processor clock speed | “4.45 ms” |
| `control.gateGapMs` | 0.47 | Methods, Processor clock speed | “0.47 ms” |
| `control.ancillaExchangeMs` | 2.57 | Methods, Processor clock speed | “2.57 ms” |
| `control.cnotCircuitMs` | 17.7 | Methods, Processor clock speed | “17.7 ms” |
| `control.cnotAvgMs` | 0.655 | Methods, Processor clock speed | “0.655 ms” |
| `control.teleportLayerMs` | 41.9 | Methods, Processor clock speed | “41.9 ms” |
| `control.fastCycleMs` | 4 | Methods, Processor clock speed | “cycle time of 4 ms” |
| `qec.belowThreshold` | 2.14 | Abstract; Fig. 2d | “2.14(13)” |
| `qec.lossMlGain` | 1.73 | Fig. 2 caption | “1.73(13)” |
| `qec.d5LeprPct` | 0.62 | Fig. 2d | “0.62(3)%” |
| `qec.d3LeprPct` | 1.33 | Methods, Benchmarking | “1.33(4)%” |
| `qec.noLossLeprPct` | 0.1 | Main text, Below-threshold performance | “towards 0.1% per round” |
| `qec.leakageIsLossPct` | 80 | Main text | “80%” |
| `qec.shots` | 14855 | Methods, Benchmarking | “14,855 shots” |
| `qec.detectorsPerShot` | 96 | Methods, Benchmarking | “96” |
| `logic.optimalCnotsPerRound` | 3 | Fig. 3 caption | “optimum of roughly three CNOTs” |
| `logic.surgeryRounds` | 2 | Fig. 3 / Methods | “two rounds” |
| `codes.steane` | [[7, 1, 3]] | Main text | “[[7, 1, 3]]” |
| `codes.reedMuller` | [[15, 1, 3]] | Abstract | “[[15,1,3]]” |
| `codes.tesseract` | [[16, 6, 4]] | Fig. 6 caption | “[[16, 6, 4]]” |
| `codes.maxLogicals` | 96 | Fig. 6 caption | “up to 96 d = 4 logical qubits” |
| `codes.tGatesShown` | 3 | Main text, Universality | “to three T gates” |
| `codes.chsh` | 1.99(3) × √2 | Extended Data Fig. 9f | “1.99(3)” |
| `instruments.molasses` | D1 Λ-enhanced grey molasses | Methods, System overview | “grey molasses” |
| `instruments.microwave` | Rohde & Schwarz SMW200A, 6.8 GHz | Methods, System overview | “SMW200A” |
| `instruments.latticeLaser` | M Squared titanium:sapphire, 795 nm | Methods, Spin-to-position conversion | “M Squared” |
| `instruments.shieldLaser` | Connet CoSF-D 10 W fibre laser, 1529 nm | Methods, Shielding beam | “Connet” |
| `instruments.objective` | Special Optics, NA 0.65 | Methods, System overview | “Special Optics” |
| `instruments.shieldShaping` | 4f relay with knife-edge ~4 waists from centre | Methods, Shielding beam | “knife-edge” |

## Assumed by this site, not stated in the paper (1)

| Key | Value | Source | Note |
| --- | --- | --- | --- |
| `beams.pairSpacingUm` | 2 | Not in this paper | Intra-pair gate spacing taken from the group’s earlier gate work (ref. 36, Evered et al. 2023). |

## Standard atomic data used alongside the paper (20)

| Quantity | Value | Source |
| --- | --- | --- |
| RB87.d2Nm | 780.241 nm | Steck, Rubidium 87 D Line Data |
| RB87.d1Nm | 794.978 nm | Steck, Rubidium 87 D Line Data |
| RB87.hyperfineHz | 6.834 682 610 904 GHz | Steck, Rubidium 87 D Line Data |
| RB87_HFS.groundAHz | A_hfs(5S₁/₂)/h = 3.417 341 305 GHz (foundations) | Steck, Rubidium 87 D Line Data |
| RB87_HFS.gJ | g_J(5S₁/₂) = 2.002 331 13 (foundations) | Steck, Rubidium 87 D Line Data |
| RB87_HFS.gI | g_I = −0.000 995 141 4 (foundations) | Steck, Rubidium 87 D Line Data |
| RB87_HFS.muBHzPerG | μ_B/h = 1.399 624 604 MHz/G (foundations) | CODATA via Steck |
| RB87_HFS.d1Hz, d2Hz | 377.107 463 THz, 384.230 484 THz (foundations) | Steck, Rubidium 87 D Line Data |
| RB87_HFS.p12OffsetsHz, p32OffsetsHz | 5P hyperfine offsets: F′=1,2: −509.05, +305.43 MHz; F′=0…3: −302.07, −229.85, −72.91, +193.74 MHz (foundations) | Steck, Rubidium 87 D Line Data |
| clock shift 575.15 Hz/G² | (g_J − g_I)² μ_B² / 2ΔE_hfs (foundations) | Steck, Rubidium 87 D Line Data (derived; recomputed from Breit–Rabi in hyperfine.test.ts) |
| quantum defects | δs = 3.131, δp = 2.648 | Li et al. 2003; Mack et al. 2011 |
| C6 (70S) | C6/h ≈ 862 GHz·μm⁶, scaled as n*¹¹ | Bernien et al., Nature 551, 579 (2017) |
| RB_LINES.d2.gamma, d1.gamma | Γ/2π = 6.0666 MHz (D2), 5.7500 MHz (D1) (foundations) | Steck, Rubidium 87 D Line Data |
| I_SAT_WM2 | I_sat = 1.669 mW/cm² for the D2 cycling transition (foundations) | Steck, Rubidium 87 D Line Data |
| RB87_MASS | 86.909 180 527 u (foundations) | CODATA / Steck |
| RY_RB_THZ | R_Rb·c = 3289.82 THz (foundations) | Sansonetti, J. Phys. Chem. Ref. Data 35, 301 (2006) |
| Rydberg lifetimes | τ₀ n*³ radiative scaling and the 300 K black-body rate ∝ 1/n² (foundations) | Beterov et al., Phys. Rev. A 79, 052504 (2009) |
| PAULI_THRESHOLD | ≈ 10.3% for independent noise, perfect syndromes, matching decoder (foundations) | Dennis, Kitaev, Landahl & Preskill, J. Math. Phys. 43, 4452 (2002); Wang, Harrington & Preskill (2003) |
| ERASURE_THRESHOLD | 50% = square-lattice bond-percolation point (foundations) | Stace, Barrett & Doherty, Phys. Rev. Lett. 102, 200501 (2009) |
| Tsirelson bound 2√2 | maximal quantum CHSH value (foundations) | Cirel’son, Lett. Math. Phys. 4, 93 (1980) |

## Derived on the page

These are computed live from the constants above and labelled as such where shown:

- Rayleigh limit 0.61 λ/NA = 0.73 μm (780 nm, NA 0.65) — chapter 09.
- Collection fraction (1 − cos θ)/2 = 12.0 % for NA 0.65 — chapter 09, Fig. 1.
- Blockade radius R_b = (C₆/ħΩ)^{1/6} ≈ 4.4 μm for n = 53, Ω = 2π × 4.6 MHz, using the
  n*¹¹-scaled C₆ estimate above (not a paper number) — Fig. 1.
- Rayleigh range z_R = π w₀²/λ = 3.7 μm for an assumed 1 μm tweezer waist — Fig. 1.
- Mean orbital radii from the Rb quantum defects — chapter 02.
- Two-atom blockade populations from the Schrödinger equation — Fig. 5.
