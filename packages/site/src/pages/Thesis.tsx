import { Figure } from '../components/Figure.tsx';
import { THESIS } from '../data/thesis.ts';
import { MaskLab } from '../viz/thesis/MaskLab.tsx';
import { PhotonBudget } from '../viz/thesis/PhotonBudget.tsx';
import { QpmsModes } from '../viz/thesis/QpmsModes.tsx';
import { SpeedupCurve } from '../viz/thesis/SpeedupCurve.tsx';

export function Thesis() {
  return (
    <div className="page thesis">
      <p className="eyebrow">Doctoral dissertation · {THESIS.school} · {THESIS.year}</p>
      <h1>Physics-informed sparse single-photon 3D imaging</h1>
      <p className="lede">
        Single-photon LiDAR can range a scene from individual photons — but the photons are
        scarce, the noise is not, and scanning is slow. The thesis argument, played out below as
        running instruments: measure only a small fraction of the scene <em>on purpose</em>, tell
        the reconstruction exactly which pixels the hardware visited, and reject noise before it
        is ever detected.
      </p>

      <Figure
        src="/thesis/pipeline.png"
        alt="End-to-end photon pipeline: scene, MEMS keep set, sparse photons, reconstruction"
        caption="The whole thesis in one strip (Fig. 1.2): a real VideoPIMAE bike frame at 75% physical MEMS masking — fully sampled scene, the physical keep set the scanner recorded, the measured sparse photons, and the mask-conditioned reconstruction."
        light
      />

      <section className="thesis-act">
        <header>
          <span className="act-n">I</span>
          <h2>One detection per 540,000 pulses</h2>
        </header>
        <p className="prose">
          Detection is Poisson: with mean n̄ detections per pulse, the chance a pulse yields
          anything is 1 − e<sup>−n̄</sup>. The PI-MAE experiments ran at n̄ = 1.86×10⁻⁶ — the most
          extreme setting corresponds to 9.1 detected photons per total pixel for an entire image
          (Table 2.1). Drag the slider toward the thesis operating points and watch the panel
          go dark.
        </p>
        <PhotonBudget />
      </section>

      <section className="thesis-act">
        <header>
          <span className="act-n">II</span>
          <h2>Skip 90% of the scene on purpose</h2>
        </header>
        <p className="prose">
          The core move (Ch. 2): the MEMS mirror deliberately visits only a subset of pixels, and
          the reconstruction is <em>conditioned on the exact keep set</em> — the mask is knowledge,
          not damage. A matching random digital mask is hopeless: the chance of guessing the
          physical pattern at 90% masking is about 3.6×10⁻³⁶. Below, the Chapter 5 training-free
          reconstruction — the biharmonic equation Δ²u = 0 solved on the missing pixels — runs
          live against a synthetic depth scene, with the same scan geometries used in the thesis.
        </p>
        <MaskLab />
        <Figure
          src="/thesis/pimae-results.png"
          alt="PI-MAE reconstructions of wooden letters and numbers at 75% and 90% physical masking"
          caption="The real thing (Fig. 2.3): PI-MAE reconstructions of wooden letters and digits from physically masked single-photon LiDAR scans — scan pattern, sparse measurement, reconstruction — at 75% and 90% masking, down to 9.1 detected photons per total pixel."
          light
        />
      </section>

      <section className="thesis-act">
        <header>
          <span className="act-n">III</span>
          <h2>Reject noise before detection</h2>
        </header>
        <p className="prose">
          A detector that accepts a 1 ns × 250 GHz time-frequency window admits N = πBT/2 ≈ 392
          modes of background along with the one signal mode. Quantum parametric mode sorting
          (Ch. 3, inherited platform) upconverts the 1554 nm return in a PPLN waveguide so that
          the acceptance shrinks to roughly a single mode — 6 ps × 90 GHz — and only the
          pump-matched temporal mode converts efficiently. Shrink the window yourself.
        </p>
        <QpmsModes />
        <Figure
          src="/thesis/qpms-noise-budget.png"
          alt="Decomposition of the 36 dB QPMS noise advantage"
          caption="Thesis Fig. 3.9: the 36 dB QPMS advantage over direct InGaAs detection, decomposed — mode-number reduction (25.9 dB), polarization selectivity (3.0 dB), intrinsic mode selectivity (7.1 dB)."
          light
        />
      </section>

      <section className="thesis-act">
        <header>
          <span className="act-n">IV</span>
          <h2>Depth video at 4–50× the frame rate</h2>
        </header>
        <p className="prose">
          VideoPIMAE (Ch. 6) pushes the mask-conditioned idea into spacetime: a public video
          masked-autoencoder checkpoint, never fine-tuned on LiDAR, reconstructs dynamic
          single-photon depth video when its random training mask is replaced by the physical
          MEMS keep set. Useful at 4–10×; at 50× only gross structure and motion survive.
        </p>
        <SpeedupCurve />
      </section>

      <section className="thesis-act">
        <header>
          <span className="act-n">·</span>
          <h2>Chapters</h2>
        </header>
        <ol className="chapter-list">
          {THESIS.chapters.map((ch) => (
            <li key={ch.n}>
              <span className="ch-n">{ch.n}</span>
              <span className="ch-title">{ch.title}</span>
              <span className="ch-note">{ch.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <aside className="assumptions">
        <h3>Provenance</h3>
        <ul>
          <li>
            Quoted numbers (photon budgets, QPMS specs, PSNR/SSIM tables) come from the
            dissertation text, Tables 2.1, 3.1, 5.1, and 6.1.
          </li>
          <li>
            Live numbers (Poisson probabilities, mode counts, the biharmonic PSNR) are computed
            in this page from the stated closed forms; the mask-lab scene is synthetic, not
            thesis LiDAR data.
          </li>
          <li>
            QPMS hardware and its published numbers are inherited platform work (Shahverdi et
            al., Rehain et al.); the thesis contribution begins after acquisition.
          </li>
        </ul>
      </aside>

      <p className="links">
        <a href="https://www.nature.com/articles/s41598-024-71095-x" target="_blank" rel="noreferrer">
          PI-MAE — Scientific Reports (2024)
        </a>
      </p>
      <p className="prose thesis-cite">
        {THESIS.author}, “{THESIS.title},” Ph.D. dissertation, {THESIS.school}, {THESIS.year}.
        Advisor: {THESIS.advisor}. Committee: {THESIS.committee.join(', ')}.
      </p>
    </div>
  );
}
