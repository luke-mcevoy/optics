import { deserializeBench, serializeBench } from '@optics/bench';
import type { Bench } from '@optics/bench';

export interface LabResults {
  readonly lambdaNm: number;
  readonly waistW: number;
  readonly waistZ: number;
  readonly powerW: number;
  readonly coupling: number | null;
  readonly probeZ: number;
  readonly probeW: number;
  readonly probeR: number;
  readonly probePowerW: number;
  readonly elementCount: number;
}

export interface LabCommit {
  readonly id: string;
  readonly parent: string | null;
  readonly createdAt: string;
  readonly message: string;
  readonly benchJson: string;
  readonly results: LabResults;
}

export interface LabJournal {
  readonly name: string;
  readonly head: string | null;
  readonly commits: readonly LabCommit[];
}

const STORAGE_KEY = 'optics:lab-journal:v1';

export const emptyJournal = (name = 'untitled lab'): LabJournal => ({
  name,
  head: null,
  commits: [],
});

export const loadJournal = (): LabJournal => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return emptyJournal();
    const parsed = JSON.parse(raw) as LabJournal;
    if (!Array.isArray(parsed.commits)) return emptyJournal();
    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'untitled lab',
      head: typeof parsed.head === 'string' ? parsed.head : null,
      commits: parsed.commits,
    };
  } catch {
    return emptyJournal();
  }
};

export const saveJournal = (journal: LabJournal): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
};

export const workingTree = (bench: Bench, probeZ: number): string =>
  JSON.stringify({ bench: JSON.parse(serializeBench(bench)), probeZ });

export const isDirty = (journal: LabJournal, bench: Bench, probeZ: number): boolean => {
  const head = journal.commits.find((commit) => commit.id === journal.head);
  if (head === undefined) return true;
  return serializeBench(bench) !== head.benchJson || Math.abs(probeZ - head.results.probeZ) > 1e-12;
};

export const commitLab = async (
  journal: LabJournal,
  input: { readonly message: string; readonly bench: Bench; readonly results: LabResults },
): Promise<LabJournal> => {
  const message = input.message.trim();
  const benchJson = serializeBench(input.bench);
  const payload = JSON.stringify({
    parent: journal.head,
    message,
    benchJson,
    results: input.results,
  });
  const id = await shortHash(payload);
  const commit: LabCommit = {
    id,
    parent: journal.head,
    createdAt: new Date().toISOString(),
    message,
    benchJson,
    results: input.results,
  };
  const next: LabJournal = {
    ...journal,
    head: id,
    commits: [...journal.commits, commit],
  };
  saveJournal(next);
  return next;
};

export const checkout = (journal: LabJournal, id: string): { journal: LabJournal; bench: Bench; probeZ: number } => {
  const commit = journal.commits.find((entry) => entry.id === id);
  if (commit === undefined) throw new Error(`unknown commit ${id}`);
  const next = { ...journal, head: id };
  saveJournal(next);
  return {
    journal: next,
    bench: deserializeBench(commit.benchJson),
    probeZ: commit.results.probeZ,
  };
};

export const renameLab = (journal: LabJournal, name: string): LabJournal => {
  const next = { ...journal, name: name.trim() || journal.name };
  saveJournal(next);
  return next;
};

export const exportJournal = (journal: LabJournal): string => JSON.stringify(journal, null, 2);

export const importJournal = (json: string): LabJournal => {
  const parsed = JSON.parse(json) as LabJournal;
  if (!Array.isArray(parsed.commits)) throw new Error('not a lab journal');
  const next: LabJournal = {
    name: typeof parsed.name === 'string' ? parsed.name : 'imported lab',
    head: typeof parsed.head === 'string' || parsed.head === null ? parsed.head : null,
    commits: parsed.commits,
  };
  saveJournal(next);
  return next;
};

const shortHash = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
};
