import { useCallback, useMemo, useState } from 'react';
import { units } from '@optics/kernel';
import { add_element, remove_element, set_parameter, set_position } from '@optics/tools';
import { LabCanvas } from './lab/scene/LabCanvas.tsx';
import { LabOverlay } from './lab/overlay/LabOverlay.tsx';
import { CATALOG, Z_MAX } from './lab/catalog.ts';
import { DEFAULT_LAYERS, type CameraPreset, type LabLayers } from './lab/layers.ts';
import { experimentById, type ExperimentId } from './lab/experiments.ts';
import { useLabModel } from './lab/useLabModel.ts';
import { sampleAtX } from './lab/useLabModel.ts';
import { opticX } from './lab/scale.ts';
import {
  checkout,
  commitLab,
  exportJournal,
  importJournal,
  isDirty,
  loadJournal,
  renameLab,
  type LabJournal,
} from './lab/journal.ts';
import './styles.css';

export function App() {
  const [experimentId, setExperimentId] = useState<ExperimentId>('focus');
  const [bench, setBench] = useState(() => experimentById('focus').build());
  const [selectedId, setSelectedId] = useState<string | null>('lens');
  const [placingType, setPlacingType] = useState<string | null>(null);
  const [probeZ, setProbeZ] = useState(0.07);
  const [journal, setJournal] = useState<LabJournal>(() => loadJournal());
  const [commitMessage, setCommitMessage] = useState('');
  const [layers, setLayers] = useState<LabLayers>(DEFAULT_LAYERS);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('oblique');
  const model = useLabModel(bench);
  const dirty = useMemo(() => isDirty(journal, bench, probeZ), [journal, bench, probeZ]);
  const probe = sampleAtX(model.samples, opticX(probeZ, model.zMin));
  const liveResults = useMemo(
    () => ({
      lambdaNm: model.lambdaNm,
      waistW: model.waistW,
      waistZ: model.waistZ,
      powerW: probe.powerW,
      coupling: model.coupling,
      probeZ,
      probeW: probe.wMetres,
      probeR: probe.Rmetres,
      probePowerW: probe.powerW,
      elementCount: bench.elements.length,
    }),
    [model, probe, probeZ, bench.elements.length],
  );

  const selectExperiment = useCallback((id: ExperimentId) => {
    const next = experimentById(id).build();
    setExperimentId(id);
    setBench(next);
    setSelectedId(next.elements[0]?.id ?? null);
    setPlacingType(null);
    setProbeZ(0.07);
  }, []);

  const moveElement = useCallback((id: string, zMetres: number) => {
    setBench((current) => set_position(current, id, zMetres));
  }, []);

  const place = useCallback((type: string, zMetres: number) => {
    const item = CATALOG.find((entry) => entry.type === type);
    if (item === undefined) return;
    setBench((current) => {
      const next = add_element(current, { type, position: zMetres, params: item.params });
      setSelectedId(next.elements[next.elements.length - 1]?.id ?? null);
      return next;
    });
    setPlacingType(null);
  }, []);

  const addAtEnd = useCallback((type: string) => {
    const last = bench.elements.reduce((max, el) => Math.max(max, units.toM(el.position)), 0.02);
    const z = Math.min(Z_MAX, last + 0.025);
    place(type, z);
  }, [bench.elements, place]);

  const onCommit = useCallback(async () => {
    if (!dirty) return;
    const next = await commitLab(journal, {
      message: commitMessage,
      bench,
      results: liveResults,
    });
    setJournal(next);
    setCommitMessage('');
  }, [dirty, journal, commitMessage, bench, liveResults]);

  const onCheckout = useCallback((id: string) => {
    const restored = checkout(journal, id);
    setJournal(restored.journal);
    setBench(restored.bench);
    setProbeZ(restored.probeZ);
    setSelectedId(restored.bench.elements[0]?.id ?? null);
    setPlacingType(null);
  }, [journal]);

  const onExport = useCallback(() => {
    const blob = new Blob([exportJournal(journal)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${journal.name.replaceAll(/\s+/g, '-').toLowerCase() || 'lab'}.optics.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [journal]);

  const onImport = useCallback(async (file: File) => {
    const text = await file.text();
    const next = importJournal(text);
    setJournal(next);
    if (next.head !== null) {
      const restored = checkout(next, next.head);
      setJournal(restored.journal);
      setBench(restored.bench);
      setProbeZ(restored.probeZ);
      setSelectedId(restored.bench.elements[0]?.id ?? null);
    }
  }, []);

  return (
    <main className={`lab${placingType !== null ? ' placing' : ''}`}>
      <LabCanvas
        model={model}
        elements={bench.elements}
        selectedId={selectedId}
        placingType={placingType}
        probeZ={probeZ}
        layers={layers}
        cameraPreset={cameraPreset}
        onSelect={setSelectedId}
        onMove={moveElement}
        onPlace={place}
        onProbeZ={setProbeZ}
      />
      <LabOverlay
        experimentId={experimentId}
        bench={bench}
        model={model}
        selectedId={selectedId}
        placingType={placingType}
        probeZ={probeZ}
        journal={journal}
        dirty={dirty}
        commitMessage={commitMessage}
        liveResults={liveResults}
        onExperiment={selectExperiment}
        onSelect={setSelectedId}
        onPlaceType={(type) => setPlacingType((current) => (current === type ? null : type))}
        onAdd={addAtEnd}
        onRemove={() => {
          if (selectedId === null) return;
          setBench((current) => remove_element(current, selectedId));
          setSelectedId(null);
        }}
        onMove={moveElement}
        onParam={(id, param, value) => setBench((current) => set_parameter(current, id, param, value))}
        onSave={() => void onCommit()}
        onRestore={onCheckout}
        onCommitMessage={setCommitMessage}
        onRename={(name) => setJournal(renameLab(journal, name))}
        onExport={onExport}
        onImport={(file) => void onImport(file)}
        layers={layers}
        cameraPreset={cameraPreset}
        onLayer={(key) => setLayers((current) => ({ ...current, [key]: !current[key] }))}
        onCamera={setCameraPreset}
      />
    </main>
  );
}
