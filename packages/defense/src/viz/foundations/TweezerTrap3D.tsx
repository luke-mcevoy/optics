import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Slider } from '../../components/Slider.tsx';
import { PAPER } from '../../data/paper.ts';
import { HBAR, tweezer } from '../../physics/light.ts';
import { Callout } from '../../viz3d/Callout.tsx';
import { Stage3D } from '../../viz3d/Stage3D.tsx';

const W0_UM = 1; // assumed waist (the paper does not quote it)
const LEN = 7; // world length of the drawn beam
const WORLD_PER_UM = 0.6; // transverse scale
const Z_R_WORLD = 1.7; // Rayleigh range drawn (exaggerated axially for legibility)

function colourFor(lambdaNm: number): string {
  // display colour for infrared: 795 → deep red, 1064 → maroon
  const t = Math.min(1, Math.max(0, (lambdaNm - 795) / 305));
  const r = Math.round(220 - 90 * t);
  const g = Math.round(60 - 40 * t);
  const b = Math.round(50 + 20 * t);
  return `rgb(${r},${g},${b})`;
}

export function TweezerTrap3D() {
  const [lambdaNm, setLambdaNm] = useState<number>(PAPER.slm.wavelengthNm);
  const [powerMw, setPowerMw] = useState(4);
  const t = tweezer(lambdaNm * 1e-9, powerMw * 1e-3, W0_UM * 1e-6);
  const depthMK = -t.depthMK;
  const ratio = Math.abs(t.depthJ) / (HBAR * t.scatteringHz);
  const gammaD2 = 2 * Math.PI * 6.0666e6;
  const deltaD2 = 2 * Math.PI * (299792458 / (lambdaNm * 1e-9) - 299792458 / 780.241e-9);

  return (
    <Figure
      n="F10"
      title="An optical tweezer is a light shift you can sit in"
      caption={
        <>
          A focused red-detuned Gaussian beam (waist w<sub>0</sub> = {W0_UM} μm, an assumption —
          the paper does not quote its tweezer waist) and the potential well it makes for a
          ground-state ⁸⁷Rb atom, drawn as a sheet whose depth is the light shift U(r) ∝ −I(r).
          Depth, scattering rate and trap frequencies are computed from the Grimm–Weidemüller
          formula summed over the D1 and D2 lines with counter-rotating terms:
          U = Σ<sub>i</sub> w<sub>i</sub> (3πc²Γ<sub>i</sub>/2ω<sub>i</sub>³)(1/Δ<sub>i</sub> − 1/(ω+ω<sub>i</sub>)) I,
          Γ<sub>sc</sub> the same with an extra Γ<sub>i</sub>/ħ(ω/ω<sub>i</sub>)³ and the bracket
          squared. The atom oscillates at ω<sub>r</sub> = √(4U<sub>0</sub>/m w<sub>0</sub>²) radially
          and ω<sub>z</sub> = √(2U<sub>0</sub>/m z<sub>R</sub>²) axially (slowed ~10⁴× on screen;
          the axial extent is compressed). Move the wavelength: depth falls roughly as 1/Δ but
          scattering as 1/Δ², so the figure of merit U/ħΓ<sub>sc</sub> ≈ Δ/Γ keeps improving with
          detuning — the reason tweezers are tens of nanometres from resonance.
        </>
      }
    >
      <Panel tag="a" title={`λ = ${lambdaNm} nm, P = ${powerMw} mW, w0 = ${W0_UM} μm`} wide>
        <div className="slider-pair">
          <Slider label="Wavelength λ" value={lambdaNm} min={795} max={1100} step={1} unit="nm" onChange={setLambdaNm} />
          <Slider label="Power P" value={powerMw} min={0.5} max={20} step={0.5} unit="mW" display={powerMw.toFixed(1)} onChange={setPowerMw} />
        </div>
        <Stage3D rig={{ position: [8.5, 3.6, 8.0], target: [0, -1.1, 0] }} autoRotate={false} minDistance={4} maxDistance={24} tall>
          <TrapScene lambdaNm={lambdaNm} depthMK={depthMK} radialHz={t.radialHz} axialHz={t.axialHz} />
        </Stage3D>
        <p className="board-cap">
          depth {depthMK.toFixed(2)} mK = {(-t.depthMHz).toFixed(1)} MHz × h · scattering {t.scatteringHz.toFixed(1)} photons/s ·
          ω<sub>r</sub>/2π = {(t.radialHz / 1e3).toFixed(0)} kHz, ω<sub>z</sub>/2π = {(t.axialHz / 1e3).toFixed(0)} kHz ·
          U/ħΓ<sub>sc</sub> = {ratio.toExponential(2)} (two-level Δ/Γ = {(Math.abs(deltaD2) / gammaD2).toExponential(2)})
        </p>
      </Panel>
    </Figure>
  );
}

