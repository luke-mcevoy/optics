import { useMemo, useState } from 'react';
import type {
  ApertureStatus,
  BeamState,
  Bench,
  BenchElement,
  ElementState,
  JsonValue,
  PropagationResult,
} from '@optics/bench';
import { getDefinition, registeredElements } from '@optics/bench';
import { gaussian, jones, units } from '@optics/kernel';
import type { ABCD, Complex, JonesMatrix, Length } from '@optics/kernel';
import {
  add_element,
  create_bench,
  explain,
  measure,
  propagate,
  remove_element,
  set_parameter,
  sweep,
} from '@optics/tools';
import './styles.css';

type PresetId = 'focus' | 'expander' | 'fiber';
type PlotMetric = 'coupling' | 'waist';

interface Preset {
  readonly id: PresetId;
  readonly label: string;
  readonly build: () => Bench;
}

interface ParamSpec {
  readonly label: string;
  readonly unit: 'm' | 'rad' | '1';
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

interface PlotPoint {
  readonly value: number;
  readonly metric: number;
}

const PARAM_SPECS: Record<string, ParamSpec> = {
  f: { label: 'f', unit: 'm', min: -0.1, max: 0.15, step: 0.001 },
  f1: { label: 'f1', unit: 'm', min: -0.1, max: 0.05, step: 0.001 },
  f2: { label: 'f2', unit: 'm', min: 0.01, max: 0.2, step: 0.001 },
  position: { label: 'z', unit: 'm', min: 0, max: 0.25, step: 0.001 },
  T: { label: 'T', unit: '1', min: 0, max: 1, step: 0.01 },
  R: { label: 'R', unit: 'm', min: -0.5, max: 0.5, step: 0.001 },
  R_power: { label: 'R power', unit: '1', min: 0, max: 1, step: 0.01 },
  theta: { label: 'angle', unit: 'rad', min: 0, max: Math.PI, step: Math.PI / 180 },
  diameter: { label: 'diameter', unit: 'm', min: 0.00005, max: 0.025, step: 0.00005 },
  mfd: { label: 'MFD', unit: 'm', min: 0.000001, max: 0.00002, step: 0.0000001 },
  offset: { label: 'offset', unit: 'm', min: -0.00002, max: 0.00002, step: 0.0000001 },
  tilt: { label: 'tilt', unit: 'rad', min: -0.005, max: 0.005, step: 0.00001 },
};

const TYPE_DEFAULTS: Record<string, { readonly position: number; readonly params: Record<string, number> }> = {
  thin_lens: { position: 0.05, params: { f: 0.05, diameter: 0.0127, T: 0.995 } },
  mirror_flat: { position: 0.08, params: { R: 0.99, diameter: 0.0127 } },
  mirror_curved: { position: 0.08, params: { R: 0.1, R_power: 0.99, diameter: 0.0127 } },
  waveplate_half: { position: 0.04, params: { theta: Math.PI / 8, diameter: 0.0127, T: 0.995 } },
  waveplate_quarter: { position: 0.04, params: { theta: Math.PI / 4, diameter: 0.0127, T: 0.995 } },
  polarizer_linear: { position: 0.04, params: { theta: 0, diameter: 0.0127, T: 1 } },
  pbs: { position: 0.06, params: { diameter: 0.01, T: 1 } },
  attenuator: { position: 0.06, params: { T: 0.5, diameter: 0.0127 } },
  aperture_iris: { position: 0.08, params: { diameter: 0.005, T: 1 } },
  fiber_smf: { position: 0.05, params: { mfd: 0.000005, T: 1, offset: 0, tilt: 0 } },
  beam_expander: { position: 0.02, params: { f1: -0.025, f2: 0.075, T: 0.99 } },
};

const presets: readonly Preset[] = [
  {
    id: 'focus',
    label: 'Thin-lens focusing (1064nm, f=50mm)',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(1), units.m(Infinity), units.nm(1064));
      return add_element(
        add_element(create_bench(sourceFromBeam(beam, 0.005)), {
          id: 'lens_50mm',
          type: 'thin_lens',
          position: 0,
          params: { f: 0.05, diameter: 0.0127, T: 0.995 },
        }),
        {
          id: 'observation_plane',
          type: 'aperture_iris',
          position: 0.1,
          params: { diameter: 0.02, T: 1 },
        },
      );
    },
  },
  {
    id: 'expander',
    label: '3x beam expander (780nm)',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(0.4), units.m(Infinity), units.nm(780));
      return add_element(
        add_element(
          add_element(create_bench(sourceFromBeam(beam, 0.003)), {
            id: 'diverging_lens',
            type: 'thin_lens',
            position: 0.02,
            params: { f: -0.025, diameter: 0.006, T: 0.995 },
          }),
          {
            id: 'collimating_lens',
            type: 'thin_lens',
            position: 0.07,
            params: { f: 0.075, diameter: 0.025, T: 0.995 },
          },
        ),
        {
          id: 'output_plane',
          type: 'aperture_iris',
          position: 0.18,
          params: { diameter: 0.025, T: 1 },
        },
      );
    },
  },
  {
    id: 'fiber',
    label: 'Fiber coupling (780nm, SMF)',
    build: () => {
      const beam = gaussian.beamFromWR(units.mm(0.5), units.m(Infinity), units.nm(780));
      return add_element(
        add_element(create_bench(sourceFromBeam(beam, 0.002)), {
          id: 'coupling_lens',
          type: 'thin_lens',
          position: 0,
          params: { f: 0.01, diameter: 0.006, T: 0.995 },
        }),
        {
          id: 'smf_780',
          type: 'fiber_smf',
          position: 0.01,
          params: { mfd: 0.000005, T: 1, offset: 0, tilt: 0 },
        },
      );
    },
  },
];

