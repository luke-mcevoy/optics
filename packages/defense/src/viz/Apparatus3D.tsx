import { type RefObject, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';
import { PAPER } from '../data/paper.ts';
import {
  blockadeRadiusUm,
  collectionFraction,
  collectionHalfAngle,
  rayleighRangeUm,
  rbC6EstimateGHzUm6,
} from '../physics/beams.ts';
import { AtomField, BeamSheet, GaussianTube, TweezerField } from '../viz3d/Beams.tsx';
import { Callout } from '../viz3d/Callout.tsx';
import { type CameraRig, Stage3D } from '../viz3d/Stage3D.tsx';

/* ---------------------------------- scale & geometry ---------------------------------- */

/** World units per micrometre: the whole processor is drawn at 1 unit = 20 μm. */
const UM = 1 / 20;
const um = (x: number) => x * UM;

const ENT = { z: 0, depth: um(PAPER.deep.entanglingHeightUm), width: um(PAPER.deep.horizontalUm) };
const STO = {
  depth: um(PAPER.deep.storageHeightUm),
  z: -(ENT.depth / 2 + um(PAPER.deep.storageSepUm) + um(PAPER.deep.storageHeightUm) / 2),
};
const RO = { depth: um(30), z: ENT.depth / 2 + um(18) + um(15) };
const RES = { depth: um(45), z: ENT.depth / 2 + um(18) + um(30) + um(14) + um(45) / 2 };

const COLS = 16;
const ROWS = 8;
const N_ENT = COLS * ROWS; // static SLM atoms, one per gate site
const N_MOV = COLS * ROWS; // moving block: the second atom of every gate-site pair
const N_STO = 64; // other parked blocks
const N_RES = 192;
const N_ATOMS = N_ENT + N_MOV + N_STO + N_RES;
const I_MOV = N_ENT;
const I_STO = N_ENT + N_MOV;
const I_RES = I_STO + N_STO;

const PAIR_DX = um(PAPER.beams.pairSpacingUm) / 2;
const LOST_MOVER = 77;
const RES_FILL = 40;
const OBJ_Y = 3.0;

/* -------------------------------- derived physics numbers -------------------------------- */

const TWEEZER_W0_UM = 1.0; // assumption; the paper does not quote the trap waist
const TWEEZER_ZR_UM = rayleighRangeUm(TWEEZER_W0_UM, PAPER.slm.wavelengthNm / 1000);
const NA_THETA_DEG = (collectionHalfAngle(PAPER.imaging.na) * 180) / Math.PI;
const NA_FRACTION = collectionFraction(PAPER.imaging.na);
const C6_EST = rbC6EstimateGHzUm6(PAPER.rydberg.n);
const RB_UM = blockadeRadiusUm(C6_EST, PAPER.rydberg.rabiMHz);
const SITE_PITCH_UM = PAPER.deep.horizontalUm / COLS;

/* ---------------------------------- colours (conventions) ---------------------------------- */

const C = {
  slm: '#f5b942',
  aod: '#5ec8e5',
  atomStatic: '#ffd27a',
  atomMover: '#8fe3ff',
  atomRes: '#9aa4ad',
  rydberg: '#c9a0ff',
  blue420: '#6a5bff',
  ir1013: '#c22a2a',
  img780: '#ff4a3d',
  lat795: '#ff2d95',
  shield1529: '#ff8c42',
  photon: '#ff7a66',
};

const KEY = [
  { color: C.slm, label: '852 nm SLM tweezers (static) + the atoms they hold' },
  { color: C.aod, label: '852 nm AOD tweezers (the moving block)' },
  { color: C.blue420, label: '420 nm Rydberg top-hat' },
  { color: C.ir1013, label: '1013 nm Rydberg top-hat' },
  { color: C.img780, label: '780 nm imaging + fluorescence' },
  { color: C.lat795, label: '795 nm state-selective lattice' },
  { color: C.shield1529, label: '1529 nm shield' },
  { color: C.atomRes, label: 'reservoir atoms' },
] as const;

/* ------------------------------------ the machine cycle ------------------------------------ */

const CYCLE_S = 11;
const W = {
  holdStore: [0, 0.12],
  moveIn: [0.12, 0.3],
  holdEnt: [0.3, 0.44],
  flash: [0.35, 0.4],
  moveRead: [0.44, 0.6],
  lattice: [0.58, 0.66],
  image: [0.64, 0.78],
  lose: [0.66, 0.72],
  refill: [0.78, 0.86],
  moveHome: [0.86, 1.0],
} as const;

type Win = readonly [number, number];

function seg(u: number, w: Win): number {
  return Math.min(1, Math.max(0, (u - w[0]) / (w[1] - w[0])));
}
function ss(x: number): number {
  return x * x * (3 - 2 * x);
}
/** Trapezoid envelope: quick rise and fall, on for most of the window. */
function pulse(u: number, w: Win): number {
  if (u < w[0] || u > w[1]) return 0;
  const s = seg(u, w);
  const edge = 0.15;
  if (s < edge) return ss(s / edge);
  if (s > 1 - edge) return ss((1 - s) / edge);
  return 1;
}

type Tour = { label: string; window: Win; rig: CameraRig; closeUp?: boolean };

const SITE_X = (c: number) => (c - (COLS - 1) / 2) * (ENT.width / COLS);
const SITE_Z = (r: number) => (r - (ROWS - 1) / 2) * (ENT.depth / ROWS);
const FOCUS_SITE = { x: SITE_X(8), z: SITE_Z(4) };

const TOUR: readonly Tour[] = [
  { label: 'the whole machine', window: [0, 1], rig: { position: [9.5, 7.5, 12.5], target: [0, 0.3, 0.6] } },
  {
    label: 'light holds atoms',
    window: [0.3, 0.35],
    rig: { position: [FOCUS_SITE.x + 0.5, 0.62, FOCUS_SITE.z + 0.7], target: [FOCUS_SITE.x, 0.12, FOCUS_SITE.z] },
    closeUp: true,
  },
  { label: 'moving with sound', window: [0.1, 0.32], rig: { position: [7, 5, 3.5], target: [0, 0.2, -2.4] } },
  {
    label: 'the entangling flash',
    window: [0.34, 0.41],
    rig: { position: [FOCUS_SITE.x + 0.75, 0.7, FOCUS_SITE.z + 0.95], target: [FOCUS_SITE.x, 0.0, FOCUS_SITE.z] },
    closeUp: true,
  },
  { label: 'reading out', window: [0.57, 0.8], rig: { position: [6.5, 2.4, 8.2], target: [0, 0.6, RO.z] } },
  { label: 'the shield', window: [0.6, 0.78], rig: { position: [-6.0, 3.0, STO.z - 5.5], target: [0, 0.5, STO.z] } },
  { label: 'the pantry', window: [0.64, 0.9], rig: { position: [4.5, 4.5, 11], target: [0, 0.2, RES.z] } },
];

/* ------------------------------------------ scene ------------------------------------------ */

type Buffers = {
  pos: Float32Array;
  col: Float32Array;
  scl: Float32Array;
  twCol: Float32Array;
  home: Float32Array;
};

function makeBuffers(): Buffers {
  const pos = new Float32Array(N_ATOMS * 3);
  const col = new Float32Array(N_ATOMS * 3);
  const scl = new Float32Array(N_ATOMS).fill(1);
  const twCol = new Float32Array(N_ATOMS * 3);
  const home = new Float32Array(N_ATOMS * 3);
  const c = new THREE.Color();
  const set = (i: number, x: number, y: number, z: number, atom: string, tw: string) => {
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    home[i * 3] = x;
    home[i * 3 + 1] = y;
    home[i * 3 + 2] = z;
    c.set(atom);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    c.set(tw);
    twCol[i * 3] = c.r;
    twCol[i * 3 + 1] = c.g;
    twCol[i * 3 + 2] = c.b;
  };
  for (let r = 0; r < ROWS; r += 1) {
    for (let k = 0; k < COLS; k += 1) {
      set(r * COLS + k, SITE_X(k) - PAIR_DX, 0, SITE_Z(r), C.atomStatic, C.slm);
      set(I_MOV + r * COLS + k, SITE_X(k) + PAIR_DX, 0, SITE_Z(r), C.atomMover, C.aod);
    }
  }
  for (let i = 0; i < N_STO; i += 1) {
    const r = Math.floor(i / 32);
    const k = i % 32;
    set(I_STO + i, (k - 15.5) * (ENT.width / 32), 0, STO.z + (r === 0 ? -0.62 : 0.62), C.atomStatic, C.slm);
  }
  for (let i = 0; i < N_RES; i += 1) {
    const r = Math.floor(i / 32);
    const k = i % 32;
    set(I_RES + i, (k - 15.5) * (ENT.width / 32), 0, RES.z + (r - 2.5) * (RES.depth / 6), C.atomRes, C.slm);
  }
  return { pos, col, scl, twCol, home };
}

/** Where the moving block sits in each zone (4 rows × 32 columns in storage and readout). */
function blockSlot(i: number, zoneZ: number, depth: number): [number, number] {
  const r = Math.floor(i / 32);
  const k = i % 32;
  return [(k - 15.5) * (ENT.width / 32), zoneZ + (r - 1.5) * (depth / 4)];
}

const N_PHOTON = 320;
const PHOTON_SPEED = 3.2;
const COS_NA = Math.cos(collectionHalfAngle(PAPER.imaging.na));

function ApparatusScene({
  step,
  phaseEl,
}: {
  step: number;
  phaseEl: RefObject<HTMLSpanElement | null>;
}) {
  const buf = useMemo(makeBuffers, []);
  const flashRef = useRef(0);
  const latticeGain = useRef(0);
  const imageGain = useRef(0);
  const shieldGain = useRef(0.2);
  const focus = useRef({ x: FOCUS_SITE.x, z: FOCUS_SITE.z, r: 0.45, dim: 1 });
  const pairLabelRef = useRef<THREE.Group>(null);
  const rbLabelRef = useRef<THREE.Group>(null);
  const blockadeRef = useRef<THREE.Mesh>(null);
  const photonRef = useRef<THREE.Points>(null);
  const photon = useMemo(
    () => ({
      pos: new Float32Array(N_PHOTON * 3).fill(-50),
      dir: new Float32Array(N_PHOTON * 3),
      age: new Float32Array(N_PHOTON).fill(-1),
      next: 0,
    }),
    [],
  );
  const t0 = useRef<number | null>(null);
  const stepRef = useRef(step);
  if (stepRef.current !== step) {
    stepRef.current = step;
    t0.current = null;
  }
  const rydberg = useMemo(() => new THREE.Color(C.rydberg), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const tour = TOUR[stepRef.current] ?? TOUR[0]!;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const span = tour.window[1] - tour.window[0];
    const period = Math.max(3.2, span * CYCLE_S);
    const u = tour.window[0] + (((state.clock.elapsedTime - t0.current) / period) % 1) * span;

    /* ---- moving block ---- */
    let zoneA: 'sto' | 'ent' | 'ro' = 'sto';
    let zoneB: 'sto' | 'ent' | 'ro' = 'sto';
    let f = 0;
    let phase = 'holding in storage · T₂ > 1 s';
    if (u < W.holdStore[1]) {
      zoneA = zoneB = 'sto';
    } else if (u < W.moveIn[1]) {
      zoneA = 'sto';
      zoneB = 'ent';
      f = ss(seg(u, W.moveIn));
      phase = 'AOD move, storage → entangling';
    } else if (u < W.holdEnt[1]) {
      zoneA = zoneB = 'ent';
      phase = u >= W.flash[0] && u <= W.flash[1] ? `Rydberg CZ · ${PAPER.rydberg.gateNs} ns` : 'paired at gate sites';
    } else if (u < W.moveRead[1]) {
      zoneA = 'ent';
      zoneB = 'ro';
      f = ss(seg(u, W.moveRead));
      phase = 'AOD move, entangling → readout';
    } else if (u < W.moveHome[0]) {
      zoneA = zoneB = 'ro';
      phase =
        u < W.lattice[1]
          ? `795 nm lattice on · spin → position, ${PAPER.lattice.splitUm} μm in ${PAPER.lattice.splitUs} μs`
          : u < W.refill[0]
            ? '780 nm imaging · fluorescence to camera'
            : 'reset, re-cool, refill from reservoir';
    } else {
      zoneA = 'ro';
      zoneB = 'sto';
      f = ss(seg(u, W.moveHome));
      phase = 'AOD move, readout → storage';
    }
    if (phaseEl.current !== null) phaseEl.current.textContent = phase;

    const slot = (i: number, zone: 'sto' | 'ent' | 'ro'): [number, number] => {
      if (zone === 'ent') return [SITE_X(i % COLS) + PAIR_DX, SITE_Z(Math.floor(i / COLS))];
      if (zone === 'sto') return blockSlot(i, STO.z, STO.depth);
      return blockSlot(i, RO.z, RO.depth);
    };
    const flash = pulse(u, W.flash);
    flashRef.current = flash;
    latticeGain.current = pulse(u, W.lattice);
    imageGain.current = pulse(u, W.image);
    shieldGain.current = 0.2 + 0.8 * pulse(u, W.image);

    for (let i = 0; i < N_MOV; i += 1) {
      const a = slot(i, zoneA);
      const b = slot(i, zoneB);
      const o = (I_MOV + i) * 3;
      buf.pos[o] = a[0] + (b[0] - a[0]) * f;
      buf.pos[o + 2] = a[1] + (b[1] - a[1]) * f;
      // lift the block slightly while in flight: purely a visual cue that it is an AOD trap
      buf.pos[o + 1] = 0.06 * Math.sin(Math.PI * f);
      // split the two spin states 2 μm apart in the lattice window (readout zone only)
      if (zoneA === 'ro' && zoneB === 'ro') {
        const split = ss(seg(u, W.lattice)) * (u < W.refill[0] ? 1 : 1 - ss(seg(u, W.refill)));
        if (i % 3 === 0) buf.pos[o + 2] = (buf.pos[o + 2] ?? 0) + um(PAPER.lattice.splitUm) * split;
      }
    }

    /* ---- spotlight for close-up steps: dim everything away from the focus site ---- */
    const closeUp = tour.closeUp === true;
    const dimGoal = closeUp ? 0.06 : 1;
    focus.current.dim += (dimGoal - focus.current.dim) * Math.min(1, dt * 4);
    const dimOf = (x: number, z: number) => {
      const d = Math.hypot(x - focus.current.x, z - focus.current.z);
      const t = Math.min(1, Math.max(0, (d - focus.current.r) / (focus.current.r * 0.6)));
      return focus.current.dim + (1 - focus.current.dim) * (1 - t);
    };
    if (pairLabelRef.current !== null) pairLabelRef.current.visible = closeUp && focus.current.dim < 0.5;
    if (rbLabelRef.current !== null) rbLabelRef.current.visible = flash > 0.3;

    /* ---- Rydberg colouring of the pairs ---- */
    for (let i = 0; i < N_ENT; i += 1) {
      for (const idx of [i, I_MOV + i]) {
        const base = idx < I_MOV ? C.atomStatic : C.atomMover;
        tmp.set(base).lerp(rydberg, flash);
        const k = dimOf(buf.pos[idx * 3] ?? 0, buf.pos[idx * 3 + 2] ?? 0);
        buf.col[idx * 3] = tmp.r * k;
        buf.col[idx * 3 + 1] = tmp.g * k;
        buf.col[idx * 3 + 2] = tmp.b * k;
        buf.scl[idx] = 1 + 0.7 * flash;
      }
    }
    for (let idx = I_STO; idx < N_ATOMS; idx += 1) {
      tmp.set(idx < I_RES ? C.atomStatic : C.atomRes);
      const k = dimOf(buf.pos[idx * 3] ?? 0, buf.pos[idx * 3 + 2] ?? 0);
      buf.col[idx * 3] = tmp.r * k;
      buf.col[idx * 3 + 1] = tmp.g * k;
      buf.col[idx * 3 + 2] = tmp.b * k;
    }
    if (blockadeRef.current !== null) {
      const m = blockadeRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.28 * flash;
      blockadeRef.current.visible = flash > 0.01;
      blockadeRef.current.position.set(FOCUS_SITE.x - PAIR_DX, 0, FOCUS_SITE.z);
    }

    /* ---- one atom is lost during imaging, then refilled from the reservoir ---- */
    const lostScale = u < W.lose[0] ? 1 : u < W.lose[1] ? 1 - ss(seg(u, W.lose)) : u < W.refill[1] ? 0 : 1;
    buf.scl[I_MOV + LOST_MOVER] = lostScale * (1 + 0.7 * flash);
    const rf = ss(seg(u, W.refill));
    const resIdx = I_RES + RES_FILL;
    const target = slot(LOST_MOVER, 'ro');
    const hx = buf.home[resIdx * 3] ?? 0;
    const hz = buf.home[resIdx * 3 + 2] ?? 0;
    if (u >= W.refill[0] && u < W.refill[1]) {
      buf.pos[resIdx * 3] = hx + (target[0] - hx) * rf;
      buf.pos[resIdx * 3 + 1] = 0.08 * Math.sin(Math.PI * rf);
      buf.pos[resIdx * 3 + 2] = hz + (target[1] - hz) * rf;
      buf.scl[resIdx] = 1;
    } else if (u >= W.refill[1]) {
      buf.scl[resIdx] = 0; // it has become the refilled qubit
    } else {
      buf.pos[resIdx * 3] = hx;
      buf.pos[resIdx * 3 + 1] = 0;
      buf.pos[resIdx * 3 + 2] = hz;
      buf.scl[resIdx] = 1;
    }

    /* ---- fluorescence photons ---- */
    const emitting = imageGain.current > 0.05;
    const spawnPerSec = 260 * imageGain.current;
    let toSpawn = emitting ? Math.floor(spawnPerSec * dt + Math.random()) : 0;
    for (let i = 0; i < N_PHOTON; i += 1) {
      let age = photon.age[i] ?? -1;
      if (age < 0) {
        if (toSpawn > 0) {
          toSpawn -= 1;
          // 2 in 3 movers are "bright" (cycling on F=2 → F′=3); dark-state atoms scatter nothing
          let src = Math.floor(Math.random() * N_MOV);
          if (src % 3 === 0) src = (src + 1) % N_MOV;
          if ((buf.scl[I_MOV + src] ?? 1) < 0.5) continue; // the lost atom cannot fluoresce
          const so = (I_MOV + src) * 3;
          const z = 2 * Math.random() - 1;
          const ph = 2 * Math.PI * Math.random();
          const s = Math.sqrt(1 - z * z);
          photon.pos[i * 3] = buf.pos[so] ?? 0;
          photon.pos[i * 3 + 1] = buf.pos[so + 1] ?? 0;
          photon.pos[i * 3 + 2] = buf.pos[so + 2] ?? 0;
          // the isotropic direction, with y as the optical axis toward the objective
          photon.dir[i * 3] = s * Math.cos(ph);
          photon.dir[i * 3 + 1] = z;
          photon.dir[i * 3 + 2] = s * Math.sin(ph);
          photon.age[i] = 0;
        }
        continue;
      }
      age += dt;
      const dy = photon.dir[i * 3 + 1] ?? 0;
      const collected = dy > COS_NA;
      const py = (photon.pos[i * 3 + 1] ?? 0) + dy * PHOTON_SPEED * dt;
      const dead = collected ? py > OBJ_Y : age > 0.55;
      if (dead) {
        photon.age[i] = -1;
        photon.pos[i * 3 + 1] = -50;
        continue;
      }
      photon.age[i] = age;
      photon.pos[i * 3] = (photon.pos[i * 3] ?? 0) + (photon.dir[i * 3] ?? 0) * PHOTON_SPEED * dt;
      photon.pos[i * 3 + 1] = py;
      photon.pos[i * 3 + 2] = (photon.pos[i * 3 + 2] ?? 0) + (photon.dir[i * 3 + 2] ?? 0) * PHOTON_SPEED * dt;
    }
    const pts = photonRef.current;
    if (pts !== null) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  const photonGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(photon.pos, 3));
    return g;
  }, [photon]);
  const photonMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(C.photon) }, uSize: { value: 0.22 } },
        vertexShader: /* glsl */ `
          uniform float uSize;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * 300.0 / max(0.2, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = smoothstep(1.0, 0.15, r);
            gl_FragColor = vec4(uColor * (0.6 + 0.9 * a), a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const w0 = um(TWEEZER_W0_UM);
  const zR = um(TWEEZER_ZR_UM);

  return (
    <group>
      {/* zones */}
      <Zone z={STO.z} depth={STO.depth} color={C.slm} label="storage" />
      <Zone z={ENT.z} depth={ENT.depth} color={C.rydberg} label="entangling" />
      <Zone z={RO.z} depth={RO.depth} color={C.img780} label="readout" />
      <Zone z={RES.z} depth={RES.depth} color={C.atomRes} label="reservoir" />

      {/* atoms and their tweezers */}
      <AtomField positions={buf.pos} colors={buf.col} scales={buf.scl} count={N_ATOMS} radius={0.036} />
      <TweezerField
        positions={buf.pos}
        colors={buf.twCol}
        count={N_ATOMS}
        w0={w0}
        zR={zR}
        yMin={-0.4}
        yMax={1.1}
        opacity={0.5}
        focusRef={focus}
      />

      {/* labels for the focus pair, shown only in the close-up steps */}
      <group ref={pairLabelRef} position={[FOCUS_SITE.x, 0, FOCUS_SITE.z]} visible={false}>
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[PAIR_DX * 2, 0.004, 0.004]} />
          <meshBasicMaterial color="#e8e4dc" />
        </mesh>
        <Text position={[0, -0.09, 0]} fontSize={0.035} color="#e8e4dc" anchorX="center" anchorY="top">
          {`${PAPER.beams.pairSpacingUm} μm`}
        </Text>
        <Text position={[-PAIR_DX - 0.03, 0.08, 0]} fontSize={0.03} color={C.slm} anchorX="right" anchorY="bottom">
          SLM trap
        </Text>
        <Text position={[PAIR_DX + 0.03, 0.08, 0]} fontSize={0.03} color={C.aod} anchorX="left" anchorY="bottom">
          AOD trap
        </Text>
        <group ref={rbLabelRef} visible={false}>
          <Text
            position={[-PAIR_DX, um(RB_UM) + 0.03, 0]}
            fontSize={0.035}
            color={C.rydberg}
            anchorX="center"
            anchorY="bottom"
            fillOpacity={0.9}
          >
            {`R_b ≈ ${RB_UM.toFixed(1)} μm`}
          </Text>
        </group>
      </group>

      {/* Rydberg top-hat sheets: 420 nm and 1013 nm, along x through the entangling zone */}
      <BeamSheet position={[0, 0.03, ENT.z]} width={13} depth={ENT.depth} color={C.blue420} pulseRef={flashRef} k={9} speed={22} />
      <BeamSheet position={[0, -0.03, ENT.z]} width={13} depth={ENT.depth} color={C.ir1013} pulseRef={flashRef} k={4} speed={-16} opacity={0.4} />

      {/* blockade sphere around one atom of the focus pair */}
      <mesh ref={blockadeRef} visible={false}>
        <sphereGeometry args={[um(RB_UM), 32, 24]} />
        <meshBasicMaterial color={C.rydberg} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* readout-zone light: 795 nm lattice (standing wave), 780 nm imaging (travelling) */}
      <GaussianTube
        center={[0, 0, RO.z]}
        length={13}
        wy={um(PAPER.beams.latticeWaistUm)}
        wz={um(PAPER.beams.latticeWaistUm)}
        color={C.lat795}
        mode={2}
        k={40}
        opacity={0.09}
        gainRef={latticeGain}
      />
      <GaussianTube
        center={[0, 0, RO.z]}
        length={13}
        wy={um(PAPER.beams.imagingWaistUm)}
        wz={um(PAPER.beams.imagingWaistUm)}
        color={C.img780}
        mode={1}
        k={10}
        speed={14}
        opacity={0.09}
        gainRef={imageGain}
      />

      {/* 1,529 nm shield: elliptical, 35 μm across the storage zone × 65 μm tall */}
      <GaussianTube
        center={[0, 0, STO.z]}
        length={13}
        wy={um(PAPER.beams.shieldWaistUm[1])}
        wz={um(PAPER.beams.shieldWaistUm[0])}
        color={C.shield1529}
        mode={1}
        k={3}
        speed={6}
        opacity={0.04}
        gainRef={shieldGain}
      />

      {/* fluorescence */}
      <points ref={photonRef} geometry={photonGeometry} frustumCulled={false} material={photonMaterial} />

      {/* objective and camera (schematic, not to scale) */}
      <group position={[0, OBJ_Y, 0.6]}>
        <mesh>
          <cylinderGeometry args={[4.4, 4.4, 0.22, 64]} />
          <meshStandardMaterial color="#1b2430" metalness={0.5} roughness={0.25} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.4, 0.05, 12, 96]} />
          <meshStandardMaterial color="#8fa3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        <Callout position={[-3.4, 0.2, -2.6]}>
          {`objective · NA ${PAPER.imaging.na} · θ = ${NA_THETA_DEG.toFixed(1)}° · not to scale`}
        </Callout>
      </group>
      <group position={[0, OBJ_Y + 1.35, 0.6]}>
        <mesh>
          <boxGeometry args={[1.4, 0.9, 1.4]} />
          <meshStandardMaterial color="#141a21" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#0a0c10" />
        </mesh>
        <Callout position={[0, 0.75, 0]}>camera</Callout>
      </group>

      {/* 50 μm scale bar */}
      <group position={[-ENT.width / 2 - 0.6, 0, RES.z + RES.depth / 2 + 0.6]}>
        <mesh position={[um(25), 0, 0]}>
          <boxGeometry args={[um(50), 0.02, 0.02]} />
          <meshBasicMaterial color="#e8e4dc" />
        </mesh>
        <Text position={[um(25), 0.1, 0]} fontSize={0.2} color="#e8e4dc" anchorX="center" anchorY="bottom">
          50 μm
        </Text>
      </group>

      {/* beam entry labels */}
      <Callout position={[-6.9, 0.25, ENT.z]}>420 + 1013 nm</Callout>
      <Callout position={[6.9, 0.25, RO.z]}>780 + 795 nm</Callout>
      <Callout position={[-6.9, 0.25, STO.z]}>1529 nm shield</Callout>
    </group>
  );
}

function Zone({ z, depth, color, label }: { z: number; depth: number; color: string; label: string }) {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(ENT.width + 0.6, 0.001, depth + 0.3)),
    [depth],
  );
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ENT.width + 0.6, depth + 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, -0.02, 0]} geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </lineSegments>
      <Callout position={[ENT.width / 2 + 1.1, 0, 0]}>{label}</Callout>
    </group>
  );
}

/* ------------------------------------------ figure ------------------------------------------ */

export function Apparatus3D() {
  const [step, setStep] = useState(0);
  const phaseEl = useRef<HTMLSpanElement | null>(null);
  const tour = TOUR[step] ?? TOUR[0]!;

  const steps: readonly StepDef[] = [
    {
      label: TOUR[0]!.label,
      text: (
        <>
          The processor, drawn at one consistent scale (1 world unit = 20 μm; the objective and
          camera are schematic). Four zones from back to front: <strong>storage</strong>, a{' '}
          {PAPER.deep.storageHeightUm} μm strip parked {PAPER.deep.storageSepUm} μm from the{' '}
          <strong>entangling</strong> zone, itself {PAPER.deep.horizontalUm} × {PAPER.deep.entanglingHeightUm} μm
          with {PAPER.deep.grid} gate sites (two atoms each, up to {PAPER.deep.entangleQubits} qubits);{' '}
          <strong>readout</strong>, {PAPER.deep.readoutRows} rows for {PAPER.deep.readoutAtoms} atoms; and the{' '}
          <strong>reservoir</strong>, {PAPER.deep.reservoirRows} rows holding up to {PAPER.deep.reservoirAtoms}{' '}
          spares. Every glowing dot is one rubidium atom; every amber or cyan hourglass is the laser
          beam that holds it. Let the cycle run, then step through what each colour of light does.
        </>
      ),
    },
    {
      label: TOUR[1]!.label,
      text: (
        <>
          Zoomed onto one gate site: two atoms {PAPER.beams.pairSpacingUm} μm apart, each pinned at
          the focus of an {PAPER.slm.wavelengthNm} nm beam. The hourglass is not decoration — it is
          the Gaussian envelope w(z) = w₀√(1 + (z/z_R)²) drawn to scale for an assumed waist w₀ ={' '}
          {TWEEZER_W0_UM} μm (the paper does not quote it), giving z_R = πw₀²/λ ={' '}
          {TWEEZER_ZR_UM.toFixed(1)} μm. The beam is red-detuned from the atom&rsquo;s resonances,
          so intensity means lower energy and the atom rolls into the brightest point. Amber beams
          come from the SLM hologram and never move; the cyan one is a moving AOD trap. Traps in the
          entangling and storage zones run at half the depth of the readout and reservoir traps to
          protect coherence.
        </>
      ),
    },
    {
      label: TOUR[2]!.label,
      text: (
        <>
          A whole block of {N_MOV} atoms glides from storage into the entangling zone at once. Each
          cyan beam is steered by a pair of crossed acousto-optic deflectors: a radio-frequency tone
          in a crystal sets the angle, so many tones make many beams and chirping them all together
          moves the grid. The paper translates the grid but never compresses it — stretching the
          tone comb beats near the trap frequency and heats atoms. Motion dominates the clock: in
          the surface-code round, {PAPER.control.ancillaExchangeMs} ms of the {PAPER.control.qecRoundMs} ms
          was spent swapping ancilla blocks like this.
        </>
      ),
    },
    {
      label: TOUR[3]!.label,
      text: (
        <>
          Two sheets of light sweep along the entangling zone: {PAPER.rydberg.blueNm} nm (violet) and{' '}
          {PAPER.rydberg.irNm} nm (red), shaped into top-hats {PAPER.beams.rydbergTophatUm} μm tall and
          flat to ~{PAPER.surface.homogeneityPct}%. Together they lift both atoms of every pair toward
          the n = {PAPER.rydberg.n} Rydberg state for {PAPER.rydberg.gateNs} ns. The translucent sphere
          is the blockade radius R_b = (C₆/ħΩ)^(1/6): with Ω = 2π × {PAPER.rydberg.rabiMHz} MHz from the
          paper and C₆/h ≈ {C6_EST.toFixed(0)} GHz·μm⁶ estimated from the published n*¹¹ scaling (not a
          paper number), R_b ≈ {RB_UM.toFixed(1)} μm. It swallows the partner {PAPER.beams.pairSpacingUm} μm
          away but not the next site {SITE_PITCH_UM.toFixed(0)} μm over — that is the design point. The
          storage zone sits {PAPER.deep.storageSepUm} μm back, beyond the beam tails.
        </>
      ),
    },
    {
      label: TOUR[4]!.label,
      text: (
        <>
          The used block is parked in the readout zone under two sets of counter-propagating beams
          that run along the rows. First the {PAPER.lattice.wavelengthNm} nm lattice (magenta) — a
          standing wave whose period is exaggerated here; the real one is 0.4 μm — pins atoms in the
          bright clock state while cyan AOD traps drag the dark-state atoms {PAPER.lattice.splitUm} μm
          sideways in {PAPER.lattice.splitUs} μs. Then {PAPER.cooling.wavelengthNm} nm imaging light (red,
          waist {PAPER.beams.imagingWaistUm} μm) makes them fluoresce. The sparks are photons leaving in
          random directions; only those inside the objective&rsquo;s cone (half-angle{' '}
          {NA_THETA_DEG.toFixed(1)}° for NA {PAPER.imaging.na}, i.e. (1 − cos θ)/2 ={' '}
          {(NA_FRACTION * 100).toFixed(1)}% of them) reach the camera. Bit-flip error{' '}
          {PAPER.lattice.bitFlipPct}({PAPER.lattice.bitFlipUnc * 100})%, loss {PAPER.lattice.lossPct}(
          {PAPER.lattice.lossUnc * 100})% — watch one atom vanish.
        </>
      ),
    },
    {
      label: TOUR[5]!.label,
      text: (
        <>
          While the readout zone is lit, qubits in storage must not scatter a single photon. The
          orange beam is {PAPER.shield.operateNm} nm light at ~{PAPER.shield.powerW} W, elliptical
          ({PAPER.shield.waistUm} μm) so it blankets the {PAPER.deep.storageHeightUm} μm storage strip and
          nothing else. It couples 5P₃/₂ to 4D₅/₂ and shifts the excited state by ~{PAPER.shield.lightshiftGHz}{' '}
          GHz, so stray 780 nm light finds no resonance there while the ground-state qubit (shifted
          ~2 × 10⁻⁵ as much) is untouched. The tail toward the readout zone is cut with a knife-edge;
          stray 1,529 nm light degrades imaging.
        </>
      ),
    },
    {
      label: TOUR[6]!.label,
      text: (
        <>
          The grey atoms are the reservoir: {PAPER.deep.reservoirRows} rows, up to{' '}
          {PAPER.deep.reservoirAtoms} atoms, loaded once at the start with {PAPER.loadingPct}% filling by
          grey-molasses cooling and compacted. After each image, holes in the working block are refilled
          row by row from a single reservoir row, then the block is re-cooled and re-pumped in place.
          The imaging beams do not reach the reservoir, so its occupancy is tracked in software from the
          initial global picture. In the deepest runs the reservoir lasted {PAPER.deep.layers} layers,
          about {PAPER.deep.circuitS} s — the current depth limit, and the reason continuous reloading is
          the next step.
        </>
      ),
    },
  ];

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="1"
        title="The processor, drawn in light"
        caption={
          <>
            Zone dimensions, atom counts, beam waists, wavelengths and durations are the paper&rsquo;s
            (Methods: system overview, deep-circuit configuration, spin-to-position conversion,
            shielding beam). Drawn assumptions: tweezer waist 1 μm; blockade radius from a literature
            C₆ scaling; objective and camera placed 60 μm above the atoms rather than millimetres;
            lattice period exaggerated 8×; photon speed and count are illustrative. Colours are display
            conventions — 1013 and 1529 nm are invisible infrared. Orbit freely; each step re-aims
            the camera.
          </>
        }
      >
        <Panel tag="a" title="Storage · entangling · readout · reservoir, and every beam that touches them" wide>
          <Stage3D
            tall
            rig={tour.rig}
            autoRotate={false}
            minDistance={0.5}
            maxDistance={24}
            overlay={
              <div className="stage-phase">
                <span ref={phaseEl} />
              </div>
            }
          >
            <ApparatusScene step={step} phaseEl={phaseEl} />
          </Stage3D>
          <ul className="beam-key">
            {KEY.map((k) => (
              <li key={k.label}>
                <span className="swatch" style={{ background: k.color }} />
                {k.label}
              </li>
            ))}
          </ul>
        </Panel>
      </Figure>
    </div>
  );
}
