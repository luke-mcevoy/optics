/**
 * Error-correction primitives for the Foundations page: majority-vote repetition codes, a
 * distance-d planar surface code restricted to one error type (X errors / Z-type vertex
 * checks — the Z/X sector is the exact dual and has identical statistics), a minimum-weight
 * matching decoder, an erasure (peeling-equivalent) decoder, and the scaling law used to
 * compare against the paper's Λ.
 *
 * Lattice convention (distance d): vertex checks at (r, c) with r ∈ [0, d), c ∈ [0, d−1).
 * Horizontal edges h(r, j), j ∈ [0, d): edge j in row r joins check (r, j−1) to (r, j); j = 0
 * and j = d−1 touch the left/right *rough* boundaries, where error chains may end undetected.
 * Vertical edges v(r, c), r ∈ [0, d−1), c ∈ [0, d−1): join checks (r, c) and (r+1, c).
 * Data qubits = d² + (d−1)². A logical X is any left→right chain; Z_L is Z on every h(r, 0),
 * so a zero-syndrome residual is a logical error iff it has odd weight on {h(r, 0)}.
 */

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return out;
}

/** Logical error of an n-qubit repetition code (odd n) under independent flips at rate p. */
export function repetitionLogicalError(p: number, n = 3): number {
  let sum = 0;
  for (let k = Math.floor(n / 2) + 1; k <= n; k += 1) sum += binomial(n, k) * p ** k * (1 - p) ** (n - k);
  return sum;
}

export type Lattice = {
  d: number;
  /** total data qubits */
  n: number;
  /** total checks */
  m: number;
  /** for each edge, the (up to two) checks it touches */
  checksOf: readonly (readonly number[])[];
  /** edge index of h(r, j) */
  h: (r: number, j: number) => number;
  /** edge index of v(r, c) */
  v: (r: number, c: number) => number;
  check: (r: number, c: number) => number;
  /** geometric description for rendering */
  edges: readonly { kind: 'h' | 'v'; r: number; c: number }[];
};

export function planarLattice(d: number): Lattice {
  const nH = d * d;
  const h = (r: number, j: number) => r * d + j;
  const v = (r: number, c: number) => nH + r * (d - 1) + c;
  const check = (r: number, c: number) => r * (d - 1) + c;
  const n = nH + (d - 1) * (d - 1);
  const m = d * (d - 1);
  const checksOf: number[][] = Array.from({ length: n }, () => []);
  const edges: { kind: 'h' | 'v'; r: number; c: number }[] = [];
  for (let r = 0; r < d; r += 1) {
    for (let j = 0; j < d; j += 1) {
      const e = h(r, j);
      if (j > 0) checksOf[e]!.push(check(r, j - 1));
      if (j < d - 1) checksOf[e]!.push(check(r, j));
      edges[e] = { kind: 'h', r, c: j };
    }
  }
  for (let r = 0; r < d - 1; r += 1) {
    for (let c = 0; c < d - 1; c += 1) {
      const e = v(r, c);
      checksOf[e]!.push(check(r, c), check(r + 1, c));
      edges[e] = { kind: 'v', r, c };
    }
  }
  return { d, n, m, checksOf, h, v, check, edges };
}

export function syndrome(lat: Lattice, errors: Uint8Array): Uint8Array {
  const s = new Uint8Array(lat.m);
  for (let e = 0; e < lat.n; e += 1) {
    if (errors[e] === 1) for (const c of lat.checksOf[e]!) s[c] = (s[c] ?? 0) ^ 1;
  }
  return s;
}

export function sampleErrors(lat: Lattice, p: number, rand: () => number): Uint8Array {
  const err = new Uint8Array(lat.n);
  for (let e = 0; e < lat.n; e += 1) if (rand() < p) err[e] = 1;
  return err;
}

/** Is a zero-syndrome error pattern a logical X? (odd weight on the left boundary edges) */
export function isLogicalError(lat: Lattice, residual: Uint8Array): boolean {
  let parity = 0;
  for (let r = 0; r < lat.d; r += 1) parity ^= residual[lat.h(r, 0)]!;
  return parity === 1;
}

type Defect = { r: number; c: number };

function pairCost(a: Defect, b: Defect): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}
function boundaryCost(a: Defect, d: number): number {
  return Math.min(a.c + 1, d - 1 - a.c);
}

function flip(arr: Uint8Array, i: number): void {
  arr[i] = (arr[i] ?? 0) ^ 1;
}

