/**
 * The whole instrument on one optical table, running one layer of a computation.
 *
 * Every laser, modulator, coil, camera and signal generator named in the paper's Methods is
 * drawn; each lights up when the run program (data/program.ts) says it fires, and light is
 * drawn travelling from source to atoms only while its whole chain is on. The table layout
 * is a schematic reconstruction — the paper's Extended Data Fig. 1a shows the real one.
 */
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Figure, Panel } from '../components/Figure.tsx';
import { Steps, type StepDef } from '../components/Steps.tsx';
import { PAPER } from '../data/paper.ts';
import {
  type Activity,
  emptyActivity,
  evalActivity,
  EVENTS,
  type Instrument,
  PHASES,
  phaseAt,
  RUN_S,
  seg,
  smooth,
  type Window,
} from '../data/program.ts';
import { collectionHalfAngle } from '../physics/beams.ts';
import { AtomField, BeamSheet, GaussianTube } from '../viz3d/Beams.tsx';
import { Callout } from '../viz3d/Callout.tsx';
import {
  type ActivityRef,
  AODCrystal,
  BeamPath,
  Cable,
  Coil,
  Cube,
  Device,
  GlassCell,
  Indicator,
  Lens,
  LightCone,
  Plate,
  SLMPanel,
  type V3,
} from '../viz3d/Instruments.tsx';
import { type CameraRig, Stage3D } from '../viz3d/Stage3D.tsx';
import { clear, sizeCanvas } from './canvas.ts';
import { useRaf } from './useRaf.ts';

/* ------------------------------------------ colours ------------------------------------------ */

const C = {
  trap: '#f5b942',
  aod: '#5ec8e5',
  raman: '#7cff9a',
  blue420: '#6a5bff',
  ir1013: '#c22a2a',
  img780: '#ff4a3d',
  lat795: '#ff2d95',
  shield: '#ff8c42',
  mot: '#ff6b5e',
  molasses: '#ff9ad1',
  rack: '#8ec8ff',
  micro: '#d6b3ff',
  camera: '#e8e4dc',
  atomStatic: '#ffd27a',
  atomMover: '#8fe3ff',
  atomRes: '#9aa4ad',
  rydberg: '#c9a0ff',
  coil: '#ff8a3d',
} as const;

const KEY = [
  { color: C.trap, label: '852 nm trap light (SLM + AODs)' },
  { color: C.raman, label: 'Raman light (single-qubit gates)' },
  { color: C.blue420, label: '420 nm Rydberg' },
  { color: C.ir1013, label: '1013 nm Rydberg' },
  { color: C.lat795, label: '795 nm lattice' },
  { color: C.img780, label: '780 nm imaging / cooling / MOT' },
  { color: C.shield, label: '1529 nm shield' },
  { color: C.rack, label: 'AWG rack and cables' },
] as const;

/* ------------------------------------------ geometry ------------------------------------------ */

const Y = 0.5; // beam height above the table
const CELL: V3 = [0, Y, 0];
const OBJ_BOTTOM = 1.18;
const OBJ_TOP = 1.78;
const Y_DICH2 = 2.25; // Raman joins here
const Y_DICH1 = 3.0; // trap light joins here
const Y_TUBE = 3.7;
const Y_CAM = 4.55;

const v = (x: number, y: number, z: number): V3 => [x, y, z];

/**
 * Row-parallel beams all travel along x, stacked in z the way the zones are stacked:
 * shield over storage (z = −0.5), Rydberg through the entangling zone (−0.12), lattice and
 * imaging through the readout zone (+0.25). The same z values place the zones in the inset.
 */
const LINE = { shield: -0.5, ryd: -0.12, read: 0.25 } as const;
const HALF_CELL = 0.65;


/** Trap path: laser → PBS → {AOD branch | SLM branch} → PBS → periscope → dichroic → objective. */
const TRAP = {
  laser: v(-8.6, Y, -3),
  pbs1: v(-7.2, Y, -3),
  aod1: v(-6.3, Y, -3),
  aod2: v(-5.7, Y, -3),
  lensA: v(-4.7, Y, -3),
  pbs2: v(-3.6, Y, -3),
  lensB: v(-2.2, Y, -3),
  peri0: v(-1.0, Y, -3),
  peri1: v(-1.0, Y_DICH1, -3),
  turn: v(-1.0, Y_DICH1, 0),
  dich1: v(0, Y_DICH1, 0),
  m1: v(-7.2, Y, -5.2),
  slm: v(-3.6, Y, -5.2),
  lensS: v(-3.6, Y, -4.3),
};

/** Raman path: laser → IQ modulator → PBS → {local AODs → periscope → dichroic | global diagonal}. */
const RAMAN = {
  laser: v(8.6, Y, 3.2),
  iq: v(7.2, Y, 3.2),
  pbs: v(5.6, Y, 3.2),
  aod1: v(4.7, Y, 3.2),
  aod2: v(4.15, Y, 3.2),
  lens: v(3.3, Y, 3.2),
  peri0: v(2.0, Y, 3.2),
  peri1: v(2.0, Y_DICH2, 3.2),
  comp: v(2.0, Y_DICH2, 1.7),
  turn: v(2.0, Y_DICH2, 0),
  dich2: v(0, Y_DICH2, 0),
  gMirror: v(5.6, Y, 1.7),
  gLens: v(4.2, Y, 1.275),
  gEnd: v(HALF_CELL, Y, 0.2),
};

const RYD = {
  z: LINE.ryd,
  laser420: v(-9.6, Y, LINE.ryd),
  aom420: v(-8.4, Y, LINE.ryd),
  shaper420: v(-7.0, Y, LINE.ryd),
  lens420: v(-4.6, Y, LINE.ryd),
  laser1013: v(8.6, Y, LINE.ryd),
  aom1013: v(7.3, Y, LINE.ryd),
  shaper1013: v(5.6, Y, LINE.ryd),
  lens1013: v(3.6, Y, LINE.ryd),
};

const READ = {
  latLaser: v(8.6, Y, 1.3),
  latM1: v(6.4, Y, 1.3),
  latM2: v(6.4, Y, LINE.read),
  imgLaser: v(8.6, Y, 2.2),
  imgM1: v(6.0, Y, 2.2),
  dich: v(6.0, Y, LINE.read),
  lens: v(3.4, Y, LINE.read),
  cellIn: v(HALF_CELL, Y, LINE.read),
  cellOut: v(-HALF_CELL, Y, LINE.read),
  qwp: v(-2.3, Y, LINE.read),
  retro: v(-2.9, Y, LINE.read),
};

const SHIELD = {
  laser: v(-8.6, Y, LINE.shield),
  lens1: v(-7.4, Y, LINE.shield),
  knife: v(-6.6, Y, LINE.shield),
  lens2: v(-5.8, Y, LINE.shield),
  cellIn: v(-HALF_CELL, Y, LINE.shield),
  cellOut: v(HALF_CELL, Y, LINE.shield),
  dump: v(2.2, Y, LINE.shield),
};

const RACK = {
  awg: v(8.6, 1.15, -2.9),
  slots: ['awgRearr', 'awgMove', 'awgRydberg', 'awgRaman', 'awgRamanAod'] as const,
  slotLabels: ['Rearrangement AWG · 2 ch, FIFO', 'Moving AOD AWG · 2 ch', 'Rydberg AWG · 2 ch', 'Raman AWG · 4 ch, IQ', 'Raman AOD AWG · 2 ch'],
  slotY: [2.0, 1.6, 1.2, 0.8, 0.4],
  micro: v(8.6, Y, -4.5),
  computer: v(8.6, Y, -1.4),
};

