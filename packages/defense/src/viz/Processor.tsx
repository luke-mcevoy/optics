import { useMemo } from 'react';
import { PAPER } from '../data/paper.ts';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';
import { AtomCloudField } from '../viz3d/AtomCloud.tsx';
import { TweezerBeam, ZoneBox } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

export function Processor() {
  const local = useMemo(() => sampleOrbital({ n: 5, l: 0, count: 600, seed: 4 }), []);
  const scale = worldScale(5, 0.42);
  const sites = useMemo(() => {
    const out: { position: [number, number, number]; color: string }[] = [];
    for (let c = 0; c < 8; c += 1) out.push({ position: [(c - 3.5) * 0.7, 1.15, 0], color: '#c9a0ff' });
    for (let c = 0; c < 6; c += 1) out.push({ position: [(c - 2.5) * 0.7, 0.15, 1.1], color: '#f5b942' });
    for (let c = 0; c < 6; c += 1) out.push({ position: [(c - 2.5) * 0.7, -0.85, 0.2], color: '#8ec8ff' });
    for (let c = 0; c < 5; c += 1) out.push({ position: [(c - 2) * 0.7, -1.7, 0.2], color: '#9aa6b2' });
    return out;
  }, []);

  return (
    <div className="board">
      <Stage3D
        camera={[4.5, 3.8, 8]}
        lookingAt="The four rooms of the logical processor (schematic)"
        keys={[
          { color: '#c9a0ff', label: 'Top violet — entangling. Gates happen only here.' },
          { color: '#f5b942', label: 'Gold — storage. Data sit here under a 1,529 nm shield.' },
          { color: '#5ec8e5', label: 'Cyan — readout. Spin-to-position + camera.' },
          { color: '#9aa6b2', label: 'Grey — reservoir. Spare atoms to refill holes.' },
        ]}
        note={`This drawing shows ${sites.length} atoms. The paper’s machine holds up to ${PAPER.atoms}. Clouds are enlarged.`}
        caption="Floorplan, not a to-scale photograph of the 165 μm array."
      >
        <ZoneBox position={[0, 1.15, 0]} size={[6.2, 1.1, 2.2]} color="#c9a0ff" />
        <ZoneBox position={[-0.3, 0.15, 1.1]} size={[4.8, 0.9, 1.6]} color="#f5b942" />
        <ZoneBox position={[-0.3, -0.85, 0.2]} size={[4.8, 0.8, 1.6]} color="#5ec8e5" />
        <ZoneBox position={[-0.5, -1.7, 0.2]} size={[4.2, 0.7, 1.4]} color="#9aa6b2" />
        {sites.slice(0, 8).map((site, i) => (
          <TweezerBeam key={i} position={site.position} length={1.8} waist={0.07} color="#c9a0ff" />
        ))}
        <AtomCloudField local={local} sites={sites} scale={scale} size={0.024} />
      </Stage3D>
    </div>
  );
}
