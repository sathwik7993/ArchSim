import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Phase 9 — AI evaluation settings (bring-your-own Google Gemini key).
// The key lives only in the browser; it's sent per-request to our backend proxy
// which forwards it to the Gemini API and never stores it.
// ---------------------------------------------------------------------------

const KEY = 'archsim.gemini.key';
const MODEL = 'archsim.gemini.model';

export interface GeminiModel {
  id: string;
  label: string;
  note: string;
}

// Free-tier Gemini models (Google AI Studio). The user can also type any id.
export const GEMINI_MODELS: GeminiModel[] = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', note: 'Fast & reliable — recommended' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Stable fallback' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', note: 'Fastest, lighter' },
];

export const DEFAULT_MODEL = 'gemini-3.5-flash';

function read(key: string, fallback: string): string {
  if (typeof localStorage === 'undefined') return fallback;
  return localStorage.getItem(key) ?? fallback;
}
function write(key: string, value: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

interface AiSettingsState {
  apiKey: string;
  model: string;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  hasKey: () => boolean;
}

export const useAiSettings = create<AiSettingsState>((set, get) => ({
  apiKey: read(KEY, ''),
  model: read(MODEL, DEFAULT_MODEL),
  setApiKey: (k) => {
    write(KEY, k.trim());
    set({ apiKey: k.trim() });
  },
  setModel: (m) => {
    const model = m.trim() || DEFAULT_MODEL;
    write(MODEL, model);
    set({ model });
  },
  hasKey: () => get().apiKey.trim().length > 0,
}));