const COS_NA = Math.cos(collectionHalfAngle(PAPER.imaging.na));

/* -------------------------------------------- tour -------------------------------------------- */

type Tour = { label: string; window: Window; rig: CameraRig; minDistance?: number };

const TOUR: readonly Tour[] = [
  { label: 'the whole table', window: [0, 1], rig: { position: [0.4, 13.4, 17.2], target: [0, 1.7, -0.6] } },
  { label: 'holding: SLM + AODs', window: [0.08, 0.3], rig: { position: [-4.0, 6.5, 2.5], target: [-4.8, 0.4, -3.9] } },
  { label: 'loading + first picture', window: [0, 0.28], rig: { position: [6.0, 5.5, 7.0], target: [0, 2.2, 0] } },
  { label: 'single-qubit gates', window: [0.33, 0.47], rig: { position: [10.5, 7.5, 10.5], target: [3.8, 1.3, 1.6] } },
  { label: 'the entangling flash', window: [0.46, 0.53], rig: { position: [0.5, 9.5, 15.5], target: [0, 0.4, 0.0] } },
  { label: 'reading the qubits', window: [0.58, 0.8], rig: { position: [7.5, 9.0, 9.0], target: [3.5, 0.5, 0.5] } },
  { label: 'shielding memory', window: [0.64, 0.8], rig: { position: [-7.5, 5.5, 5.5], target: [-4.5, 0.4, -0.4] } },
  { label: 'who plays it', window: [0, 1], rig: { position: [12.5, 5.0, 3.5], target: [8.4, 1.2, -2.6] } },
  { label: 'inside the cell', window: [0.28, 1.0], rig: { position: [1.3, 1.5, 1.6], target: [0, Y, 0] }, minDistance: 0.4 },
];

/* ---------------------------------------- shared clock ---------------------------------------- */

type Clock = { u: number; playing: boolean; window: Window; act: Activity };

function ClockDriver({ clock, phaseEl }: { clock: RefObject<Clock>; phaseEl: RefObject<HTMLSpanElement | null> }) {
  useFrame((_, dt) => {
    const c = clock.current;
    if (c === null) return;
    const span = c.window[1] - c.window[0];
    const period = Math.max(4.5, span * RUN_S);
    if (c.playing) {
      c.u += (dt / period) * span;
      if (c.u > c.window[1]) c.u = c.window[0] + ((c.u - c.window[0]) % span);
    }
    evalActivity(c.u, c.act);
    if (phaseEl.current !== null) {
      const p = phaseAt(c.u);
      phaseEl.current.textContent = `${p.label} — ${p.real}`;
    }
  }, -1);
  return null;
}

/* -------------------------------------- the array in the cell -------------------------------------- */

const COLS = 14;
const PITCH = 0.075;
const N_STO = COLS;
const N_ENT = COLS;
const N_MOV = COLS;
const N_RES = 2 * COLS;
const N_ATOMS = N_STO + N_ENT + N_MOV + N_RES;
const I_ENT = N_STO;
const I_MOV = I_ENT + N_ENT;
const I_RES = I_MOV + N_MOV;
const ZONE_Z = { stoA: LINE.shield - 0.06, stoB: LINE.shield + 0.06, ent: LINE.ryd, ro: LINE.read, resA: 0.46, resB: 0.57 } as const;
const LOST = 4;
const REFILL = 9;
const colX = (k: number) => (k - (COLS - 1) / 2) * PITCH;

type ArrayBuf = { pos: Float32Array; col: Float32Array; scl: Float32Array; home: Float32Array; load: Float32Array };

function makeArray(): ArrayBuf {
  const pos = new Float32Array(N_ATOMS * 3);
  const col = new Float32Array(N_ATOMS * 3);
  const scl = new Float32Array(N_ATOMS).fill(0);
  const home = new Float32Array(N_ATOMS * 3);
  const load = new Float32Array(N_ATOMS * 3);
  const c = new THREE.Color();
  const set = (i: number, x: number, z: number, colour: string) => {
    home[i * 3] = x;
    home[i * 3 + 1] = Y;
    home[i * 3 + 2] = z;
    c.set(colour);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  };
  for (let k = 0; k < COLS; k += 1) {
    set(k, colX(k), ZONE_Z.stoA, C.atomStatic);
    set(I_ENT + k, colX(k) - 0.018, ZONE_Z.ent, C.atomStatic);
    set(I_MOV + k, colX(k), ZONE_Z.stoB, C.atomMover);
    set(I_RES + k, colX(k), ZONE_Z.resA, C.atomRes);
    set(I_RES + COLS + k, colX(k), ZONE_Z.resB, C.atomRes);
  }
  // stochastic loading: atoms land on a random subset of a denser grid, then get sorted
  const slots: [number, number][] = [];
  for (let r = 0; r < 8; r += 1) for (let k = 0; k < COLS; k += 1) slots.push([colX(k), -0.5 + r * (1.0 / 7)]);
  let s = 11;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  for (let i = 0; i < N_ATOMS; i += 1) {
    const sl = slots[i]!;
    load[i * 3] = sl[0];
    load[i * 3 + 1] = Y;
    load[i * 3 + 2] = sl[1];
  }
  return { pos, col, scl, home, load };
}

const N_PHOTON = 160;
const PHOTON_SPEED = 1.6;

