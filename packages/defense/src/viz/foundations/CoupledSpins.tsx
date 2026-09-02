import { type RefObject, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Figure, Panel } from '../../components/Figure.tsx';
import { Steps, type StepDef } from '../../components/Steps.tsx';
import { PAPER } from '../../data/paper.ts';
import {
  breitRabiHz,
  clockShiftHz,
  coneAngleRad,
  couplingAngleRad,
  electronToNuclearMomentRatio,
  groundHyperfineHz,
  larmorHz,
  linearZeemanHzPerG,
  RB87_HFS,
} from '../../physics/hyperfine.ts';
import { AtomCloud } from '../../viz3d/AtomCloud.tsx';
import { Callout } from '../../viz3d/Callout.tsx';
import { Stage3D, type CameraRig } from '../../viz3d/Stage3D.tsx';
import { worldScale } from '../../physics/orbitals.ts';

type Phase = 'apart' | 'coupled' | 'field';

const I_SPIN = RB87_HFS.I;
const J_SPIN = 0.5;
const LEN_I = Math.sqrt(I_SPIN * (I_SPIN + 1));
const LEN_J = Math.sqrt(J_SPIN * (J_SPIN + 1));
const SCALE = 0.95;

const AMBER = '#d4a24a';
const BLUE = '#6ea8d4';
const CREAM = '#e8e4dc';
const GREEN = '#7fbf7f';

const RIGS: readonly CameraRig[] = [
  { position: [0.4, 1.0, 5.8], target: [0, 0.2, 0] },
  { position: [1.4, 1.4, 5.6], target: [0, 0.3, 0] },
  { position: [1.4, 1.4, 5.6], target: [0, 0.2, 0] },
  { position: [3.8, 2.2, 5.2], target: [0, 0.7, 0] },
  { position: [3.8, 1.8, 5.2], target: [0, 0.4, 0] },
];