/** Paint the shortest path between two checks (or a check and its nearest boundary). */
function paintPath(lat: Lattice, out: Uint8Array, a: Defect, b: Defect | null): void {
  if (b === null) {
    const left = a.c + 1 <= lat.d - 1 - a.c;
    if (left) for (let j = 0; j <= a.c; j += 1) flip(out, lat.h(a.r, j));
    else for (let j = a.c + 1; j < lat.d; j += 1) flip(out, lat.h(a.r, j));
    return;
  }
  // vertical leg in column a.c, then horizontal leg in row b.r
  const r0 = Math.min(a.r, b.r);
  const r1 = Math.max(a.r, b.r);
  for (let r = r0; r < r1; r += 1) flip(out, lat.v(r, a.c));
  const c0 = Math.min(a.c, b.c);
  const c1 = Math.max(a.c, b.c);
  for (let c = c0; c < c1; c += 1) flip(out, lat.h(b.r, c + 1));
}

export const EXACT_MATCH_LIMIT = 14;

export type SpaceTimeDefect = { r: number; c: number; t: number };

function pairCostST(a: SpaceTimeDefect, b: SpaceTimeDefect): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) + Math.abs(a.t - b.t);
}
function boundaryCostST(a: SpaceTimeDefect, d: number): number {
  return Math.min(a.c + 1, d - 1 - a.c);
}

/**
 * Minimum-weight pairing of defects (each paired with another defect or sent to a rough
 * boundary). Exact bitmask DP for ≤ EXACT_MATCH_LIMIT defects; union-find clustering
 * (Delfosse & Nickerson) beyond. `pairW` / `boundW` default to 2D Manhattan + column distance.
 */
export function matchDefects(
  defects: readonly SpaceTimeDefect[],
  d: number,
  pairW: (a: SpaceTimeDefect, b: SpaceTimeDefect) => number = pairCostST,
  boundW: (a: SpaceTimeDefect) => number = (a) => boundaryCostST(a, d),
): { pairs: [SpaceTimeDefect, SpaceTimeDefect | null][]; exact: boolean } {
  const k = defects.length;
  if (k === 0) return { pairs: [], exact: true };
  if (k <= EXACT_MATCH_LIMIT) return { pairs: exactPairs(defects, pairW, boundW), exact: true };
  return { pairs: unionFindPairs(defects, pairW, boundW), exact: false };
}

function exactPairs(
  defects: readonly SpaceTimeDefect[],
  pairW: (a: SpaceTimeDefect, b: SpaceTimeDefect) => number,
  boundW: (a: SpaceTimeDefect) => number,
): [SpaceTimeDefect, SpaceTimeDefect | null][] {
  const k = defects.length;
  const full = (1 << k) - 1;
  const memo = new Float64Array(1 << k).fill(-1);
  const choice = new Int32Array(1 << k).fill(-2);
  const solve = (mask: number): number => {
    if (mask === 0) return 0;
    if (memo[mask]! >= 0) return memo[mask]!;
    let i = 0;
    while (((mask >> i) & 1) === 0) i += 1;
    const rest = mask & ~(1 << i);
    let best = boundW(defects[i]!) + solve(rest);
    let pick = -1;
    for (let j = i + 1; j < k; j += 1) {
      if (((rest >> j) & 1) === 0) continue;
      const cost = pairW(defects[i]!, defects[j]!) + solve(rest & ~(1 << j));
      if (cost < best) {
        best = cost;
        pick = j;
      }
    }
    memo[mask] = best;
    choice[mask] = pick;
    return best;
  };
  solve(full);
  const pairs: [SpaceTimeDefect, SpaceTimeDefect | null][] = [];
  let mask = full;
  while (mask !== 0) {
    let i = 0;
    while (((mask >> i) & 1) === 0) i += 1;
    const pick = choice[mask]!;
    if (pick === -1) {
      pairs.push([defects[i]!, null]);
      mask &= ~(1 << i);
    } else {
      pairs.push([defects[i]!, defects[pick]!]);
      mask &= ~(1 << i) & ~(1 << pick);
    }
  }
  return pairs;
}

/**
 * Union-find clustering decoder: grow odd-parity clusters by adding the cheapest unused
 * defect–defect or defect–boundary edge until every cluster is even, then peel the forest
 * (Delfosse & Nickerson, Quantum 5, 595 (2021)).
 */
