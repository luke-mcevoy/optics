export function QubitPrimer() {
  return (
    <svg className="sketch primer-svg" viewBox="0 0 560 200" width={560} height={200} role="img" aria-label="Two-level qubit and a Bloch sphere">
      <text x="16" y="22" fill="#c9a227" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        A bit is a choice. A qubit is a direction.
      </text>
      <line x1="40" y1="150" x2="180" y2="150" stroke="#8ec8ff" strokeWidth="2" />
      <line x1="40" y1="70" x2="180" y2="70" stroke="#f3d48a" strokeWidth="2" />
      <text x="48" y="170" fill="#8ec8ff" fontSize="12" fontFamily="IBM Plex Mono, monospace">
        |0⟩  clock, F=1
      </text>
      <text x="48" y="58" fill="#f3d48a" fontSize="12" fontFamily="IBM Plex Mono, monospace">
        |1⟩  clock, F=2
      </text>
      <path d="M110 150 L110 70" stroke="#5ec8e5" strokeWidth="1.5" fill="none" />
      <text x="118" y="114" fill="#5ec8e5" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        Raman drive
      </text>
      <circle cx="400" cy="110" r="62" fill="none" stroke="#2c3640" />
      <ellipse cx="400" cy="110" rx="62" ry="22" fill="none" stroke="#24303a" />
      <line x1="400" y1="48" x2="400" y2="172" stroke="#24303a" />
      <line x1="400" y1="110" x2="448" y2="72" stroke="#c9a0ff" strokeWidth="2" />
      <circle cx="448" cy="72" r="4" fill="#c9a0ff" />
      <text x="330" y="196" fill="#9a8f7a" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
        The state is a point on a sphere. A gate is a rotation of that point.
      </text>
    </svg>
  );
}
