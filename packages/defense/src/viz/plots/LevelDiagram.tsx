type Mode = '5s' | '5p' | 'rydberg' | 'compare';

export function LevelDiagram({ mode, n }: { mode: Mode; n: number }) {
  const rydOn = mode === 'rydberg' || mode === 'compare';
  const sOn = mode === '5s' || mode === 'compare';
  const pOn = mode === '5p';
  return (
    <svg className="plot" viewBox="0 0 320 220" width="100%" role="img" aria-label="Rubidium energy levels">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#8b8680" />
        </marker>
      </defs>
      <text x="12" y="18" fill="#8b8680" fontSize="10" fontFamily="IBM Plex Mono, monospace">
        ⁸⁷Rb valence electron
      </text>
      <Level y={188} label="5s  |F=1,2; m_F=0⟩  qubit" active={sOn} color="#6ea8d4" />
      <Level y={148} label="5p  D1/D2  (imaging, Raman)" active={pOn} color="#d4a24a" />
      <Level y={88} label="virtual 5P  (Raman Δ ~ 550 GHz)" active={false} color="#5c5c60" dashed />
      <Level y={36} label={`n = ${n} Rydberg  (CZ)`} active={rydOn} color="#b08ad6" />
      {sOn && !rydOn && <Arrow x={90} y1={188} y2={148} color="#6ea8d4" />}
      {pOn && <Arrow x={150} y1={188} y2={148} color="#d4a24a" />}
      {rydOn && <Arrow x={210} y1={188} y2={36} color="#b08ad6" />}
    </svg>
  );
}

function Level({
  y,
  label,
  active,
  color,
  dashed,
}: {
  y: number;
  label: string;
  active: boolean;
  color: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <line
        x1="24"
        y1={y}
        x2="300"
        y2={y}
        stroke={color}
        strokeWidth={active ? 2.4 : 1}
        strokeDasharray={dashed === true ? '4 3' : undefined}
        opacity={active ? 1 : 0.45}
      />
      <text x="28" y={y - 6} fill={color} fontSize="10" fontFamily="IBM Plex Mono, monospace" opacity={active ? 1 : 0.55}>
        {label}
      </text>
    </g>
  );
}

function Arrow({ x, y1, y2, color }: { x: number; y1: number; y2: number; color: string }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1.4" markerEnd="url(#arr)" />;
}
