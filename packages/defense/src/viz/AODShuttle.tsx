import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';
import { ZoneBox } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

const V_ACOUSTIC = 650;
const LAMBDA_NM = 852;
const F_LENS_MM = 300;

export function AODShuttle() {
  const [fx, setFx] = useState(90);
  const [tones, setTones] = useState(5);
  const thetaMrad = ((LAMBDA_NM * 1e-9) * (fx * 1e6) / V_ACOUSTIC) * 1e3;
  const xUm = (F_LENS_MM * 1e-3) * (thetaMrad * 1e-3) * 1e6;

  return (
    <div className="board">
      <div className="board-grid">
        <Slider label="AOD X tone" value={fx} min={60} max={140} step={0.5} unit=" MHz" display={fx.toFixed(1)} onChange={setFx} />
        <Slider label="parallel atoms" value={tones} min={2} max={7} step={1} onChange={setTones} />
      </div>
      <Stage3D
        camera={[0, 4.8, 9]}
        lookingAt="Atoms being moved between rooms of the processor"
        keys={[
          { color: '#f5b942', label: 'Left box — storage. Atoms wait here.' },
          { color: '#c9a0ff', label: 'Middle — entangling zone. Rydberg beams live here.' },
          { color: '#5ec8e5', label: 'Right — readout. Measurement happens here.' },
          { color: '#f5b942', label: 'Moving dots — the atoms. An AOD tweezer is carrying each one.' },
        ]}
        note="A tone frequency sets trap position (θ = λf / v). The paper translates this grid; it does not stretch it."
        caption="Lens focal length 300 mm and TeO₂ speed 650 m/s are illustrative, not from the paper. Device is AA DTSX-400."
      >
        <ZoneBox position={[-3.2, 0, 0]} size={[2.4, 1.6, 2.8]} color="#f5b942" />
        <ZoneBox position={[0.1, 0, 0]} size={[2.6, 1.6, 2.8]} color="#c9a0ff" />
        <ZoneBox position={[3.3, 0, 0]} size={[2.2, 1.6, 2.8]} color="#5ec8e5" />
        <FlyingAtoms count={tones} />
      </Stage3D>
      <div className="claim-row">
        <Claim value={thetaMrad.toFixed(3)} unit="mrad  θ = λf / v" source="TeO₂ v ≈ 650 m/s, λ = 852 nm" />
        <Claim value={xUm.toFixed(0)} unit="μm  focal-plane shift" source={`f = ${F_LENS_MM} mm (illustrative)`} />
      </div>
    </div>
  );
}

function FlyingAtoms({ count }: { count: number }) {
  const local = useMemo(() => sampleOrbital({ n: 5, l: 0, count: 700, seed: 11 }), []);
  const scale = worldScale(5, 0.5);
  const attrRef = useRef<THREE.BufferAttribute | null>(null);
  const merged = useMemo(() => new Float32Array(local.length * count), [local, count]);
  const init = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(merged, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', attr);
    attrRef.current = attr;
    return g;
  }, [merged]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let a = 0; a < count; a += 1) {
      const phase = (t * 0.22 + a * 0.13) % 1;
      const z = (a - (count - 1) / 2) * 0.55;
      const x = phase < 0.45 ? lerp(-3.2, 0.1, phase / 0.45) : phase < 0.7 ? 0.1 : lerp(0.1, 3.3, (phase - 0.7) / 0.3);
      for (let i = 0; i < local.length; i += 3) {
        const o = a * local.length + i;
        merged[o] = (local[i] ?? 0) * scale + x;
        merged[o + 1] = (local[i + 1] ?? 0) * scale;
        merged[o + 2] = (local[i + 2] ?? 0) * scale + z;
      }
    }
    const attr = attrRef.current;
    if (attr !== null) attr.needsUpdate = true;
  });

  return (
    <points geometry={init}>
      <pointsMaterial
        color="#f5b942"
        size={0.03}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}