function unionFindPairs(
  defects: readonly SpaceTimeDefect[],
  pairW: (a: SpaceTimeDefect, b: SpaceTimeDefect) => number,
  boundW: (a: SpaceTimeDefect) => number,
): [SpaceTimeDefect, SpaceTimeDefect | null][] {
  const k = defects.length;
  const parent = Int32Array.from({ length: k }, (_, i) => i);
  const find = (x: number): number => {
    let i = x;
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const size = new Int32Array(k).fill(1);
  const hasBoundary = new Uint8Array(k);
  const odd = (r: number) => size[r]! % 2 === 1 && hasBoundary[r] === 0;
  const union = (a: number, b: number): number => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return ra;
    if ((size[ra] ?? 0) < (size[rb] ?? 0)) {
      parent[ra] = rb;
      size[rb] = (size[rb] ?? 0) + (size[ra] ?? 0);
      hasBoundary[rb] = (hasBoundary[rb] ?? 0) | (hasBoundary[ra] ?? 0);
      return rb;
    }
    parent[rb] = ra;
    size[ra] = (size[ra] ?? 0) + (size[rb] ?? 0);
    hasBoundary[ra] = (hasBoundary[ra] ?? 0) | (hasBoundary[rb] ?? 0);
    return ra;
  };

  type Edge = { i: number; j: number; w: number };
  const edges: Edge[] = [];
  for (let i = 0; i < k; i += 1) {
    edges.push({ i, j: -1, w: boundW(defects[i]!) });
    for (let j = i + 1; j < k; j += 1) edges.push({ i, j, w: pairW(defects[i]!, defects[j]!) });
  }
  edges.sort((a, b) => a.w - b.w || a.i - b.i || a.j - b.j);

  const adj: number[][] = Array.from({ length: k }, () => []);
  const boundaryAt = new Int32Array(k).fill(-1);
  let oddLeft = k;
  for (const e of edges) {
    if (oddLeft === 0) break;
    if (e.j === -1) {
      const r = find(e.i);
      if (!odd(r)) continue;
      hasBoundary[r] = 1;
      boundaryAt[e.i] = 1;
      oddLeft -= 1;
      continue;
    }
    const ra = find(e.i);
    const rb = find(e.j);
    if (ra === rb) continue;
    const oa = odd(ra);
    const ob = odd(rb);
    if (!oa && !ob) continue;
    adj[e.i]!.push(e.j);
    adj[e.j]!.push(e.i);
    const nr = union(e.i, e.j);
    const nowOdd = odd(nr);
    oddLeft += nowOdd ? 1 : 0;
    oddLeft -= (oa ? 1 : 0) + (ob ? 1 : 0);
  }

  const pairs: [SpaceTimeDefect, SpaceTimeDefect | null][] = [];
  const seen = new Uint8Array(k);
  const dfs = (u: number, parentIdx: number): boolean => {
    seen[u] = 1;
    let leftover = true;
    for (const v of adj[u]!) {
      if (v === parentIdx) continue;
      if (dfs(v, u)) {
        pairs.push([defects[u]!, defects[v]!]);
        leftover = !leftover;
      }
    }
    return leftover;
  };
  for (let i = 0; i < k; i += 1) {
    if (seen[i]) continue;
    let root = i;
    const stack = [i];
    const vis = new Uint8Array(k);
    vis[i] = 1;
    while (stack.length > 0) {
      const u = stack.pop()!;
      if (boundaryAt[u] === 1) root = u;
      for (const v of adj[u]!) {
        if (vis[v]) continue;
        vis[v] = 1;
        stack.push(v);
      }
    }
    if (dfs(root, -1)) pairs.push([defects[root]!, null]);
  }
  return pairs;
}

/**
 * Minimum-weight matching of 2D syndrome defects. Exact bitmask DP for ≤ EXACT_MATCH_LIMIT
 * defects, union-find clustering beyond. Returns the data-qubit correction and the pairing.
 */
export function decodeMatching(lat: Lattice, synd: Uint8Array): { correction: Uint8Array; pairs: [Defect, Defect | null][]; exact: boolean } {
  const defects: SpaceTimeDefect[] = [];
  for (let r = 0; r < lat.d; r += 1) for (let c = 0; c < lat.d - 1; c += 1) if (synd[lat.check(r, c)] === 1) defects.push({ r, c, t: 0 });
  const { pairs: stPairs, exact } = matchDefects(defects, lat.d, pairCost, (a) => boundaryCost(a, lat.d));
  const pairs: [Defect, Defect | null][] = stPairs.map(([a, b]) => [a, b]);
  const correction = new Uint8Array(lat.n);
  for (const [a, b] of pairs) paintPath(lat, correction, a, b);
  return { correction, pairs, exact };
}

export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i]! ^ b[i]!;
  return out;
}

/** One Monte Carlo trial of the Pauli-error surface code: did decoding fail? */
export function trialPauli(lat: Lattice, p: number, rand: () => number): boolean {
  const err = sampleErrors(lat, p, rand);
  const { correction } = decodeMatching(lat, syndrome(lat, err));
  return isLogicalError(lat, xor(err, correction));
}