export function CoupledSpins() {
  const [step, setStep] = useState(0);
  const [mF, setMF] = useState(2);
  const phase: Phase = step === 0 ? 'apart' : step <= 2 ? 'coupled' : 'field';
  const F = step === 2 ? 1 : 2;
  const m = step === 4 ? 0 : Math.min(mF, F);
  const b = PAPER.cooling.bFieldG;
  const ratio = electronToNuclearMomentRatio();
  const eF2 = groundHyperfineHz(2) / 1e9;
  const eF1 = groundHyperfineHz(1) / 1e9;

  const steps: readonly StepDef[] = [
    {
      label: 'two magnets',
      text: (
        <>
          Inside the atom are two spinning charges, and a spinning charge is a magnet. The
          blue arrow is the outer electron&rsquo;s spin, J = ½. The amber arrow is the
          nucleus&rsquo;s spin, I = 3/2 for ⁸⁷Rb — a longer arrow (more angular momentum) but a
          far feebler magnet, about {Math.round(ratio)}× weaker, because the nucleus is
          ~1,700× heavier than the electron. Arrow lengths here are √(s(s+1)), the quantum
          length of a spin.
        </>
      ),
    },
    {
      label: 'they lock together',
      text: (
        <>
          The electron&rsquo;s magnet feels the nucleus&rsquo;s and vice versa, so the two
          spins couple into a total F = I + J and precess around it — the vector model of
          angular momentum. With I and J mostly aligned, F = 2 (|F| = √6). The interaction
          raises this configuration&rsquo;s energy by {eF2.toFixed(3)} GHz × h. In the
          machine this rung is |1⟩.
        </>
      ),
    },
    {
      label: 'the other way',
      text: (
        <>
          Flip the relative orientation and the spins lock into F = 1 (|F| = √2), mostly
          opposed at {((couplingAngleRad(1) * 180) / Math.PI).toFixed(0)}°. This costs{' '}
          {Math.abs(eF1).toFixed(3)} GHz × h <em>less</em>. The gap between the two
          configurations, {(eF2 - eF1).toFixed(3)} GHz, is the hyperfine splitting: the energy
          difference between |0⟩ and |1⟩, and the frequency of the microwave that flips one
          into the other.
        </>
      ),
    },
    {
      label: 'add a field: m_F',
      text: (
        <>
          Switch on a magnetic field B (green, vertical). The total magnet F now precesses
          around the field direction at the Larmor frequency —{' '}
          {(larmorHz(2, b) / 1e6).toFixed(2)} MHz at the paper&rsquo;s {b} G. Only its
          projection along B is fixed, and it is quantised: m<sub>F</sub> = −2 … +2 for F = 2.
          Try the buttons. The energy shift is proportional to that projection, g<sub>F</sub>{' '}
          m<sub>F</sub> μ<sub>B</sub> B: the steeper the cone, the bigger the shift.
        </>
      ),
    },
    {
      label: 'the clock state',
      text: (
        <>
          m<sub>F</sub> = 0: the total magnet lies flat in the plane perpendicular to B, with
          zero projection along it. To first order the field cannot shift its energy at all.
          The same is true of |F=1, m<sub>F</sub>=0⟩, so the frequency between them barely
          notices the field — only a small second-order curvature remains,{' '}
          {(clockShiftHz(b) / 1e3).toFixed(1)} kHz at {b} G. That immunity is why the paper
          stores its bit in this pair and not in any of the six other sublevels.
        </>
      ),
    },
  ];

  const shiftMHz = linearZeemanHzPerG(F, m) * b / 1e6;
  const rig = RIGS[step] ?? RIGS[0]!;

  return (
    <>
      <Steps steps={steps} current={step} onStep={setStep} />
      <Figure
        n="F2"
        title="Two spins, one atom: how F and m_F arise"
        caption={
          <>
            Vector model of the ⁸⁷Rb ground state. Nuclear spin I = 3/2 (amber, length √(15/4))
            and electron spin J = ½ (blue, length √(3/4)) couple to F = I + J (cream). The angle
            between I and J is fixed by F(F+1) = I(I+1) + J(J+1) + 2 I·J:{' '}
            {((couplingAngleRad(2) * 180) / Math.PI).toFixed(1)}° for F = 2,{' '}
            {((couplingAngleRad(1) * 180) / Math.PI).toFixed(1)}° for F = 1; hyperfine energies
            E<sub>F</sub> = (A/2)[F(F+1) − I(I+1) − J(J+1)] with A/h = {(RB87_HFS.groundAHz / 1e9).toFixed(6)}{' '}
            GHz give +{eF2.toFixed(4)} and {eF1.toFixed(4)} GHz. In a field, F precesses about B on
            a cone with cos θ = m<sub>F</sub>/√(F(F+1)) at the Larmor frequency |g<sub>F</sub>| μ<sub>B</sub> B/h.
            Precession rates on screen are slowed enormously and are not to scale relative to
            one another (I·J precession is ~10³× faster than Larmor at this field). The faint
            cloud is the 5s electron density from Fig. 3. Data: Steck; the ~{Math.round(ratio)}×
            moment ratio is |g<sub>J</sub> J| / |g<sub>I</sub> I|.
          </>
        }
      >
        <Panel
          tag="a"
          title={
            phase === 'field'
              ? `F = ${F}, m_F = ${m > 0 ? '+' : ''}${m}, B = ${b} G`
              : phase === 'coupled'
                ? `F = ${F}, no field`
                : 'nuclear spin I and electron spin J'
          }
          wide
        >
          {phase === 'field' && step === 3 ? (
            <div className="mode-row">
              {[-2, -1, 0, 1, 2].map((v) => (
                <button key={v} type="button" className={m === v ? 'active' : undefined} onClick={() => setMF(v)}>
                  m<sub>F</sub> = {v > 0 ? '+' : ''}
                  {v}
                </button>
              ))}
            </div>
          ) : null}
          <Stage3D rig={rig} autoRotate={false} minDistance={3} maxDistance={14} tall>
            <SpinScene phase={phase} F={F} m={m} />
          </Stage3D>
          <p className="board-cap">
            {phase === 'field'
              ? m === 0
                ? `first-order Zeeman shift 0 · second-order clock shift ${(clockShiftHz(b) / 1e3).toFixed(1)} kHz at ${b} G`
                : `first-order Zeeman shift g_F m_F μ_B B = ${shiftMHz >= 0 ? '+' : ''}${shiftMHz.toFixed(2)} MHz at ${b} G · exact Breit–Rabi: ${((breitRabiHz(F, m, b) - groundHyperfineHz(F)) / 1e6).toFixed(3)} MHz`
              : phase === 'coupled'
                ? `E_F = ${(groundHyperfineHz(F) / 1e9).toFixed(4)} GHz × h · I–J angle ${((couplingAngleRad(F) * 180) / Math.PI).toFixed(1)}°`
                : `electron moment / nuclear moment ≈ ${ratio.toFixed(0)}`}
          </p>
        </Panel>
      </Figure>
    </>
  );
}