export function App() {
  const [presetId, setPresetId] = useState<PresetId>('focus');
  const [bench, setBench] = useState<Bench>(() => presetById('focus').build());
  const [selectedId, setSelectedId] = useState<string | null>('lens_50mm');

  const result = useMemo(() => propagate(bench), [bench]);
  const selectedElement = bench.elements.find((element) => element.id === selectedId) ?? null;
  const selectedState =
    selectedElement === null ? null : result.elements.find((entry) => entry.element.id === selectedElement.id) ?? null;

  const setPreset = (id: PresetId) => {
    const next = presetById(id).build();
    setPresetId(id);
    setBench(next);
    setSelectedId(next.elements[0]?.id ?? null);
  };

  const updateParam = (element: BenchElement, param: string, value: number) => {
    setBench((current) => {
      if (param === 'position') {
        return {
          ...current,
          elements: current.elements.map((entry) =>
            entry.id === element.id ? { ...entry, position: units.m(value) } : entry,
          ),
        };
      }
      return set_parameter(current, element.id, param, value);
    });
  };

  const addElement = (type: string) => {
    const defaults = TYPE_DEFAULTS[type] ?? { position: 0.05, params: {} };
    const next = add_element(bench, { type, position: defaults.position, params: defaults.params });
    setBench(next);
    setSelectedId(next.elements[next.elements.length - 1]?.id ?? null);
  };

  const removeSelected = () => {
    if (selectedElement === null) return;
    const next = remove_element(bench, selectedElement.id);
    setBench(next);
    setSelectedId(next.elements[0]?.id ?? null);
  };

  return (
    <main className="app-shell">
      <ControlsPane
        bench={bench}
        onAdd={addElement}
        onPreset={setPreset}
        onRemove={removeSelected}
        onSelect={setSelectedId}
        onUpdateParam={updateParam}
        presetId={presetId}
        selectedId={selectedId}
      />
      <BenchView result={result} selectedId={selectedId} onSelect={setSelectedId} />
      <Inspector bench={bench} result={result} selectedElement={selectedElement} selectedState={selectedState} />
    </main>
  );
}

