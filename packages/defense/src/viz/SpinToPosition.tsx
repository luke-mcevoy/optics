import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PAPER } from '../data/paper.ts';
import { Slider } from '../components/Slider.tsx';
import { Claim } from '../components/Claim.tsx';
import { AtomCloud } from '../viz3d/AtomCloud.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

export function SpinToPosition() {
  const [split, setSplit] = useState<number>(PAPER.lattice.splitUm);

  return (
    <div className="board">
      <Slider
        label="AOD pickup displacement"
        value={split}
        min={0.5}
        max={4}
        step={0.1}
        unit=" μm"
        display={split.toFixed(1)}
        onChange={setSplit}
      />
      <Stage3D
        camera={[0, 2.8, 7.2]}
        lookingAt="Readout: spin becomes a left/right position"
        keys={[
          { color: '#5ec8e5', label: 'Faint vertical sheets — 795 nm lattice. Pins the bright stretched state.' },
          { color: '#8ec8ff', label: 'Blue cloud — bright/pinned. |0⟩ (F=1), mapped to |2,+2⟩. Stays put.' },
          { color: '#f5b942', label: 'Gold cloud — dark. |1⟩ (F=2), mapped to |2,−2⟩. An AOD walks it ~2 μm.' },
        ]}
        note="A camera then photographs both wells. Occupied / empty / both-empty is |0⟩ / |1⟩ / loss."
        caption="Displacement slider is labeled in μm (paper ~2 μm) but the walk on screen is a cartoon, not a calibrated micron scale."
      >
        <LatticeSheets />
        <SplitClouds split={split} />
      </Stage3D>
      <div className="claim-row">
        <Claim value={`${PAPER.lattice.bitFlipPct}(${PAPER.lattice.bitFlipUnc})`} unit="% bit-flip" source="Fig. 1b" />
        <Claim value={`${PAPER.lattice.lossPct}(${PAPER.lattice.lossUnc})`} unit="% loss" source="Fig. 1b" />
      </div>
    </div>
  );
}

function LatticeSheets() {
  return (
    <group>
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <planeGeometry args={[0.18, 3.2]} />
          <meshBasicMaterial color="#5ec8e5" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function SplitClouds({ split }: { split: number }) {
  const dark = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (dark.current === null) return;
    dark.current.position.x = 0.35 + (split / 2) * (0.55 + 0.45 * Math.sin(state.clock.elapsedTime * 1.1));
  });
  return (
    <>
      <AtomCloud n={5} l={0} color="#8ec8ff" position={[-0.9, 0, 0]} count={9000} />
      <group ref={dark}>
        <AtomCloud n={5} l={0} color="#f5b942" count={9000} />
      </group>
    </>
  );
}
