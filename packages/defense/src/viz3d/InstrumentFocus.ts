import { createContext } from 'react';
import type { Instrument } from '../data/program.ts';
/** Visual emphasis only: never changes the shared instrument activity. */
export const InstrumentFocus = createContext<readonly Instrument[] | null>(null);
