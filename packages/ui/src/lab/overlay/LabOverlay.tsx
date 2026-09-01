import type { Bench, BenchElement } from '@optics/bench';
import { getDefinition, polarizationEllipseAt } from '@optics/bench';
import { units } from '@optics/kernel';
import { explain, measure } from '@optics/tools';
import { CATALOG, PARAM_SPECS, Z_MAX, Z_MIN, labelForType } from '../catalog.ts';
import { EXPERIMENTS, experimentById, type ExperimentId } from '../experiments.ts';
import { formatCurvature, formatMetres, formatNm, formatPercent, formatPolarization, formatPower } from '../format.ts';
import { sampleAtX } from '../useLabModel.ts';
import type { LabModel } from '../useLabModel.ts';
import { opticX } from '../scale.ts';
import { JournalPanel } from './JournalPanel.tsx';
import type { LabJournal, LabResults } from '../journal.ts';
import { LAYER_KEYS, LAYER_LABEL, type CameraPreset, type LabLayers } from '../layers.ts';

export function LabOverlay(props: {
  readonly experimentId: ExperimentId;
  readonly bench: Bench;
  readonly model: LabModel;
  readonly selectedId: string | null;
  readonly placingType: string | null;
  readonly probeZ: number;
  readonly journal: LabJournal;
  readonly dirty: boolean;
  readonly commitMessage: string;
  readonly liveResults: LabResults;
  readonly onExperiment: (id: ExperimentId) => void;
  readonly onSelect: (id: string) => void;
  readonly onPlaceType: (type: string) => void;
  readonly onAdd: (type: string) => void;
  readonly onRemove: () => void;
  readonly onMove: (id: string, zMetres: number) => void;
  readonly onParam: (id: string, param: string, value: number) => void;
  readonly onSave: () => void;
  readonly onRestore: (id: string) => void;
  readonly onCommitMessage: (value: string) => void;
  readonly onRename: (name: string) => void;
  readonly onExport: () => void;
  readonly onImport: (file: File) => void;
  readonly layers: LabLayers;
  readonly cameraPreset: CameraPreset;
  readonly onLayer: (key: keyof LabLayers) => void;
  readonly onCamera: (preset: CameraPreset) => void;
}) {
  const selected = props.bench.elements.find((element) => element.id === props.selectedId) ?? null;
  const probe = sampleAtX(props.model.samples, opticX(props.probeZ, props.model.zMin));
  const experiment = experimentById(props.experimentId);
  const ellipse = ellipseAt(props.model, props.probeZ);

  return (
    <div className="overlay cad">
      <aside className="cad-left">
        <header className="masthead">
          <p className="kicker">Optics Studio</p>
          <h1>Bench</h1>
          <p className="institution">{experiment.lede}</p>
        </header>

        <section className="section">
          <h2>Examples</h2>
          <nav className="experiments">
            {EXPERIMENTS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === props.experimentId ? 'active' : undefined}
                onClick={() => props.onExperiment(entry.id)}
              >
                <span className="numeral">{entry.numeral}</span>
                {entry.title}
              </button>
            ))}
          </nav>
        </section>

        <section className="section">
          <h2>Library</h2>
          <p className="hint">
            {props.placingType === null
              ? 'Click a part, then click the table to place it. Or click + to drop it downstream.'
              : `Placing ${props.placingType.replaceAll('_', ' ')} — click the breadboard.`}
          </p>
          <div className="catalog">
            {CATALOG.map((item) => (
              <div className="catalog-row" key={item.type}>
                <button
                  type="button"
                  className={props.placingType === item.type ? 'active' : undefined}
                  onClick={() => props.onPlaceType(item.type)}
                >
                  {item.label}
                </button>
                <button type="button" className="add-now" onClick={() => props.onAdd(item.type)} title="Add on axis">
                  +
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Elements</h2>
          <div className="element-list">
            {props.bench.elements.map((element) => (
              <button
                key={element.id}
                type="button"
                className={element.id === props.selectedId ? 'element-row selected' : 'element-row'}
                onClick={() => props.onSelect(element.id)}
              >
                <span>
                  {labelForType(element.type)}
                  <small className="element-id">{element.id}</small>
                </span>
                <small>{formatMetres(units.toM(element.position))}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <aside className="cad-right">
        <header className="masthead">
          <p className="kicker">Inspector</p>
          <h1>{selected === null ? 'Probe' : labelForType(selected.type)}</h1>
        </header>

        <dl className="readout">
          <div>
            <dt>λ</dt>
            <dd>{formatNm(units.toM(props.bench.source.wavelength))}</dd>
          </div>
          <div>
            <dt>w₀</dt>
            <dd>{formatMetres(props.model.waistW)}</dd>
          </div>
          <div>
            <dt>z_w</dt>
            <dd>{formatMetres(props.model.waistZ)}</dd>
          </div>
          {props.model.coupling !== null && (
            <div>
              <dt>η</dt>
              <dd>{formatPercent(props.model.coupling)}</dd>
            </div>
          )}
          <div>
            <dt>probe z</dt>
            <dd>{formatMetres(probe.zMetres)}</dd>
          </div>
          <div>
            <dt>w(z)</dt>
            <dd>{formatMetres(probe.wMetres)}</dd>
          </div>
          <div>
            <dt>R(z)</dt>
            <dd>{formatCurvature(probe.Rmetres)}</dd>
          </div>
          <div>
            <dt>P</dt>
            <dd>{formatPower(probe.powerW)}</dd>
          </div>
          {ellipse !== null && (
            <div>
              <dt>Jones</dt>
              <dd>{formatPolarization(ellipse.handedness, units.toRad(ellipse.orientation), ellipse.ellipticity)}</dd>
            </div>
          )}
        </dl>

        <JournalPanel
          journal={props.journal}
          dirty={props.dirty}
          message={props.commitMessage}
          live={props.liveResults}
          onMessage={props.onCommitMessage}
          onSave={props.onSave}
          onRestore={props.onRestore}
          onRename={props.onRename}
          onExport={props.onExport}
          onImport={props.onImport}
        />

        {selected === null ? (
          <p className="hint">Select an optic to edit its parameters. Drag the gold card along the beam to probe a plane.</p>
        ) : (
          <SelectedEditor
            bench={props.bench}
            element={selected}
            onMove={props.onMove}
            onParam={props.onParam}
            onRemove={props.onRemove}
          />
        )}
      </aside>

      <div className="cad-hud">
        <div className="hud-group">
          {LAYER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={props.layers[key] ? 'active' : undefined}
              onClick={() => props.onLayer(key)}
            >
              {LAYER_LABEL[key]}
            </button>
          ))}
        </div>
        <div className="hud-group">
          {(['oblique', 'side', 'top'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              className={props.cameraPreset === preset ? 'active' : undefined}
              onClick={() => props.onCamera(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ellipseAt = (model: LabModel, zMetres: number) => {
  try {
    return polarizationEllipseAt(model.result, units.m(zMetres));
  } catch {
    return null;
  }
};

function SelectedEditor(props: {
  readonly bench: Bench;
  readonly element: BenchElement;
  readonly onMove: (id: string, zMetres: number) => void;
  readonly onParam: (id: string, param: string, value: number) => void;
  readonly onRemove: () => void;
}) {
  const z = units.toM(props.element.position);
  const definition = getDefinition(props.element.type);
  const matrix = definition.abcd(props.element.params);
  const waist = measure(props.bench, { quantity: 'waist_radius', at: { elementId: props.element.id } });
  const derivation = explain(props.bench, 'waist_radius', { elementId: props.element.id });

  return (
    <section className="section">
      <div className="section-title">
        <h2>Parameters</h2>
        <button type="button" onClick={props.onRemove}>
          Remove
        </button>
      </div>
      <label className="param-editor">
        <span>
          z<strong>{formatMetres(z)}</strong>
        </span>
        <input
          type="range"
          min={Z_MIN}
          max={Z_MAX}
          step={0.001}
          value={z}
          onChange={(event) => props.onMove(props.element.id, Number(event.currentTarget.value))}
        />
      </label>
      {Object.entries(props.element.params)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
        .map(([name, value]) => {
          const spec = PARAM_SPECS[name];
          if (spec === undefined) return null;
          return (
            <label className="param-editor" key={name}>
              <span>
                {spec.label}
                <strong>{spec.unit === 'm' ? formatMetres(value) : spec.unit === 'rad' ? `${((value * 180) / Math.PI).toFixed(1)}°` : value.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={value}
                onChange={(event) => props.onParam(props.element.id, name, Number(event.currentTarget.value))}
              />
            </label>
          );
        })}
      <p className="matrix-label">ABCD</p>
      <p className="matrix">
        [[{matrix.A.toFixed(3)}, {matrix.B.toFixed(4)}] [{matrix.C.toExponential(2)}, {matrix.D.toFixed(3)}]]
      </p>
      <p className="hint">
        After this element, w₀ = {typeof waist.value === 'number' ? formatMetres(waist.value) : '—'} via {derivation.formula}
      </p>
    </section>
  );
}