function ControlsPane(props: {
  readonly bench: Bench;
  readonly presetId: PresetId;
  readonly selectedId: string | null;
  readonly onAdd: (type: string) => void;
  readonly onPreset: (id: PresetId) => void;
  readonly onRemove: () => void;
  readonly onSelect: (id: string) => void;
  readonly onUpdateParam: (element: BenchElement, param: string, value: number) => void;
}) {
  const [newType, setNewType] = useState('thin_lens');
  const selected = props.bench.elements.find((element) => element.id === props.selectedId) ?? null;
  const typeNames = [...registeredElements().keys()].sort();

  return (
    <aside className="pane controls-pane">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Optics Studio</p>
          <h1>Bench controls</h1>
        </div>
      </header>

      <label className="field">
        <span>Preset</span>
        <select value={props.presetId} onChange={(event) => props.onPreset(event.currentTarget.value as PresetId)}>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <section className="section">
        <div className="section-title">
          <h2>Elements</h2>
          <button type="button" onClick={props.onRemove} disabled={selected === null}>
            Remove
          </button>
        </div>
        <div className="element-list">
          {props.bench.elements.map((element) => (
            <button
              className={element.id === props.selectedId ? 'element-row selected' : 'element-row'}
              key={element.id}
              type="button"
              onClick={() => props.onSelect(element.id)}
            >
              <span>{element.id}</span>
              <small>{labelForType(element.type)} at {formatLength(element.position)}</small>
            </button>
          ))}
        </div>
        <div className="add-row">
          <select value={newType} onChange={(event) => setNewType(event.currentTarget.value)}>
            {typeNames.map((type) => (
              <option key={type} value={type}>
                {labelForType(type)}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => props.onAdd(newType)}>
            Add
          </button>
        </div>
      </section>

      <section className="section">
        <h2>Parameters</h2>
        {selected === null ? (
          <p className="muted">Select an element to edit its model parameters.</p>
        ) : (
          <ParamEditors element={selected} onUpdate={props.onUpdateParam} />
        )}
      </section>
    </aside>
  );
}

function ParamEditors(props: {
  readonly element: BenchElement;
  readonly onUpdate: (element: BenchElement, param: string, value: number) => void;
}) {
  const params = { position: units.toM(props.element.position), ...props.element.params };
  return (
    <div className="param-list">
      {Object.entries(params)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
        .map(([name, value]) => {
          const spec = specForParam(name, value);
          return (
            <label className="param-editor" key={name}>
              <span>
                {spec.label}
                <strong>{formatParam(value, spec.unit)}</strong>
              </span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={clamp(value, spec.min, spec.max)}
                onChange={(event) => props.onUpdate(props.element, name, Number(event.currentTarget.value))}
              />
              <input
                type="number"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={formatRaw(value)}
                onChange={(event) => props.onUpdate(props.element, name, Number(event.currentTarget.value))}
              />
            </label>
          );
        })}
    </div>
  );
}

function BenchView(props: {
  readonly result: PropagationResult;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}) {
  const geom = useMemo(() => benchGeometry(props.result), [props.result]);
  const waist = measure(props.result.bench, { quantity: 'waist_radius' });
  const waistZ = measure(props.result.bench, { quantity: 'waist_position' });
  const waistXM = typeof waistZ.value === 'number' ? waistZ.value : units.toM(props.result.final.z);
  const waistYM = typeof waist.value === 'number' ? waist.value : 0;
  const envelope = props.result.samples
    .map((sample) => `${geom.x(units.toM(sample.z))},${geom.y(units.toM(sample.spotRadius))}`)
    .join(' ');
  const lower = [...props.result.samples]
    .reverse()
    .map((sample) => `${geom.x(units.toM(sample.z))},${geom.y(-units.toM(sample.spotRadius))}`)
    .join(' ');
  const ticks = makeTicks(geom.zMin, geom.zMax, 6);

  return (
    <section className="bench-pane">
      <div className="bench-title">
        <div>
          <p className="eyebrow">Live deterministic propagation</p>
          <h1>Optical bench</h1>
        </div>
        <div className="readout">
          <span>waist {formatMetres(waistYM)}</span>
          <span>at {formatMetres(waistXM)}</span>
        </div>
      </div>
      <svg className="bench-svg" viewBox={`0 0 ${geom.width} ${geom.height}`} role="img" aria-label="Live optical bench">
        <rect x="0" y="0" width={geom.width} height={geom.height} rx="0" className="svg-bg" />
        <line x1={geom.padX} y1={geom.axisY} x2={geom.width - geom.padX} y2={geom.axisY} className="axis" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={geom.x(tick)} y1={geom.axisY - 5} x2={geom.x(tick)} y2={geom.axisY + 5} className="tick" />
            <text x={geom.x(tick)} y={geom.axisY + 24} className="tick-label" textAnchor="middle">
              {formatMmNumber(tick)} mm
            </text>
          </g>
        ))}
        <text x={geom.padX} y={42} className="axis-label">
          w scale: +/-{formatMetres(geom.wMax)}
        </text>
        <polygon points={`${envelope} ${lower}`} className="beam-fill" onClick={() => props.onSelect(null)} />
        <polyline points={envelope} className="beam-edge" />
        <polyline points={lower} className="beam-edge" />
        <line
          x1={geom.x(waistXM)}
          y1={geom.y(-waistYM)}
          x2={geom.x(waistXM)}
          y2={geom.y(waistYM)}
          className="waist-marker"
        />
        <text x={geom.x(waistXM) + 8} y={geom.y(waistYM) - 8} className="waist-label">
          w0 {formatMetres(waistYM)}
        </text>
        {props.result.elements.map((state) => (
          <ElementGlyph
            key={state.element.id}
            state={state}
            geom={geom}
            selected={state.element.id === props.selectedId}
            onSelect={props.onSelect}
          />
        ))}
      </svg>
    </section>
  );
}