function ArrayInset({ clock }: { clock: RefObject<Clock> }) {
  const buf = useMemo(makeArray, []);
  const cloudRef = useRef<THREE.Mesh>(null);
  const photonRef = useRef<THREE.Points>(null);
  const photon = useMemo(
    () => ({ pos: new Float32Array(N_PHOTON * 3).fill(-50), dir: new Float32Array(N_PHOTON * 3), age: new Float32Array(N_PHOTON).fill(-1) }),
    [],
  );
  const tmp = useMemo(() => new THREE.Color(), []);
  const ryd = useMemo(() => new THREE.Color(C.rydberg), []);
  // inset-scale beam gains, copied from the activity table each frame
  const rydGain = useRef(0);
  const imgGain = useRef(0);
  const latGain = useRef(0);
  const shieldGain = useRef(0);
  const globalGain = useRef(0);
  const base = useMemo(() => {
    const b = new Float32Array(buf.col.length);
    b.set(buf.col);
    return b;
  }, [buf]);

  useFrame((_, dt) => {
    const c = clock.current;
    if (c === null) return;
    const u = c.u;
    const a = c.act;
    rydGain.current = Math.min(a.ryd420, a.ryd1013);
    imgGain.current = a.imaging;
    latGain.current = a.lattice;
    shieldGain.current = a.shield;
    globalGain.current = Math.min(a.ramanLaser, a.ramanGlobal);

    /* ---- MOT cloud: present while the coils are on, shrinking into the tweezers ---- */
    if (cloudRef.current !== null) {
      const m = cloudRef.current.material as THREE.MeshBasicMaterial;
      const g = a.motCoils * (1 - 0.7 * a.molasses);
      m.opacity = 0.35 * g;
      cloudRef.current.visible = g > 0.01;
      cloudRef.current.scale.setScalar(0.28 + 0.1 * Math.sin(u * 80) - 0.15 * a.molasses);
    }

    /* ---- loading, sorting, and the moving block's zone ---- */
    const loaded = smooth(seg(u, [0.12, 0.15]));
    const sorted = smooth(seg(u, [0.22, 0.28]));
    let zoneA: number = ZONE_Z.stoB;
    let zoneB: number = ZONE_Z.stoB;
    let f = 0;
    if (u >= 0.33 && u < 0.41) {
      zoneA = ZONE_Z.stoB;
      zoneB = ZONE_Z.ent;
      f = smooth(seg(u, [0.33, 0.41]));
    } else if (u >= 0.41 && u < 0.52) {
      zoneA = zoneB = ZONE_Z.ent;
    } else if (u >= 0.52 && u < 0.6) {
      zoneA = ZONE_Z.ent;
      zoneB = ZONE_Z.ro;
      f = smooth(seg(u, [0.52, 0.6]));
    } else if (u >= 0.6 && u < 0.94) {
      zoneA = zoneB = ZONE_Z.ro;
    } else if (u >= 0.94) {
      zoneA = ZONE_Z.ro;
      zoneB = ZONE_Z.stoB;
      f = smooth(seg(u, [0.94, 1.0]));
    }
    const split = u < 0.63 ? 0 : u < 0.78 ? smooth(seg(u, [0.63, 0.67])) : 1 - smooth(seg(u, [0.78, 0.8]));
    const flash = Math.min(a.ryd420, a.ryd1013);

    for (let i = 0; i < N_ATOMS; i += 1) {
      const o = i * 3;
      let hx = buf.home[o] ?? 0;
      let hz = buf.home[o + 2] ?? 0;
      if (i >= I_MOV && i < I_RES) {
        const k = i - I_MOV;
        // fraction of the way into the entangling zone, where movers sit 2 μm from their partner
        const entA = zoneA === ZONE_Z.ent ? 1 : 0;
        const entB = zoneB === ZONE_Z.ent ? 1 : 0;
        const entFrac = entA + (entB - entA) * f;
        hx = colX(k) + 0.018 * entFrac;
        hz = zoneA + (zoneB - zoneA) * f + (zoneA === ZONE_Z.ro && zoneB === ZONE_Z.ro && k % 3 === 0 ? 0.03 * split : 0);
      }
      const lx = buf.load[o] ?? 0;
      const lz = buf.load[o + 2] ?? 0;
      buf.pos[o] = lx + (hx - lx) * sorted;
      buf.pos[o + 1] = Y + (i >= I_MOV && i < I_RES ? 0.012 * Math.sin(Math.PI * f) : 0);
      buf.pos[o + 2] = lz + (hz - lz) * sorted;
      buf.scl[i] = loaded;

      const isEnt = (i >= I_ENT && i < I_MOV) || (i >= I_MOV && i < I_RES && zoneA === ZONE_Z.ent && zoneB === ZONE_Z.ent);
      tmp.setRGB(base[o] ?? 0, base[o + 1] ?? 0, base[o + 2] ?? 0);
      if (isEnt) {
        tmp.lerp(ryd, flash);
        buf.scl[i] = loaded * (1 + 0.8 * flash);
      }
      buf.col[o] = tmp.r;
      buf.col[o + 1] = tmp.g;
      buf.col[o + 2] = tmp.b;
    }

    /* ---- one atom is lost during imaging and refilled from the reservoir ---- */
    const lostScale = u < 0.72 ? 1 : u < 0.74 ? 1 - smooth(seg(u, [0.72, 0.74])) : u < 0.86 ? 0 : 1;
    buf.scl[I_MOV + LOST] = (buf.scl[I_MOV + LOST] ?? 0) * lostScale;
    const rIdx = I_RES + REFILL;
    const rf = smooth(seg(u, [0.8, 0.86]));
    if (u >= 0.8 && u < 0.86) {
      const ro = rIdx * 3;
      const tx = colX(LOST);
      const tz = ZONE_Z.ro;
      buf.pos[ro] = (buf.pos[ro] ?? 0) + (tx - (buf.pos[ro] ?? 0)) * rf;
      buf.pos[ro + 2] = (buf.pos[ro + 2] ?? 0) + (tz - (buf.pos[ro + 2] ?? 0)) * rf;
      buf.pos[ro + 1] = Y + 0.015 * Math.sin(Math.PI * rf);
    } else if (u >= 0.86 && u < 0.94) {
      buf.scl[rIdx] = 0;
    }

    /* ---- fluorescence photons: only the NA cone reaches the objective ---- */
    const imaging = Math.min(a.imaging, a.camera);
    const global = u < 0.25;
    let toSpawn = imaging > 0.05 ? Math.floor(120 * imaging * dt + Math.random()) : 0;
    for (let i = 0; i < N_PHOTON; i += 1) {
      let age = photon.age[i] ?? -1;
      if (age < 0) {
        if (toSpawn > 0) {
          toSpawn -= 1;
          let src: number;
          if (global) src = Math.floor(Math.random() * N_ATOMS);
          else {
            let k = Math.floor(Math.random() * N_MOV);
            if (k % 3 === 0) k = (k + 1) % N_MOV;
            src = I_MOV + k;
          }
          if ((buf.scl[src] ?? 0) < 0.5) continue;
          const so = src * 3;
          const z = 2 * Math.random() - 1;
          const ph = 2 * Math.PI * Math.random();
          const s = Math.sqrt(1 - z * z);
          photon.pos[i * 3] = buf.pos[so] ?? 0;
          photon.pos[i * 3 + 1] = buf.pos[so + 1] ?? 0;
          photon.pos[i * 3 + 2] = buf.pos[so + 2] ?? 0;
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
      if (collected ? py > OBJ_BOTTOM : age > 0.3) {
        photon.age[i] = -1;
        photon.pos[i * 3 + 1] = -50;
        continue;
      }
      photon.age[i] = age;
      photon.pos[i * 3] = (photon.pos[i * 3] ?? 0) + (photon.dir[i * 3] ?? 0) * PHOTON_SPEED * dt;
      photon.pos[i * 3 + 1] = py;
      photon.pos[i * 3 + 2] = (photon.pos[i * 3 + 2] ?? 0) + (photon.dir[i * 3 + 2] ?? 0) * PHOTON_SPEED * dt;
    }
    if (photonRef.current !== null) {
      (photonRef.current.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
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
        uniforms: { uColor: { value: new THREE.Color(C.img780) }, uSize: { value: 0.05 } },
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

  return (
    <group>
      <mesh ref={cloudRef} position={[...CELL]} visible={false}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color={C.mot} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* zone strips, magnified view */}
      {(
        [
          [ZONE_Z.stoA - 0.06, ZONE_Z.stoB + 0.06, C.trap],
          [ZONE_Z.ent - 0.09, ZONE_Z.ent + 0.09, C.rydberg],
          [ZONE_Z.ro - 0.07, ZONE_Z.ro + 0.1, C.img780],
          [ZONE_Z.resA - 0.06, ZONE_Z.resB + 0.06, C.atomRes],
        ] as const
      ).map(([z0, z1, colour]) => (
        <mesh key={z0} position={[0, Y - 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[COLS * PITCH + 0.08, z1 - z0]} />
          <meshBasicMaterial color={colour} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <AtomField positions={buf.pos} colors={buf.col} scales={buf.scl} count={N_ATOMS} radius={0.012} />
      <points ref={photonRef} geometry={photonGeometry} material={photonMaterial} frustumCulled={false} />

      {/* the same beams at inset scale: sheets and tubes over the zones they actually cover */}
      <BeamSheet position={[0, Y + 0.006, ZONE_Z.ent]} width={2 * HALF_CELL} depth={0.2} color={C.blue420} pulseRef={rydGain} k={40} speed={26} opacity={0.5} />
      <BeamSheet position={[0, Y - 0.006, ZONE_Z.ent]} width={2 * HALF_CELL} depth={0.2} color={C.ir1013} pulseRef={rydGain} k={18} speed={-18} opacity={0.35} />
      <BeamSheet position={[0, Y + 0.003, 0]} width={2 * HALF_CELL} depth={1.24} color={C.raman} pulseRef={globalGain} k={12} speed={14} opacity={0.18} />
      <GaussianTube center={[0, Y, ZONE_Z.ro]} length={2 * HALF_CELL} wy={0.08} wz={0.08} color={C.lat795} mode={2} k={70} opacity={0.12} gainRef={latGain} />
      <GaussianTube center={[0, Y, ZONE_Z.ro]} length={2 * HALF_CELL} wy={0.07} wz={0.07} color={C.img780} mode={1} k={30} speed={16} opacity={0.12} gainRef={imgGain} />
      <GaussianTube center={[0, Y, LINE.shield]} length={2 * HALF_CELL} wy={0.13} wz={0.075} color={C.shield} mode={1} k={8} speed={6} opacity={0.07} gainRef={shieldGain} />
    </group>
  );
}

/* --------------------------------------------- scene --------------------------------------------- */

function InstrumentScene({ clock }: { clock: RefObject<Clock> }) {
  const activity = useMemo<ActivityRef>(() => ({ current: clock.current?.act ?? emptyActivity() }), [clock]);

  return (
    <group>
      <hemisphereLight args={['#c9d6e6', '#0a0c10', 0.55]} />
      <directionalLight position={[-6, 9, 4]} intensity={1.2} color="#e8eef8" />
      <directionalLight position={[8, 6, -6]} intensity={0.6} color="#b8c8dc" />
      {/* table */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[21, 15.5]} />
        <meshStandardMaterial color="#0f1216" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[21, 42, '#1c2128', '#151a20']} position={[0, -0.01, 0]} />

      {/* ---------------------------------- vacuum cell, coils, detection column ---------------------------------- */}
      <GlassCell position={CELL} size={[1.3, 1.3, 1.3]} />
      <Callout position={[0.9, Y + 0.85, 0.9]} fixed showWithin={40}>glass vacuum cell</Callout>
      <Coil position={[0, Y + 1.0, 0]} radius={1.45} axis={[0, 1, 0]} id="motCoils" activity={activity} />
      <Coil position={[0, Y - 0.85, 0]} radius={1.45} axis={[0, 1, 0]} id="motCoils" activity={activity} label="MOT coils (anti-Helmholtz)" />
      <Coil position={[-1.7, Y, 0]} radius={2.0} axis={[1, 0, 0]} id="biasCoils" activity={activity} tube={0.035} />
      <Coil position={[1.7, Y, 0]} radius={2.0} axis={[1, 0, 0]} id="biasCoils" activity={activity} tube={0.035} label={`bias field coils · ≤ ${PAPER.cooling.bFieldG} G`} />

      {/* objective */}
      <group position={[0, (OBJ_BOTTOM + OBJ_TOP) / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.3, OBJ_TOP - OBJ_BOTTOM, 40]} />
          <meshStandardMaterial color="#1b2430" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, -(OBJ_TOP - OBJ_BOTTOM) / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.28, 32]} />
          <meshStandardMaterial color="#9fd3ff" transparent opacity={0.4} roughness={0.05} />
        </mesh>
        <Callout position={[0.75, 0.05, 0]} fixed showWithin={14}>{`objective · NA ${PAPER.imaging.na}`}</Callout>
      </group>
      <Plate position={RAMAN.dich2} normal={[-1, 1, 0]} color="#7fd6a8" opacity={0.6} size={[0.5, 0.5]} label="dichroic (Raman in)" />
      <Plate position={TRAP.dich1} normal={[1, 1, 0]} color="#f0c070" opacity={0.6} size={[0.5, 0.5]} label="dichroic (852 in, 780 out)" />
      <Lens position={[0, Y_TUBE, 0]} axis={[0, 1, 0]} radius={0.3} />
      <Device position={[0, Y_CAM, 0]} size={[0.7, 0.8, 0.7]} color={C.camera} id="camera" activity={activity} label={PAPER.instruments.camera} glowScale={0.3} />

      {/* light through the objective: trap light down, Raman local down, fluorescence up */}
      <LightCone from={[0, OBJ_BOTTOM, 0]} to={CELL} r0={0.26} r1={0.03} color={C.trap} gate={['trapLaser']} activity={activity} opacity={0.22} />
      <LightCone from={[0, OBJ_BOTTOM, 0]} to={CELL} r0={0.2} r1={0.02} color={C.raman} gate={['ramanLaser', 'ramanAod']} activity={activity} opacity={0.4} />
      <LightCone from={CELL} to={[0, OBJ_BOTTOM, 0]} r0={0.02} r1={0.27} color={C.img780} gate={['imaging', 'camera']} activity={activity} opacity={0.3} />
      <BeamPath points={[[0, OBJ_TOP, 0], [0, Y_TUBE, 0], [0, Y_CAM - 0.4, 0]]} radii={[0.13, 0.13, 0.03]} color={C.img780} gate={['camera']} activity={activity} opacity={0.5} k={20} speed={10} />

      {/* MOT beams (schematic): three counter-propagating pairs */}
      <BeamPath points={[[-3.2, Y, 0], [3.2, Y, 0]]} radius={0.22} color={C.mot} gate={['motBeams']} activity={activity} opacity={0.22} k={6} speed={8} mode={2} />
      <BeamPath points={[[0, Y, -3.2], [0, Y, 3.2]]} radius={0.22} color={C.mot} gate={['motBeams']} activity={activity} opacity={0.22} k={6} speed={8} mode={2} />
      <BeamPath points={[[-2.3, Y, 2.3], [2.3, Y, -2.3]]} radius={0.22} color={C.mot} gate={['motBeams']} activity={activity} opacity={0.22} k={6} speed={8} mode={2} />
      <BeamPath points={[[-2.3, Y, -2.3], [2.3, Y, 2.3]]} radius={0.22} color={C.molasses} gate={['molasses']} activity={activity} opacity={0.2} k={6} speed={8} mode={2} />

      {/* ---------------------------------- trap train ---------------------------------- */}
      <Device position={TRAP.laser} size={[1.0, 0.5, 0.6]} color={C.trap} id="trapLaser" activity={activity} label={`${PAPER.slm.wavelengthNm} nm trap laser`} />
      <Indicator position={[TRAP.laser[0] + 0.5, Y, TRAP.laser[2]]} color={C.trap} id="trapLaser" activity={activity} />
      <Cube position={TRAP.pbs1} label="PBS" />
      <AODCrystal position={TRAP.aod1} beamAxis={[1, 0, 0]} id="aod" activity={activity} color={C.aod} />
      <AODCrystal position={TRAP.aod2} beamAxis={[1, 0, 0]} roll={Math.PI / 2} id="aod" activity={activity} color={C.aod} label={`crossed AODs · ${PAPER.instruments.aod}`} />
      <Lens position={TRAP.lensA} axis={[1, 0, 0]} />
      <Cube position={TRAP.pbs2} label="PBS (combine)" />
      <Lens position={TRAP.lensB} axis={[1, 0, 0]} />
      <Plate position={TRAP.peri0} normal={[1, -1, 0]} />
      <Plate position={TRAP.peri1} normal={[0, 1, -1]} label="periscope" />
      <Plate position={TRAP.turn} normal={[-1, 0, 1]} />
      <Plate position={TRAP.m1} normal={[-1, 0, -1]} />
      <SLMPanel position={TRAP.slm} normal={[-1, 0, 1]} id="slm" activity={activity} label={`SLM hologram · ${PAPER.instruments.slm}`} />
      <Lens position={TRAP.lensS} axis={[0, 0, 1]} />
      <BeamPath points={[[TRAP.laser[0] + 0.5, Y, -3], TRAP.pbs1]} color={C.trap} gate={['trapLaser']} activity={activity} />
      <BeamPath points={[TRAP.pbs1, TRAP.aod1, TRAP.aod2, TRAP.lensA, TRAP.pbs2]} color={C.aod} gate={['trapLaser', 'aod']} activity={activity} />
      <BeamPath points={[TRAP.pbs1, TRAP.m1, TRAP.slm, TRAP.lensS, TRAP.pbs2]} radii={[0.045, 0.045, 0.12, 0.09, 0.05]} color={C.trap} gate={['trapLaser', 'slm']} activity={activity} />
      <BeamPath points={[TRAP.pbs2, TRAP.lensB, TRAP.peri0, TRAP.peri1, TRAP.turn, TRAP.dich1, [0, OBJ_TOP, 0]]} color={C.trap} gate={['trapLaser']} activity={activity} radius={0.05} />

      {/* ---------------------------------- Raman train ---------------------------------- */}
      <Device position={RAMAN.laser} size={[1.0, 0.5, 0.6]} color={C.raman} id="ramanLaser" activity={activity} label={`Raman laser · Δ = ${PAPER.raman.intermediateDetuningGHz} GHz`} />
      <Indicator position={[RAMAN.laser[0] - 0.5, Y, RAMAN.laser[2]]} color={C.raman} id="ramanLaser" activity={activity} />
      <Device position={RAMAN.iq} size={[0.6, 0.4, 0.5]} color={C.micro} id="microwave" activity={activity} label={`IQ modulator ← ${PAPER.qubit.hyperfineGHz} GHz`} glowScale={0.6} />
      <Cube position={RAMAN.pbs} label="PBS (global | local)" />
      <AODCrystal position={RAMAN.aod1} beamAxis={[-1, 0, 0]} id="ramanAod" activity={activity} color={C.raman} />
      <AODCrystal position={RAMAN.aod2} beamAxis={[-1, 0, 0]} roll={Math.PI / 2} id="ramanAod" activity={activity} color={C.raman} label="Raman AODs (local addressing)" />
      <Lens position={RAMAN.lens} axis={[1, 0, 0]} />
      <Plate position={RAMAN.peri0} normal={[-1, -1, 0]} />
      <Plate position={RAMAN.peri1} normal={[0, 1, 1]} />
      <Plate position={RAMAN.comp} normal={[0, -0.4, 1]} color="#7fd6a8" opacity={0.55} size={[0.4, 0.4]} label="compensating dichroic + λ/2" />
      <Plate position={RAMAN.turn} normal={[1, 0, -1]} />
      <Plate position={RAMAN.gMirror} normal={[0.957, 0, -0.71]} />
      <Lens position={RAMAN.gLens} axis={[-0.957, 0, -0.29]} radius={0.36} />
      <BeamPath points={[[RAMAN.laser[0] - 0.5, Y, 3.2], RAMAN.iq, RAMAN.pbs]} color={C.raman} gate={['ramanLaser']} activity={activity} />
      <BeamPath points={[RAMAN.pbs, RAMAN.aod1, RAMAN.aod2, RAMAN.lens, RAMAN.peri0, RAMAN.peri1, RAMAN.comp, RAMAN.turn, RAMAN.dich2, [0, OBJ_TOP, 0]]} color={C.raman} gate={['ramanLaser', 'ramanAod']} activity={activity} />
      <BeamPath points={[RAMAN.pbs, RAMAN.gMirror, RAMAN.gLens, RAMAN.gEnd]} radii={[0.045, 0.045, 0.045, 0.3]} color={C.raman} gate={['ramanLaser', 'ramanGlobal']} activity={activity} opacity={0.6} k={8} />
      <Callout position={[RAMAN.gLens[0] - 1.2, Y + 0.5, RAMAN.gLens[2] - 0.4]} fixed small showWithin={14}>{`global Raman · Ω ≈ 2π × ${PAPER.raman.globalRabiMHz} MHz`}</Callout>

      {/* ---------------------------------- Rydberg trains ---------------------------------- */}
      <Device position={RYD.laser420} size={[1.0, 0.5, 0.6]} color={C.blue420} id="ryd420" activity={activity} label={`${PAPER.rydberg.blueNm} nm Rydberg laser`} />
      <Indicator position={[RYD.laser420[0] + 0.5, Y, RYD.z]} color={C.blue420} id="ryd420" activity={activity} />
      <Device position={RYD.aom420} size={[0.45, 0.35, 0.35]} color={C.rack} id="awgRydberg" activity={activity} label="AOM" labelOffset={[0, 0.2, 0]} />
      <Device position={RYD.shaper420} size={[0.5, 0.5, 0.5]} color={C.blue420} id="ryd420" activity={activity} label="top-hat shaper" glowScale={0.4} />
      <Lens position={RYD.lens420} axis={[1, 0, 0]} radius={0.34} />
      <Device position={RYD.laser1013} size={[1.0, 0.5, 0.6]} color={C.ir1013} id="ryd1013" activity={activity} label={`${PAPER.rydberg.irNm} nm Rydberg laser`} />
      <Indicator position={[RYD.laser1013[0] - 0.5, Y, RYD.z]} color={C.ir1013} id="ryd1013" activity={activity} />
      <Device position={RYD.aom1013} size={[0.45, 0.35, 0.35]} color={C.rack} id="awgRydberg" activity={activity} label="AOM" labelOffset={[0, 0.2, 0]} />
      <Device position={RYD.shaper1013} size={[0.5, 0.5, 0.5]} color={C.ir1013} id="ryd1013" activity={activity} label="top-hat shaper" glowScale={0.4} />
      <Lens position={RYD.lens1013} axis={[1, 0, 0]} radius={0.34} />
      <BeamPath points={[[RYD.laser420[0] + 0.5, Y, RYD.z], RYD.aom420, RYD.shaper420, RYD.lens420, [-HALF_CELL, Y, RYD.z]]} radii={[0.035, 0.035, 0.1, 0.1, 0.1]} color={C.blue420} gate={['ryd420']} activity={activity} k={16} speed={26} />
      <BeamPath points={[[RYD.laser1013[0] - 0.5, Y, RYD.z], RYD.aom1013, RYD.shaper1013, RYD.lens1013, [HALF_CELL, Y, RYD.z]]} radii={[0.035, 0.035, 0.1, 0.1, 0.1]} color={C.ir1013} gate={['ryd1013']} activity={activity} k={7} speed={-18} opacity={0.6} />

      {/* ---------------------------------- readout: lattice + imaging on one line ---------------------------------- */}
      <Device position={READ.latLaser} size={[1.0, 0.5, 0.6]} color={C.lat795} id="lattice" activity={activity} label={PAPER.instruments.latticeLaser} />
      <Indicator position={[READ.latLaser[0] - 0.5, Y, READ.latLaser[2]]} color={C.lat795} id="lattice" activity={activity} />
      <Device position={READ.imgLaser} size={[1.0, 0.5, 0.6]} color={C.img780} id="imaging" activity={activity} label={`${PAPER.cooling.wavelengthNm} nm imaging · PGC / EIT cooling · pump`} />
      <Indicator position={[READ.imgLaser[0] - 0.5, Y, READ.imgLaser[2]]} color={C.img780} id="imaging" activity={activity} />
      <Plate position={READ.latM1} normal={[-1, 0, 1]} />
      <Plate position={READ.latM2} normal={[1, 0, -1]} />
      <Plate position={READ.imgM1} normal={[-1, 0, 1]} />
      <Plate position={READ.dich} normal={[1, 0, -1]} color="#ff9ab8" opacity={0.6} label="dichroic (780 + 795)" />
      <Lens position={READ.lens} axis={[1, 0, 0]} />
      <Plate position={READ.qwp} normal={[1, 0, 0]} color="#c9a0ff" opacity={0.6} size={[0.36, 0.36]} thickness={0.02} label="λ/4" />
      <Plate position={READ.retro} normal={[1, 0, 0]} label="retro mirror (σ⁺ / σ⁻ pair)" />
      <BeamPath points={[[READ.latLaser[0] - 0.5, Y, READ.latLaser[2]], READ.latM1, READ.latM2, READ.dich, READ.lens, READ.cellIn]} radii={[0.035, 0.035, 0.035, 0.035, 0.035, 0.08]} color={C.lat795} gate={['lattice']} activity={activity} mode={2} k={30} />
      <BeamPath points={[READ.cellOut, READ.qwp, READ.retro]} radius={0.08} color={C.lat795} gate={['lattice']} activity={activity} mode={2} k={30} />
      <BeamPath points={[[READ.imgLaser[0] - 0.5, Y, READ.imgLaser[2]], READ.imgM1, READ.dich, READ.lens, READ.cellIn]} radii={[0.045, 0.045, 0.045, 0.045, 0.1]} color={C.img780} gate={['imaging']} activity={activity} k={10} speed={14} opacity={0.5} />
      <BeamPath points={[READ.cellOut, READ.qwp, READ.retro]} radius={0.1} color={C.img780} gate={['imaging']} activity={activity} k={10} speed={14} opacity={0.5} />

      {/* ---------------------------------- shield ---------------------------------- */}
      <Device position={SHIELD.laser} size={[1.0, 0.5, 0.6]} color={C.shield} id="shield" activity={activity} label={PAPER.instruments.shieldLaser} />
      <Indicator position={[SHIELD.laser[0] + 0.5, Y, SHIELD.laser[2]]} color={C.shield} id="shield" activity={activity} />
      <Lens position={SHIELD.lens1} axis={[1, 0, 0]} />
      <Plate position={[SHIELD.knife[0], Y, SHIELD.knife[2] - 0.16]} normal={[1, 0, 0]} size={[0.22, 0.45]} color="#333a44" label="knife-edge (cuts the tail)" />
      <Lens position={SHIELD.lens2} axis={[1, 0, 0]} />
      <BeamPath points={[[SHIELD.laser[0] + 0.5, Y, SHIELD.laser[2]], SHIELD.lens1, SHIELD.knife, SHIELD.lens2, SHIELD.cellIn]} radii={[0.035, 0.035, 0.09, 0.09, 0.07]} color={C.shield} gate={['shield']} activity={activity} k={5} speed={8} />
      <BeamPath points={[SHIELD.cellOut, SHIELD.dump]} radius={0.08} color={C.shield} gate={['shield']} activity={activity} k={5} speed={8} opacity={0.4} />
      <Device position={SHIELD.dump} size={[0.25, 0.4, 0.3]} color="#333a44" activity={activity} label="beam dump" labelWithin={10} />

      {/* ---------------------------------- control rack ---------------------------------- */}
      <Device position={RACK.awg} size={[1.1, 2.3, 0.9]} color={C.rack} activity={activity} label={PAPER.instruments.awg} hollow />
      {RACK.slots.map((id, i) => (
        <Device key={id} position={[RACK.awg[0], RACK.slotY[i]!, RACK.awg[2]]} size={[1.0, 0.3, 0.8]} color={C.rack} id={id} activity={activity} />
      ))}
      {RACK.slots.map((id, i) => (
        <Callout key={`${id}-l`} position={[RACK.awg[0] - 0.1, RACK.slotY[i]!, RACK.awg[2] + 1.15]} fixed small showWithin={12}>
          {RACK.slotLabels[i]!}
        </Callout>
      ))}
      <Device position={RACK.micro} size={[1.0, 0.5, 0.6]} color={C.micro} id="microwave" activity={activity} label={PAPER.instruments.microwave} glowScale={0.5} />
      <Device position={RACK.computer} size={[0.8, 0.7, 0.6]} color={C.camera} id="computer" activity={activity} label="desktop: images → rearrangement · decoding" glowScale={0.3} />

      {/* cables: rack → modulators, camera → desktop → rearrangement AWG */}
      {(() => {
        const ax = RACK.awg[0] - 0.55;
        const az = RACK.awg[2];
        const y = (i: number) => RACK.slotY[i]!;
        return (
          <>
            <Cable id="awgRearr" activity={activity} points={[[ax, y(0), az], [ax - 0.4, 0.06, az - 0.5], [-4.6, 0.06, -4.3], [TRAP.aod2[0], 0.3, TRAP.aod2[2]]]} />
            <Cable id="awgMove" activity={activity} points={[[ax, y(1), az], [ax - 0.4, 0.06, az - 0.7], [-5.4, 0.06, -4.5], [TRAP.aod1[0], 0.3, TRAP.aod1[2]]]} />
            <Cable id="awgRydberg" activity={activity} points={[[ax, y(2), az], [7.3, 0.06, az + 1.0], [RYD.aom1013[0], 0.3, RYD.aom1013[2]]]} />
            <Cable id="awgRydberg" activity={activity} points={[[ax, y(2), az], [7.0, 0.06, az - 0.9], [-3.0, 0.06, -6.4], [-8.4, 0.06, -1.6], [RYD.aom420[0], 0.3, RYD.aom420[2]]]} />
            <Cable id="awgRaman" activity={activity} points={[[ax, y(3), az], [8.2, 0.06, az - 0.6], [RACK.micro[0] - 0.3, 0.3, RACK.micro[2] + 0.3]]} />
            <Cable id="microwave" activity={activity} points={[[RACK.micro[0] + 0.5, Y, RACK.micro[2]], [9.6, 0.06, -3.0], [9.6, 0.06, 2.9], [RAMAN.iq[0], 0.3, RAMAN.iq[2]]]} />
            <Cable id="awgRamanAod" activity={activity} points={[[ax, y(4), az], [6.6, 0.06, -1.6], [4.4, 0.06, 2.7], [RAMAN.aod1[0], 0.3, RAMAN.aod1[2]]]} />
            <Cable id="camera" activity={activity} points={[[0.35, Y_CAM, 0], [1.6, Y_CAM - 0.3, -1.2], [7.4, 0.9, -1.4], [RACK.computer[0] - 0.4, 0.8, RACK.computer[2]]]} />
            <Cable id="computer" activity={activity} points={[[RACK.computer[0], 0.85, RACK.computer[2]], [RACK.awg[0], 2.3, RACK.awg[2] + 0.9], [RACK.awg[0], y(0), RACK.awg[2] + 0.45]]} />
          </>
        );
      })()}

      {/* the atoms */}
      <ArrayInset clock={clock} />
      <Callout position={[-0.9, Y + 0.3, -0.7]} fixed small showWithin={9}>{`array (magnified; see Fig. 1)`}</Callout>
    </group>
  );
}

/* ------------------------------------------ rack timeline ------------------------------------------ */

const ROWS: readonly { name: string; ids: readonly Instrument[]; color: string }[] = [
  { name: 'Rearrangement AWG', ids: ['awgRearr'], color: C.rack },
  { name: 'Moving AOD AWG', ids: ['awgMove'], color: C.rack },
  { name: 'Rydberg AWG', ids: ['awgRydberg'], color: C.rack },
  { name: 'Raman AWG · 6.8 GHz', ids: ['awgRaman', 'microwave'], color: C.rack },
  { name: 'Raman AOD AWG', ids: ['awgRamanAod'], color: C.rack },
  { name: '852 nm traps: SLM / AODs', ids: ['slm', 'aod'], color: C.trap },
  { name: 'Raman light', ids: ['ramanGlobal', 'ramanAod'], color: C.raman },
  { name: '420 + 1013 nm', ids: ['ryd420', 'ryd1013'], color: C.blue420 },
  { name: '795 lattice', ids: ['lattice'], color: C.lat795 },
  { name: '780 imaging / cooling', ids: ['imaging', 'motBeams'], color: C.img780 },
  { name: '1529 shield', ids: ['shield'], color: C.shield },
  { name: 'MOT + bias coils', ids: ['motCoils', 'biasCoils'], color: C.coil },
  { name: 'camera → desktop', ids: ['camera', 'computer'], color: C.camera },
];

const TL_ROW = 16;
const TL_TOP = 30;
const TL_LEFT = 170;
const TL_H = TL_TOP + ROWS.length * TL_ROW + 14;

function RackTimeline({ clock, onScrub }: { clock: RefObject<Clock>; onScrub: (u: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const widthRef = useRef(900);
  useRaf(() => {
    const canvas = ref.current;
    const c = clock.current;
    if (canvas === null || c === null) return;
    const TL_W = Math.max(480, Math.floor(wrap.current?.clientWidth ?? 900));
    widthRef.current = TL_W;
    const ctx = sizeCanvas(canvas, TL_W, TL_H);
    clear(ctx, TL_W, TL_H);
    const width = TL_W - TL_LEFT - 12;
    const x = (u: number) => TL_LEFT + u * width;
    ctx.font = '10.5px "IBM Plex Mono", monospace';
    // phase bands
    PHASES.forEach((p, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#14171b' : '#101317';
      ctx.fillRect(x(p.window[0]), TL_TOP - 4, x(p.window[1]) - x(p.window[0]), ROWS.length * TL_ROW + 4);
    });
    // tour window
    ctx.fillStyle = 'rgba(232, 228, 220, 0.05)';
    ctx.fillRect(x(c.window[0]), TL_TOP - 4, x(c.window[1]) - x(c.window[0]), ROWS.length * TL_ROW + 4);
    ROWS.forEach((row, i) => {
      const y = TL_TOP + i * TL_ROW;
      ctx.fillStyle = '#c9b896';
      ctx.fillText(row.name, 8, y + 11);
      for (const e of EVENTS) {
        if (!row.ids.includes(e.inst)) continue;
        ctx.fillStyle = row.color;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x(e.window[0]), y + 3, Math.max(2, x(e.window[1]) - x(e.window[0])), TL_ROW - 6);
        ctx.globalAlpha = 1;
      }
      // live activity dot
      let a = 0;
      for (const id of row.ids) a = Math.max(a, c.act[id]);
      if (a > 0.05) {
        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.arc(TL_LEFT - 8, y + TL_ROW / 2, 2 + 2 * a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // playhead
    const px = x(c.u);
    ctx.strokeStyle = '#a51c30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, TL_TOP - 10);
    ctx.lineTo(px, TL_TOP + ROWS.length * TL_ROW + 2);
    ctx.stroke();
    ctx.fillStyle = '#e8e4dc';
    ctx.font = '11px "IBM Plex Mono", monospace';
    const p = phaseAt(c.u);
    ctx.fillText(p.label, TL_LEFT, 14);
    ctx.fillStyle = '#7d8b99';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(c.playing ? 'click the timeline to scrub · space to play/pause' : 'paused · click to scrub · space to play', 8, TL_H - 3);
  });
  return (
    <div ref={wrap} className="rack-strip">
      <canvas
        ref={ref}
        className="rack-timeline"
        height={TL_H}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - r.left;
          const u = Math.min(1, Math.max(0, (px - TL_LEFT) / (widthRef.current - TL_LEFT - 12)));
          onScrub(u);
        }}
      />
    </div>
  );
}

/* --------------------------------------------- figure --------------------------------------------- */

export function Instrument3D() {
  const [step, setStep] = useState(0);
  const tour = TOUR[step] ?? TOUR[0]!;
  const phaseEl = useRef<HTMLSpanElement | null>(null);
  const clock = useRef<Clock>({ u: 0, playing: true, window: [0, 1], act: emptyActivity() });
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const c = clock.current;
    c.window = tour.window;
    c.u = tour.window[0];
    c.playing = true;
    setPlaying(true);
  }, [tour]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || (e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      const c = clock.current;
      c.playing = !c.playing;
      setPlaying(c.playing);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scrub = (u: number) => {
    const c = clock.current;
    c.window = [0, 1];
    c.u = u;
    c.playing = false;
    setPlaying(false);
  };
  const togglePlay = () => {
    const c = clock.current;
    c.playing = !c.playing;
    setPlaying(c.playing);
  };

  const steps: readonly StepDef[] = [
    {
      label: TOUR[0]!.label,
      text: (
        <>
          Every instrument the paper names, on one table, running one layer of a computation. The glass
          cell in the middle holds the atoms; above it the NA {PAPER.imaging.na} objective and the CMOS
          camera. Six laser systems feed the cell: {PAPER.slm.wavelengthNm} nm trap light through the
          SLM and the crossed AODs (back left), the Raman light for single-qubit gates (front right),{' '}
          {PAPER.rydberg.blueNm} and {PAPER.rydberg.irNm} nm Rydberg light from either side, the{' '}
          {PAPER.lattice.wavelengthNm} nm lattice and {PAPER.cooling.wavelengthNm} nm imaging light (back
          right), and the {PAPER.shield.operateNm} nm shield (front left). The rack on the far right is
          the {PAPER.control.awgs} arbitrary-waveform generators and the microwave source that play the
          whole thing. A box glows when it fires; light is drawn only while its whole chain is on. The
          layout is a schematic reconstruction — the component list and wavelengths are the
          paper&rsquo;s, the positions on the table are not.
        </>
      ),
    },
    {
      label: TOUR[1]!.label,
      text: (
        <>
          One {PAPER.slm.wavelengthNm} nm laser makes every trap. A polarizing beam-splitter divides
          it: one arm reflects off the spatial light modulator ({PAPER.instruments.slm}), a liquid-crystal
          panel whose pixel-by-pixel phase pattern is the hologram that becomes the static array — the
          paper calls this printing a new chip each time the layout changes. The other arm passes
          through a pair of crossed acousto-optic deflectors ({PAPER.instruments.aod}): radio-frequency
          tones in a crystal make a travelling sound grating, each tone one steerable beam. The arms
          recombine, ride the periscope up, reflect off a dichroic and go down through the objective,
          which focuses each beam to a ~1 μm spot. The SLM light is on for the whole run; the AOD light
          only when the rearrangement or moving AWG is playing.
        </>
      ),
    },
    {
      label: TOUR[2]!.label,
      text: (
        <>
          A run starts with a magneto-optical trap: the anti-Helmholtz coils and six {PAPER.cooling.wavelengthNm}{' '}
          nm beams gather millions of rubidium atoms into a cloud in the cell. {PAPER.instruments.molasses}{' '}
          then cools them into the tweezers, and about {PAPER.loadingPct}% of the sites catch one atom. The
          camera takes a global picture through the objective: fluorescence climbs the detection column,
          passes the two dichroics that admit the trap and Raman light, and reaches the{' '}
          {PAPER.instruments.camera}. The desktop reads which sites are filled and streams move waveforms
          to the Rearrangement AWG in FIFO mode; the AODs then drag atoms into a defect-free array. Only
          now do the bias coils switch on a finite field and the qubits get pumped into the m_F = 0
          clock states.
        </>
      ),
    },
    {
      label: TOUR[3]!.label,
      text: (
        <>
          Single-qubit rotations are two-photon Raman transitions: the {PAPER.instruments.microwave}{' '}
          source drives an IQ modulator that puts the {PAPER.qubit.hyperfineGHz} GHz hyperfine splitting
          onto the Raman laser, {PAPER.raman.intermediateDetuningGHz} GHz from the intermediate state so
          scattering is {PAPER.raman.scatteringPerPulse.toExponential(0)} per pulse. A PBS splits the light.
          The <em>global</em> arm fans out to cover the whole array (Ω ≈ 2π × {PAPER.raman.globalRabiMHz} MHz,
          ~{PAPER.raman.compositeUs} μs composite pulses) — the dynamical-decoupling π pulse that fires
          during every move. The <em>local</em> arm goes through a second pair of AODs, whose tone grid
          picks rows and columns, up the periscope, past a compensating dichroic and half-wave plate that
          keep the polarization circular, and in through the objective to the chosen atoms for
          direct X(θ) rotations at {PAPER.raman.localFidelityPct}% fidelity.
        </>
      ),
    },
    {
      label: TOUR[4]!.label,
      text: (
        <>
          The gate is a flash from both sides at once. The Rydberg AWG opens two acousto-optic
          modulators for {PAPER.rydberg.gateNs} ns: {PAPER.rydberg.blueNm} nm from the left,{' '}
          {PAPER.rydberg.irNm} nm from the right, each passed through a top-hat shaper so the sheet is
          flat to ~{PAPER.surface.homogeneityPct}% over {PAPER.beams.rydbergTophatUm} μm of the
          entangling zone. The blue is detuned {PAPER.rydberg.intermediateDetuningGHz} GHz from 5P and the
          two together drive atoms to n = {PAPER.rydberg.n}, where blockade turns the pair into a CZ
          with a single time-optimal pulse at {PAPER.rydberg.czFidelityPct}% fidelity. Every gate site in
          the zone sees the same light — that is the parallelism. The storage zone sits{' '}
          {PAPER.deep.storageSepUm} μm away, past the tails. Optional per-site detunings from an SLM
          in the Rydberg path (not drawn) can switch individual sites off.
        </>
      ),
    },
    {
      label: TOUR[5]!.label,
      text: (
        <>
          Reading a qubit without losing the atom takes three lasers on one line. First the{' '}
          {PAPER.instruments.latticeLaser}, {PAPER.lattice.d1BlueGHz} GHz blue of D1, retro-reflected
          through a quarter-wave plate to form a σ⁻ standing wave: one clock state is pinned by a ~
          {PAPER.lattice.brightShiftMHz} MHz lightshift, the other is dark to it. A {PAPER.lattice.pumpNm}{' '}
          nm pump co-propagating with one lattice port sorts the populations first. Then the AODs drag
          the dark atoms {PAPER.lattice.splitUm} μm sideways in {PAPER.lattice.splitUs} μs. Finally the{' '}
          {PAPER.cooling.wavelengthNm} nm imaging beams — counter-propagating σ⁺/σ⁻, detuned from each
          other by twice the Zeeman splitting so polarization-gradient cooling works in the finite
          field — light the readout zone; photons inside the NA cone climb to the camera. Position now
          encodes spin: {PAPER.lattice.bitFlipPct}% bit-flip, {PAPER.lattice.lossPct}% loss. The same beams
          re-tuned ~{PAPER.cooling.eitBlueMHz} MHz blue of F=2→F′=2 then EIT-cool the atoms for reuse.
        </>
      ),
    },
    {
      label: TOUR[6]!.label,
      text: (
        <>
          While the readout zone is lit, qubits {PAPER.deep.storageSepUm} μm away in storage must not
          scatter a photon. The {PAPER.instruments.shieldLaser} sends ~{PAPER.shield.powerW} W at{' '}
          {PAPER.shield.operateNm} nm through a 4f relay with a knife-edge about four waists off centre
          that cuts the Gaussian tail, then onto the storage zone as a {PAPER.shield.waistUm} μm
          ellipse. It couples 5P₃/₂ to 4D₅/₂ and shifts the excited state ~{PAPER.shield.lightshiftGHz}{' '}
          GHz, so stray imaging light finds nothing resonant there, while the ground-state qubit sees
          ~2 × 10⁻⁵ of that shift. The paper found performance sensitive to this beam&rsquo;s profile:
          it must cover storage evenly and reach the readout zone not at all.
        </>
      ),
    },
    {
      label: TOUR[7]!.label,
      text: (
        <>
          Nothing here is a CPU. The program is a set of voltage waveforms: the {PAPER.instruments.awg} share
          one clock to &lt;{PAPER.control.jitterNs} ns. The Moving AWG&rsquo;s two channels are the x
          and y tone combs on the trap AODs; the Rearrangement AWG does the same in FIFO mode from live
          camera data; the Rydberg AWG shapes the {PAPER.rydberg.gateNs} ns CZ envelopes and any local
          detunings; the Raman AWG&rsquo;s four channels are I and Q for the {PAPER.qubit.hyperfineGHz} GHz
          source (the phase reference for every qubit) plus global and local pulse shapes; the Raman
          AOD AWG writes the light grid for local gates. For deep circuits Moving, Rydberg and Raman-AOD
          loop one memory segment per layer, but the Raman IQ waveform must stay phase-continuous and is
          stored whole — filling the AWG memory is what capped the experiment at {PAPER.deep.layers}{' '}
          layers, {PAPER.deep.circuitS} s. Watch the pulses run down the cables as each instrument fires.
        </>
      ),
    },
    {
      label: TOUR[8]!.label,
      text: (
        <>
          Inside the cell, greatly magnified (the real array is {PAPER.deep.horizontalUm} μm across — a
          grain of sand). The layer runs: a block of cyan AOD atoms leaves storage, pairs up at the gate
          sites, turns violet for the {PAPER.rydberg.gateNs} ns flash, moves to the readout zone where the
          lattice splits the two spin states apart, fluoresces under the imaging beams while storage is
          shielded, loses an atom, is refilled from the grey reservoir, and returns for the next layer.
          Fig. 1 draws this same cycle at true scale with every beam envelope. Here the point is the
          other direction: every one of those micrometre-scale events is a box on this table switching on.
        </>
      ),
    },
  ];

  return (
    <div className="board">
      <Steps steps={steps} current={step} onStep={setStep} />
      <div className="board-breakout">
      <Figure
        n="8"
        title="The whole instrument, running one layer"
        caption={
          <>
            Hardware, wavelengths, detunings, durations and fidelities are the paper&rsquo;s (Methods:
            system overview; spin-to-position conversion; 1D imaging and cooling; the 1,529 nm shielding
            beam; local single-qubit gate details; Extended Data Fig. 1b for the AWG roles). The table layout,
            beam routing, component sizes and the pacing of the animation are a schematic reconstruction;
            the paper&rsquo;s Extended Data Fig. 1a shows the real layout. Colours are display conventions.
            Orbit freely; each step re-aims the camera and loops the relevant part of the run.
          </>
        }
      >
        <Panel tag="a" title="Six laser systems, two AOD pairs, an SLM, coils, camera, and the rack that plays them" wide>
          <Stage3D
            tall
            rig={tour.rig}
            autoRotate={false}
            minDistance={tour.minDistance ?? 1.5}
            maxDistance={42}
            fogRange={[48, 95]}
            overlay={
              <div className="stage-phase">
                <span ref={phaseEl} />
              </div>
            }
          >
            <ClockDriver clock={clock} phaseEl={phaseEl} />
            <InstrumentScene clock={clock} />
          </Stage3D>
          <div className="rack-row">
            <button type="button" className="rack-play" onClick={togglePlay}>
              {playing ? 'pause' : 'play'}
            </button>
            <RackTimeline clock={clock} onScrub={scrub} />
          </div>
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
    </div>
  );
}