function TrapScene({ lambdaNm, depthMK, radialHz, axialHz }: { lambdaNm: number; depthMK: number; radialHz: number; axialHz: number }) {
  const colour = colourFor(lambdaNm);
  const w0 = W0_UM * WORLD_PER_UM;
  const wOf = (x: number) => w0 * Math.sqrt(1 + (x / Z_R_WORLD) ** 2);
  const beamGeom = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const x = -LEN / 2 + (i / 60) * LEN;
      pts.push(new THREE.Vector2(wOf(x), x));
    }
    return new THREE.LatheGeometry(pts, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const coreGeom = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const x = -LEN / 2 + (i / 60) * LEN;
      pts.push(new THREE.Vector2(wOf(x) * 0.5, x));
    }
    return new THREE.LatheGeometry(pts, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Potential sheet: y = -depthWorld * I(x, z)/I0 below the beam axis.
  const SHEET_Y = -1.4;
  const depthWorld = Math.min(2.4, 0.35 + 0.9 * Math.log10(1 + depthMK * 10));
  const sheet = useRef<THREE.Mesh>(null);
  const sheetGeom = useMemo(() => new THREE.PlaneGeometry(LEN, 4.2, 56, 34), []);
  useMemo(() => {
    const pos = sheetGeom.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getY(i); // plane's y becomes world z after rotation
      const w = wOf(x);
      const I = (w0 / w) ** 2 * Math.exp((-2 * z * z) / (w * w));
      pos.setZ(i, -depthWorld * I);
    }
    pos.needsUpdate = true;
    sheetGeom.computeVertexNormals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depthWorld, sheetGeom]);

  const atom = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += dt;
    const tt = tRef.current;
    // slowed oscillation: radial at ~1 Hz display, axial proportionally slower
    const fr = 0.9;
    const fz = radialHz > 0 ? (fr * axialHz) / radialHz : 0.2;
    const zAmp = w0 * 0.55;
    const xAmp = Z_R_WORLD * 0.45;
    const z = zAmp * Math.cos(2 * Math.PI * fr * tt);
    const x = xAmp * Math.sin(2 * Math.PI * fz * tt);
    const w = wOf(x);
    const I = (w0 / w) ** 2 * Math.exp((-2 * z * z) / (w * w));
    if (atom.current) atom.current.position.set(x, SHEET_Y - depthWorld * I + 0.09, z);
  });

  return (
    <group>
      {/* beam */}
      <mesh geometry={beamGeom} rotation={[0, 0, -Math.PI / 2]}>
        <meshBasicMaterial color={colour} transparent opacity={0.11} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh geometry={coreGeom} rotation={[0, 0, -Math.PI / 2]}>
        <meshBasicMaterial color={colour} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* focal-plane ring */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[w0 - 0.01, w0 + 0.01, 64]} />
        <meshBasicMaterial color="#e8e4dc" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Callout position={[0, w0 + 0.35, 0]} fixed small>{`focus: w0 = ${W0_UM} μm`}</Callout>
      <Callout position={[-LEN / 2 + 0.4, wOf(-LEN / 2) + 0.3, 0]} fixed small>{`${lambdaNm} nm tweezer beam`}</Callout>
      {/* potential sheet */}
      <group position={[0, SHEET_Y, 0]}>
        <mesh ref={sheet} geometry={sheetGeom} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#1a1c22" roughness={0.9} metalness={0} side={THREE.DoubleSide} transparent opacity={0.92} />
        </mesh>
        <mesh geometry={sheetGeom} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#e8e4dc" wireframe transparent opacity={0.1} />
        </mesh>
        <Callout position={[LEN / 2 - 0.6, 0.2, -1.8]} fixed small>{`U(r) ∝ −I(r)`}</Callout>
        <Callout position={[0, -depthWorld - 0.3, 0]} fixed>{`depth ${depthMK.toFixed(2)} mK`}</Callout>
      </group>
      <mesh ref={atom}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color="#ffe8c2" emissive="#ffb347" emissiveIntensity={2} roughness={0.3} />
      </mesh>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} />
    </group>
  );
}
