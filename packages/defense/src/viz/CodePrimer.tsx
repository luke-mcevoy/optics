export function CodePrimer() {
  return (
    <svg className="sketch primer-svg" viewBox="0 0 560 210" width={560} height={210} role="img" aria-label="Physical bits versus a logical bit">
      <text x="16" y="22" fill="#c9a227" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        Classical: copy the bit. Quantum: you cannot copy, so you share the bit across entanglement.
      </text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={70 + i * 70} cy={90} r="16" fill="#1a222a" stroke="#f5b942" />
          <text x={62 + i * 70} y={95} fill="#f5b942" fontSize="12" fontFamily="IBM Plex Mono, monospace">
            0
          </text>
        </g>
      ))}
      <text x="40" y="140" fill="#9a8f7a" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
        three physical copies → majority vote
      </text>
      <text x="300" y="70" fill="#c9a0ff" fontSize="12" fontFamily="IBM Plex Mono, monospace">
        |+_L⟩ = |00000…⟩ + |11111…⟩
      </text>
      <text x="300" y="96" fill="#8ec8ff" fontSize="12" fontFamily="IBM Plex Mono, monospace">
        |−_L⟩ = |00000…⟩ − |11111…⟩  (example: |0_L⟩ = |000…⟩)
      </text>
      <text x="300" y="140" fill="#9a8f7a" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
        You never look at one atom’s 0/1. You look at
      </text>
      <text x="300" y="158" fill="#9a8f7a" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
        parities (products) among neighbours — syndromes.
      </text>
      <text x="16" y="196" fill="#d8c9a0" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
        If the physical error rate is below a threshold, making the block bigger makes the logical error exponentially smaller.
      </text>
    </svg>
  );
}