/* ------------------------------------------------------------------------ 3D */

function Arrow({ color, length, radius = 0.05, groupRef }: { color: string; length: number; radius?: number; groupRef: RefObject<THREE.Group | null> }) {
  const shaft = length - 0.32;
  return (
    <group ref={groupRef}>
      <mesh position={[0, shaft / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shaft, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, shaft + 0.16, 0]}>
        <coneGeometry args={[radius * 2.6, 0.32, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
    </group>
  );
}

const Y = new THREE.Vector3(0, 1, 0);

function SpinScene({ phase, F, m }: { phase: Phase; F: number; m: number }) {
  const iRef = useRef<THREE.Group>(null);
  const jRef = useRef<THREE.Group>(null);
  const fRef = useRef<THREE.Group>(null);
  const fTip = useRef<THREE.Group>(null);
  const iTip = useRef<THREE.Group>(null);
  const jTip = useRef<THREE.Group>(null);
  const dropRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const lenF = Math.sqrt(F * (F + 1));
  const alphaI = Math.acos((lenF * lenF + LEN_I * LEN_I - LEN_J * LEN_J) / (2 * lenF * LEN_I));
  const alphaJ = Math.acos((lenF * lenF + LEN_J * LEN_J - LEN_I * LEN_I) / (2 * lenF * LEN_J));
  const theta = coneAngleRad(F, m);

  useFrame((_, dt) => {
    t.current += dt;
    const tt = t.current;
    // Direction of F.
    let fHat: THREE.Vector3;
    if (phase === 'field') {
      const psi = tt * 0.55;
      fHat = new THREE.Vector3(Math.sin(theta) * Math.cos(psi), Math.cos(theta), Math.sin(theta) * Math.sin(psi));
    } else {
      fHat = new THREE.Vector3(Math.sin(0.42), Math.cos(0.42), 0).normalize();
    }
    // Orthonormal frame around F.
    const e1 = new THREE.Vector3().crossVectors(fHat, Math.abs(fHat.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : Y).normalize();
    const e2 = new THREE.Vector3().crossVectors(fHat, e1).normalize();
    const phi = tt * 1.6;
    const perp = e1.clone().multiplyScalar(Math.cos(phi)).add(e2.clone().multiplyScalar(Math.sin(phi)));

    let iDir: THREE.Vector3;
    let jDir: THREE.Vector3;
    if (phase === 'apart') {
      iDir = new THREE.Vector3(-0.35, 0.9, 0.2).normalize();
      jDir = new THREE.Vector3(0.4, 0.85, -0.3).normalize();
    } else {
      iDir = fHat.clone().multiplyScalar(Math.cos(alphaI)).add(perp.clone().multiplyScalar(Math.sin(alphaI)));
      jDir = fHat.clone().multiplyScalar(Math.cos(alphaJ)).sub(perp.clone().multiplyScalar(Math.sin(alphaJ)));
    }
    const setArrow = (g: THREE.Group | null, dir: THREE.Vector3, origin: THREE.Vector3) => {
      if (g === null) return;
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(Y, dir);
    };
    const O = new THREE.Vector3(0, 0, 0);
    if (phase === 'apart') {
      const iBase = new THREE.Vector3(-1.0, 0.2, 0);
      const jBase = new THREE.Vector3(1.0, 0.2, 0);
      setArrow(iRef.current, iDir, iBase);
      setArrow(jRef.current, jDir, jBase);
      iTip.current?.position.copy(iBase.clone().add(iDir.clone().multiplyScalar(LEN_I * SCALE + 0.3)));
      jTip.current?.position.copy(jBase.clone().add(jDir.clone().multiplyScalar(LEN_J * SCALE + 0.3)));
    } else {
      // Head-to-tail: I from the origin, J from the tip of I, F from the origin to the tip of J.
      const iTipPos = iDir.clone().multiplyScalar(LEN_I * SCALE);
      setArrow(iRef.current, iDir, O);
      setArrow(jRef.current, jDir, iTipPos);
      setArrow(fRef.current, fHat, O);
      iTip.current?.position.copy(iTipPos.clone().multiplyScalar(0.55).add(perp.clone().multiplyScalar(0.35)));
      jTip.current?.position.copy(iTipPos.clone().add(jDir.clone().multiplyScalar(LEN_J * SCALE * 0.6)).add(new THREE.Vector3(0.25, 0.2, 0)));
      const fTipPos = fHat.clone().multiplyScalar(lenF * SCALE);
      fTip.current?.position.copy(fTipPos.clone().add(new THREE.Vector3(0.1, 0.28, 0)));
      // Projection onto the field axis.
      const drop = dropRef.current;
      if (drop !== null) {
        const foot = new THREE.Vector3(0, fTipPos.y, 0);
        const len = Math.max(1e-3, fTipPos.distanceTo(foot));
        drop.position.copy(fTipPos).add(foot).multiplyScalar(0.5);
        drop.scale.set(1, len, 1);
        drop.quaternion.setFromUnitVectors(Y, fTipPos.clone().sub(foot).normalize());
      }
    }
  });

  const fLen = lenF * SCALE;
  const projY = (m / lenF) * fLen;

  return (
    <group position={[0, -0.9, 0]}>
      <AtomCloud n={5} count={6000} opacity={0.4} size={0.04} scale={worldScale(5) * 0.7} />
      <Arrow color={AMBER} length={LEN_I * SCALE} radius={0.055} groupRef={iRef} />
      <Arrow color={BLUE} length={LEN_J * SCALE} radius={0.05} groupRef={jRef} />
      {phase !== 'apart' ? <Arrow color={CREAM} length={fLen} radius={0.035} groupRef={fRef} /> : null}
      <group ref={iTip}>
        <Callout position={[0, 0, 0]} fixed small>{`I = 3/2  nuclear spin`}</Callout>
      </group>
      <group ref={jTip}>
        <Callout position={[0, 0, 0]} fixed small>{`J = 1/2  electron spin`}</Callout>
      </group>
      {phase !== 'apart' ? (
        <group ref={fTip}>
          <Callout position={[0, 0, 0]} fixed>{`F = I + J = ${F}`}</Callout>
        </group>
      ) : null}
      {phase === 'field' ? (
        <>
          {/* field axis */}
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 3.6, 8]} />
            <meshBasicMaterial color={GREEN} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <coneGeometry args={[0.07, 0.24, 12]} />
            <meshBasicMaterial color={GREEN} />
          </mesh>
          <Callout position={[0.15, 3.6, 0]} fixed small>{`B  (${PAPER.cooling.bFieldG} G)`}</Callout>
          {/* precession cone */}
          {/* coneGeometry has its apex at +y; flip it so the apex sits at the origin. */}
          <mesh position={[0, projY / 2, 0]} rotation={[m >= 0 ? Math.PI : 0, 0, 0]}>
            <coneGeometry args={[Math.sin(theta) * fLen, Math.abs(projY) || 0.001, 48, 1, true]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.045} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, projY, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.sin(theta) * fLen - 0.008, Math.sin(theta) * fLen + 0.008, 96]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
          {/* projection drop line and tick */}
          <mesh ref={dropRef}>
            <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0, projY, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
            <meshBasicMaterial color={CREAM} />
          </mesh>
          <Callout position={[Math.sin(theta) * fLen + 0.35, projY, 0]} fixed small>{`m_F = ${m > 0 ? '+' : ''}${m}   (projection ${m}/√${F * (F + 1)})`}</Callout>
        </>
      ) : null}
    </group>
  );
}
