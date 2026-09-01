import { useMemo } from 'react';
import { sampleOrbital, worldScale } from '../physics/orbitals.ts';
import { AtomCloudField } from '../viz3d/AtomCloud.tsx';
import { TweezerBeam } from '../viz3d/Optics.tsx';
import { Stage3D } from '../viz3d/Stage3D.tsx';

export function ArrayHero() {
  const local = useMemo(() => sampleOrbital({ n: 5, l: 0, count: 900, seed: 7 }), []);
  const scale = worldScale(5, 0.55);
  const sites = useMemo(() => {
    const out: { position: [number, number, number]; color: string }[] = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        out.push({
          position: [(c - 3.5) * 0.85, 0, (r - 2) * 0.85],
          color: r < 2 ? '#8ec8ff' : r === 2 ? '#c9a0ff' : '#f5b942',
        });
      }
    }
    return out;
  }, []);

  return (
    <div className="board">
      <Stage3D
        camera={[0, 4.2, 8.5]}
        lookingAt="A small array of trapped rubidium atoms"
        keys={[
          { color: '#f5b942', label: 'Amber cones — 852 nm tweezer light. Each cone is one trap.' },
          { color: '#8ec8ff', label: 'Glowing knots — one atom per trap. The fuzz is the electron.' },
        ]}
        note="Clouds are enlarged so you can see them. A real 5s atom is a speck in a ~1 μm tweezer. The paper holds up to 448 atoms."
        caption="Schematic of 40 sites. Colors only mark rows, not different species."
      >
        {sites.map((site, i) => (
          <TweezerBeam key={i} position={site.position} length={2.8} waist={0.09} />
        ))}
        <AtomCloudField local={local} sites={sites} scale={scale} size={0.028} />
      </Stage3D>
    </div>
  );
}
