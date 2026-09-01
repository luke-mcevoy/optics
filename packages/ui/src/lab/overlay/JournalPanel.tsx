import { formatCurvature, formatMetres, formatPercent } from '../format.ts';
import type { LabCommit, LabJournal, LabResults } from '../journal.ts';

export function JournalPanel(props: {
  readonly journal: LabJournal;
  readonly dirty: boolean;
  readonly message: string;
  readonly live: LabResults;
  readonly onMessage: (value: string) => void;
  readonly onSave: () => void;
  readonly onRestore: (id: string) => void;
  readonly onRename: (name: string) => void;
  readonly onExport: () => void;
  readonly onImport: (file: File) => void;
}) {
  const numbered = props.journal.commits.map((commit, index) => ({ commit, n: index + 1 }));
  const newestFirst = [...numbered].reverse();
  const current = numbered.find((entry) => entry.commit.id === props.journal.head);

  return (
    <section className="section runs">
      <div className="section-title">
        <h2>Saved runs</h2>
        <input
          type="text"
          className="notebook-name"
          value={props.journal.name}
          aria-label="Notebook name"
          onChange={(event) => props.onRename(event.currentTarget.value)}
        />
      </div>

      <p className={props.dirty ? 'run-status unsaved' : 'run-status'}>
        {statusLine(props.dirty, current?.n ?? null)}
      </p>
      <p className="run-preview">{resultLine(props.live)}</p>

      <input
        type="text"
        className="text-input"
        placeholder="Optional note — what you tried"
        value={props.message}
        onChange={(event) => props.onMessage(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') props.onSave();
        }}
      />

      <button type="button" className="save-run" onClick={props.onSave} disabled={!props.dirty}>
        {props.journal.commits.length === 0 ? 'Save this run' : 'Save a new run'}
      </button>

      {newestFirst.length === 0 ? (
        <p className="hint">Saves the bench and the numbers above. Click a run later to put that setup back on the table.</p>
      ) : (
        <ol className="run-log">
          {newestFirst.map(({ commit, n }) => {
            const showing = commit.id === props.journal.head;
            return (
              <li key={commit.id}>
                <button
                  type="button"
                  className={showing ? 'run-row selected' : 'run-row'}
                  onClick={() => props.onRestore(commit.id)}
                >
                  <span className="run-head">
                    <span className="run-n">#{n}</span>
                    <span className="run-when">{formatWhen(commit.createdAt)}</span>
                    {showing ? <span className="run-tag">{props.dirty ? 'was this' : 'showing'}</span> : null}
                  </span>
                  {commit.message.length > 0 ? <span className="run-note">{commit.message}</span> : null}
                  <small>{resultLine(commit.results)}</small>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="run-files">
        <button type="button" onClick={props.onExport}>
          Download notebook
        </button>
        <label className="file-btn">
          Open notebook
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file !== undefined) props.onImport(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>
    </section>
  );
}

const statusLine = (dirty: boolean, current: number | null): string => {
  if (current === null) return 'Nothing saved yet.';
  if (dirty) return `Changed since run #${current}.`;
  return `Showing run #${current}.`;
};

const resultLine = (results: LabResults): string => {
  const parts = [`w₀ ${formatMetres(results.waistW)}`, `z_w ${formatMetres(results.waistZ)}`];
  if (results.coupling !== null) parts.push(`η ${formatPercent(results.coupling)}`);
  parts.push(`R ${formatCurvature(results.probeR)}`);
  return parts.join('  ·  ');
};

const formatWhen = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const delta = Date.now() - then;
  if (delta < 45_000) return 'just now';
  if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))} min ago`;
  if (delta < 86_400_000) return `${Math.max(1, Math.round(delta / 3_600_000))} h ago`;
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