export type PhenoOpts = {
  /** Data-qubit X probability per round. */
  pData: number;
  /** Check-measurement flip probability per noisy round. */
  pMeas: number;
  /** Number of noisy rounds. Default: the code distance. */
  rounds?: number;
};

/**
 * Phenomenological (2+1 D) noise: data X errors with probability pData before each of `rounds`
 * noisy syndrome extractions (each check flipped with probability pMeas), then one final perfect
 * round. Defects are *changes* in a check between consecutive rounds. Matching cost is Manhattan
 * in space plus |Δt| in time; a defect may also match to a rough boundary at its column distance.
 */
export function trialPhenomenological(lat: Lattice, p: number, rand: () => number, opts?: PhenoOpts): boolean {
  const pData = opts?.pData ?? p;
  const pMeas = opts?.pMeas ?? p;
  const rounds = opts?.rounds ?? lat.d;
  const acc = new Uint8Array(lat.n);
  const outcomes: Uint8Array[] = [new Uint8Array(lat.m)];
  for (let t = 0; t < rounds; t += 1) {
    for (let e = 0; e < lat.n; e += 1) if (rand() < pData) acc[e] = (acc[e] ?? 0) ^ 1;
    const s = syndrome(lat, acc);
    for (let c = 0; c < lat.m; c += 1) if (rand() < pMeas) s[c] = (s[c] ?? 0) ^ 1;
    outcomes.push(s);
  }
  outcomes.push(syndrome(lat, acc));
  const { correction } = decodeSpacetime(lat, outcomes);
  return isLogicalError(lat, xor(acc, correction));
}

/** Decode a history of check outcomes (including the initial all-zero round). */
export function decodeSpacetime(lat: Lattice, outcomes: readonly Uint8Array[]): { correction: Uint8Array; pairs: [SpaceTimeDefect, SpaceTimeDefect | null][]; exact: boolean } {
  const defects: SpaceTimeDefect[] = [];
  for (let t = 1; t < outcomes.length; t += 1) {
    const prev = outcomes[t - 1]!;
    const cur = outcomes[t]!;
    for (let r = 0; r < lat.d; r += 1) {
      for (let c = 0; c < lat.d - 1; c += 1) {
        const id = lat.check(r, c);
        if (((cur[id] ?? 0) ^ (prev[id] ?? 0)) === 1) defects.push({ r, c, t });
      }
    }
  }
  const { pairs, exact } = matchDefects(defects, lat.d);
  const correction = new Uint8Array(lat.n);
  for (const [a, b] of pairs) paintPath(lat, correction, a, b);
  return { correction, pairs, exact };
}

/**
 * Erasure model: each qubit is erased (location known) with probability p. A peeling decoder
 * succeeds unless the erased set contains a left→right chain, in which case the two candidate
 * corrections differ by a logical operator and the decoder guesses wrong half the time.
 */
export function erasureSpans(lat: Lattice, erased: Uint8Array): boolean {
  // union–find on checks plus two boundary super-nodes
  const L = lat.m;
  const R = lat.m + 1;
  const parent = Int32Array.from({ length: lat.m + 2 }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let e = 0; e < lat.n; e += 1) {
    if (erased[e] !== 1) continue;
    const g = lat.edges[e]!;
    if (g.kind === 'h') {
      const a = g.c === 0 ? L : lat.check(g.r, g.c - 1);
      const b = g.c === lat.d - 1 ? R : lat.check(g.r, g.c);
      union(a, b);
    } else {
      union(lat.check(g.r, g.c), lat.check(g.r + 1, g.c));
    }
  }
  return find(L) === find(R);
}

export function trialErasure(lat: Lattice, p: number, rand: () => number): boolean {
  const erased = sampleErrors(lat, p, rand);
  return erasureSpans(lat, erased) && rand() < 0.5;
}

/** Leading-order scaling p_L ≈ A (p/p_th)^⌈d/2⌉ used to read Λ = p_L(d)/p_L(d+2) ≈ p_th/p. */
export function scalingLogicalError(p: number, d: number, pTh: number, A = 0.1): number {
  return A * (p / pTh) ** Math.ceil(d / 2);
}

export function lambdaFromRatio(pLSmall: number, pLLarge: number): number {
  return pLSmall / pLLarge;
}

/** Standard planar-code thresholds for reference. */
export const PAULI_THRESHOLD = 0.103;
export const ERASURE_THRESHOLD = 0.5;
/** Phenomenological noise (data + measurement errors, d rounds, MWPM): Wang–Harrington–Preskill 2003. */
export const PHENO_THRESHOLD = 0.03;