function ElementGlyph(props: {
  readonly state: ElementState;
  readonly geom: ReturnType<typeof benchGeometry>;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const x = props.geom.x(units.toM(props.state.element.position));
  const cls = `glyph ${statusClass(props.state.aperture?.status)}${props.selected ? ' selected' : ''}`;
  const type = props.state.element.type;
  const common = {
    className: cls,
    onClick: () => props.onSelect(props.state.element.id),
  };
  if (type === 'thin_lens') {
    return (
      <g {...common}>
        <path d={`M ${x - 8} ${props.geom.axisY - 78} Q ${x + 10} ${props.geom.axisY} ${x - 8} ${props.geom.axisY + 78}`} />
        <path d={`M ${x + 8} ${props.geom.axisY - 78} Q ${x - 10} ${props.geom.axisY} ${x + 8} ${props.geom.axisY + 78}`} />
        <GlyphLabel x={x} y={props.geom.axisY - 92} text={props.state.element.id} />
      </g>
    );
  }
  if (type.includes('waveplate') || type === 'polarizer_linear' || type === 'pbs' || type === 'attenuator') {
    return (
      <g {...common}>
        <rect x={x - 8} y={props.geom.axisY - 70} width="16" height="140" rx="2" />
        <line x1={x - 16} y1={props.geom.axisY - 45} x2={x + 16} y2={props.geom.axisY + 45} />
        <GlyphLabel x={x} y={props.geom.axisY - 86} text={props.state.element.id} />
      </g>
    );
  }
  if (type === 'fiber_smf') {
    return (
      <g {...common}>
        <circle cx={x} cy={props.geom.axisY} r="25" />
        <circle cx={x} cy={props.geom.axisY} r="6" />
        <GlyphLabel x={x} y={props.geom.axisY - 40} text={props.state.element.id} />
      </g>
    );
  }
  if (type === 'aperture_iris') {
    return (
      <g {...common}>
        <line x1={x} y1={props.geom.axisY - 76} x2={x} y2={props.geom.axisY - 18} />
        <line x1={x} y1={props.geom.axisY + 18} x2={x} y2={props.geom.axisY + 76} />
        <GlyphLabel x={x} y={props.geom.axisY - 90} text={props.state.element.id} />
      </g>
    );
  }
  return (
    <g {...common}>
      <rect x={x - 10} y={props.geom.axisY - 52} width="20" height="104" rx="2" />
      <GlyphLabel x={x} y={props.geom.axisY - 68} text={props.state.element.id} />
    </g>
  );
}

function GlyphLabel(props: { readonly x: number; readonly y: number; readonly text: string }) {
  return (
    <text x={props.x} y={props.y} textAnchor="middle" className="glyph-label">
      {props.text}
    </text>
  );
}

function Inspector(props: {
  readonly bench: Bench;
  readonly result: PropagationResult;
  readonly selectedElement: BenchElement | null;
  readonly selectedState: ElementState | null;
}) {
  if (props.selectedElement === null || props.selectedState === null) {
    return <BenchSummary bench={props.bench} result={props.result} />;
  }

  const definition = getDefinition(props.selectedElement.type);
  const abcd = definition.abcd(props.selectedElement.params);
  const jm = definition.jones(props.selectedElement.params);
  const transmission = definition.transmission(props.selectedElement.params);
  const power = measure(props.bench, {
    quantity: 'power',
    at: { z: units.toM(props.selectedState.after.z) },
  });
  const ellipse = measure(props.bench, {
    quantity: 'polarization_ellipse',
    at: { z: units.toM(props.selectedState.after.z) },
  });
  const waist = measure(props.bench, { quantity: 'waist_radius', at: { elementId: props.selectedElement.id } });
  const waistZ = measure(props.bench, { quantity: 'waist_position', at: { elementId: props.selectedElement.id } });
  const spot = measure(props.bench, {
    quantity: 'spot_radius',
    at: { z: units.toM(props.selectedState.after.z) },
  });
  const radius = gaussian.radiusOfCurvature(props.selectedState.after.beam);
  const assumptions = [
    ...new Set([
      ...props.selectedState.assumptions,
      ...explain(props.bench, 'waist_radius', { elementId: props.selectedElement.id }).assumptions,
    ]),
  ];

  return (
    <aside className="pane inspector-pane">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Inspector</p>
          <h1>{props.selectedElement.id}</h1>
        </div>
        <span className="type-pill">{labelForType(props.selectedElement.type)}</span>
      </header>
      <InfoGrid
        rows={[
          ['z', formatLength(props.selectedElement.position)],
          ['transmission', formatPercent(transmission)],
          ['spot after', formatMeasurement(spot)],
          ['waist after', `${formatMeasurement(waist)} at ${formatMeasurement(waistZ)}`],
          ['wavefront R', Number.isFinite(units.toM(radius)) ? formatLength(radius) : 'flat'],
          ['power after', formatMeasurement(power)],
          ['polarization', ellipseSummary(ellipse.value)],
        ]}
      />
      <Panel title="Parameters">
        <KeyValues values={props.selectedElement.params} />
      </Panel>
      <Panel title="ABCD matrix">
        <Matrix values={[[abcd.A, abcd.B], [abcd.C, abcd.D]]} />
      </Panel>
      {!isJonesIdentity(jm) && (
        <Panel title="Jones matrix">
          <Matrix values={[[jm.xx, jm.xy], [jm.yx, jm.yy]]} />
        </Panel>
      )}
      <Panel title="Aperture">
        {props.selectedState.aperture === null ? (
          <p className="muted">No clear-aperture trait for this element.</p>
        ) : (
          <InfoGrid
            rows={[
              ['status', props.selectedState.aperture.status],
              ['fill ratio', formatPercent(props.selectedState.aperture.fillFraction)],
              ['beam diameter', formatLength(props.selectedState.aperture.beamDiameter)],
              ['clear aperture', formatLength(props.selectedState.aperture.clearAperture)],
            ]}
          />
        )}
      </Panel>
      <SweepPlot bench={props.bench} element={props.selectedElement} />
      <Panel title="Assumptions">
        <ul className="assumptions">
          {assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </Panel>
    </aside>
  );
}

function BenchSummary(props: { readonly bench: Bench; readonly result: PropagationResult }) {
  const finalZ = units.toM(props.result.final.z);
  const waist = measure(props.bench, { quantity: 'waist_radius' });
  const waistZ = measure(props.bench, { quantity: 'waist_position' });
  const finalSpot = measure(props.bench, { quantity: 'spot_radius', at: { z: finalZ } });
  const finalPower = measure(props.bench, { quantity: 'power', at: { z: finalZ } });
  const finalEllipse = measure(props.bench, { quantity: 'polarization_ellipse', at: { z: finalZ } });
  const fiber = props.result.elements.find((state) => state.element.type === 'fiber_smf');
  const coupling = fiber
    ? measure(props.bench, { quantity: 'coupling_efficiency', at: { elementId: fiber.element.id } })
    : null;

  return (
    <aside className="pane inspector-pane">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Inspector</p>
          <h1>Bench summary</h1>
        </div>
      </header>
      <Panel title="Source">
        <InfoGrid
          rows={[
            ['wavelength', formatLength(props.bench.source.wavelength)],
            ['power', `${formatPower(units.toW(props.bench.source.power))}`],
            ['M2', props.bench.source.M2.toFixed(2)],
            ['polarization', ellipseSummary(finalEllipse.value)],
          ]}
        />
      </Panel>
      <Panel title="Final state">
        <InfoGrid
          rows={[
            ['z', formatMetres(finalZ)],
            ['spot radius', formatMeasurement(finalSpot)],
            ['waist', `${formatMeasurement(waist)} at ${formatMeasurement(waistZ)}`],
            ['power', formatMeasurement(finalPower)],
            ...(coupling ? ([['fiber coupling', formatMeasurement(coupling)]] as const) : []),
          ]}
        />
      </Panel>
      <Panel title="Grounding">
        <p className="muted">
          Values in this panel are read from propagation results and tool measurements. The SVG envelope is drawn from
          propagation samples.
        </p>
      </Panel>
    </aside>
  );
}

function SweepPlot(props: { readonly bench: Bench; readonly element: BenchElement }) {
  const currentF = props.element.params.f;
  if (typeof currentF !== 'number' || !Number.isFinite(currentF)) return null;
  const isFiberBench = props.bench.elements.some((element) => element.type === 'fiber_smf');
  const metric: PlotMetric = isFiberBench ? 'coupling' : 'waist';
  const values = focalSweepValues(currentF);
  const points = sweep(props.bench, props.element.id, 'f', values).map<PlotPoint>((point) => {
    const found =
      metric === 'coupling'
        ? point.measures.find((entry) => entry.provenance.function === 'coupling.couplingToFiber')
        : point.measures.find((entry) => entry.provenance.function === 'gaussian.waistRadius');
    return { value: point.value, metric: typeof found?.value === 'number' ? found.value : Number.NaN };
  });
  const finite = points.filter((point) => Number.isFinite(point.metric));
  if (finite.length < 2) return null;
  const width = 280;
  const height = 118;
  const pad = 18;
  const minX = Math.min(...finite.map((point) => point.value));
  const maxX = Math.max(...finite.map((point) => point.value));
  const minY = Math.min(...finite.map((point) => point.metric));
  const maxY = Math.max(...finite.map((point) => point.metric));
  const ySpan = maxY - minY || 1;
  const x = (v: number) => pad + ((v - minX) / (maxX - minX || 1)) * (width - 2 * pad);
  const y = (v: number) => height - pad - ((v - minY) / ySpan) * (height - 2 * pad);
  const path = finite.map((point) => `${x(point.value)},${y(point.metric)}`).join(' ');
  const currentY = y(interpolateMetric(finite, currentF));

  return (
    <Panel title={metric === 'coupling' ? 'Coupling vs f' : 'Output waist vs f'}>
      <svg className="mini-plot" viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="plot-axis" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="plot-axis" />
        <polyline points={path} className="plot-line" />
        <line x1={x(currentF)} y1={pad} x2={x(currentF)} y2={height - pad} className="plot-current" />
        <circle cx={x(currentF)} cy={currentY} r="4" className="plot-dot" />
        <text x={pad} y={12} className="plot-label">
          {formatPlotY(maxY, metric)}
        </text>
        <text x={width - pad} y={height - 4} textAnchor="end" className="plot-label">
          f {formatMetres(currentF)}
        </text>
      </svg>
    </Panel>
  );
}

function Panel(props: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="panel-block">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function InfoGrid(props: { readonly rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="info-grid">
      {props.rows.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Matrix(props: { readonly values: readonly (readonly (number | Complex)[])[] }) {
  return (
    <div className="matrix">
      {props.values.flatMap((row, rowIndex) =>
        row.map((value, colIndex) => (
          <span key={`${rowIndex}-${colIndex}`}>{typeof value === 'number' ? formatMatrixNumber(value) : formatComplex(value)}</span>
        )),
      )}
    </div>
  );
}

function KeyValues(props: { readonly values: Record<string, JsonValue> }) {
  return (
    <dl className="info-grid">
      {Object.entries(props.values).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{typeof value === 'number' ? formatParam(value, specForParam(key, value).unit) : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function sourceFromBeam(beam: gaussian.GaussianBeam, powerW: number): Bench['source'] {
  return {
    wavelength: beam.lambda0,
    q: beam.q,
    M2: beam.M2,
    power: units.W(powerW),
    polarization: jones.HORIZONTAL,
    position: units.m(0),
  };
}

function benchGeometry(result: PropagationResult) {
  const width = 920;
  const height = 560;
  const padX = 58;
  const axisY = 290;
  const sampleZs = result.samples.map((sample) => units.toM(sample.z));
  const elementZs = result.elements.map((state) => units.toM(state.element.position));
  const waistZ = measure(result.bench, { quantity: 'waist_position' }).value;
  const zMaxRaw = Math.max(...sampleZs, ...elementZs, typeof waistZ === 'number' ? waistZ : 0, 0.02);
  const zMin = Math.min(0, ...sampleZs, ...elementZs);
  const zMax = zMaxRaw + Math.max(0.01, (zMaxRaw - zMin) * 0.08);
  const wMaxRaw = Math.max(...result.samples.map((sample) => units.toM(sample.spotRadius)), 0.000001);
  const wMax = wMaxRaw * 1.35;
  return {
    width,
    height,
    padX,
    axisY,
    zMin,
    zMax,
    wMax,
    x: (z: number) => padX + ((z - zMin) / (zMax - zMin || 1)) * (width - 2 * padX),
    y: (w: number) => axisY - (w / wMax) * 205,
  };
}

function presetById(id: PresetId): Preset {
  return presets.find((preset) => preset.id === id) ?? presets[0]!;
}

function specForParam(name: string, value: number): ParamSpec {
  const base = PARAM_SPECS[name];
  if (base === undefined) {
    const span = Math.max(Math.abs(value), 1) * 2;
    return { label: name, unit: '1', min: -span, max: span, step: span / 100 };
  }
  if (name === 'f' && value < 0) return { ...base, min: -0.15, max: -0.005 };
  if (name === 'position') return base;
  if (name === 'diameter' && value > base.max) return { ...base, max: value * 1.5 };
  return base;
}

function focalSweepValues(f: number): readonly number[] {
  const sign = f < 0 ? -1 : 1;
  const magnitude = Math.max(Math.abs(f), 0.005);
  const min = sign * magnitude * 0.45;
  const max = sign * magnitude * 1.8;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Array.from({ length: 40 }, (_, index) => lo + ((hi - lo) * index) / 39).filter((value) => Math.abs(value) > 1e-6);
}

function interpolateMetric(points: readonly PlotPoint[], value: number): number {
  const nearest = points.reduce((best, point) => (Math.abs(point.value - value) < Math.abs(best.value - value) ? point : best));
  return nearest.metric;
}

function makeTicks(min: number, max: number, count: number): readonly number[] {
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
}

function isJonesIdentity(matrix: JonesMatrix): boolean {
  return (
    closeComplex(matrix.xx, { re: 1, im: 0 }) &&
    closeComplex(matrix.xy, { re: 0, im: 0 }) &&
    closeComplex(matrix.yx, { re: 0, im: 0 }) &&
    closeComplex(matrix.yy, { re: 1, im: 0 })
  );
}

function closeComplex(a: Complex, b: Complex): boolean {
  return Math.abs(a.re - b.re) < 1e-10 && Math.abs(a.im - b.im) < 1e-10;
}

function labelForType(type: string): string {
  return type.replaceAll('_', ' ');
}

function statusClass(status: ApertureStatus | undefined): string {
  if (status === 'FAIL') return ' fail';
  if (status === 'WARNING') return ' warning';
  return ' pass';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatMeasurement(measurement: { readonly value: JsonValue; readonly unit: string }): string {
  if (typeof measurement.value !== 'number') return String(measurement.value);
  if (measurement.unit === 'm') return formatMetres(measurement.value);
  if (measurement.unit === 'W') return formatPower(measurement.value);
  if (measurement.unit === '1') return formatPercent(measurement.value);
  return `${formatNumber(measurement.value)} ${measurement.unit}`;
}

function formatParam(value: number, unit: ParamSpec['unit']): string {
  if (unit === 'm') return formatMetres(value);
  if (unit === 'rad') return `${formatNumber((value * 180) / Math.PI)} deg`;
  return formatNumber(value);
}

function formatLength(length: Length): string {
  return formatMetres(units.toM(length));
}

function formatMetres(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.01 || abs === 0) return `${formatNumber(value * 1e3)} mm`;
  if (abs >= 0.000001) return `${formatNumber(value * 1e6)} um`;
  return `${formatNumber(value * 1e9)} nm`;
}

function formatMmNumber(value: number): string {
  return formatNumber(value * 1e3, 1);
}

function formatPower(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1) return `${formatNumber(value)} W`;
  if (abs >= 0.001) return `${formatNumber(value * 1e3)} mW`;
  if (abs >= 0.000001) return `${formatNumber(value * 1e6)} uW`;
  return `${formatNumber(value * 1e9)} nW`;
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100, 2)}%`;
}

function formatPlotY(value: number, metric: PlotMetric): string {
  return metric === 'coupling' ? formatPercent(value) : formatMetres(value);
}

function formatComplex(value: Complex): string {
  const im = Math.abs(value.im) < 1e-12 ? 0 : value.im;
  const re = Math.abs(value.re) < 1e-12 ? 0 : value.re;
  if (im === 0) return formatMatrixNumber(re);
  if (re === 0) return `${formatMatrixNumber(im)}i`;
  return `${formatMatrixNumber(re)} ${im >= 0 ? '+' : '-'} ${formatMatrixNumber(Math.abs(im))}i`;
}

function formatMatrixNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(3);
  return formatNumber(value, 4);
}

function formatRaw(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(8)));
}

function formatNumber(value: number, digits = 3): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

function ellipseSummary(value: JsonValue): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return String(value);
  const ellipse = value as Record<string, JsonValue>;
  const orientation =
    typeof ellipse.orientation === 'number' ? `${formatNumber((ellipse.orientation * 180) / Math.PI)} deg` : '?';
  const chi =
    typeof ellipse.ellipticityAngle === 'number'
      ? `${formatNumber((ellipse.ellipticityAngle * 180) / Math.PI)} deg`
      : '?';
  const handedness = typeof ellipse.handedness === 'string' ? ellipse.handedness : 'unknown';
  return `${handedness}, psi ${orientation}, chi ${chi}`;
}
