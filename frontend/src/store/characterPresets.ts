import { create } from "zustand";
import {
  PersistedPresetsSchema,
  type CharacterPreset,
  type CharacterConfig,
} from "../lib/character/schema";

// Hand-rolled localStorage persistence following the references.ts analog.
// DO NOT use zustand/middleware/persist — the codebase consistently hand-rolls
// localStorage helpers (PATTERNS confirmed, LIB-01 D-10 revised).
//
// The `error` slot holds an i18n key path (NOT a translated string) so the
// store stays locale-independent. Toaster calls t(error) at render time.

interface CharacterPresetsState {
  presets: CharacterPreset[];
  error: string | null;
  addPreset: (name: string, config: CharacterConfig) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  clearError: () => void;
}

const STORAGE_KEY = "flowboard.character.presets.v1";
const MAX_PRESETS = 50;

function loadPersisted(): { presets: CharacterPreset[]; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { presets: [], error: null };
    const parsed = PersistedPresetsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { presets: [], error: "wizard.error.preset_load_corrupt" };
    }
    return { presets: parsed.data.data, error: null };
  } catch {
    return { presets: [], error: "wizard.error.preset_load_corrupt" };
  }
}

function persist(presets: CharacterPreset[]): string | null {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, data: presets }),
    );
    return null;
  } catch {
    return "wizard.error.preset_save_failed";
  }
}

export const useCharacterPresetsStore = create<CharacterPresetsState>(
  (set, get) => {
    const initial = loadPersisted();
    return {
      presets: initial.presets,
      error: initial.error,

      addPreset: (name, config) => {
        const current = get().presets;
        if (current.length >= MAX_PRESETS) {
          set({ error: "wizard.error.preset_cap" });
          return;
        }
        const trimmedName = name.trim();
        if (!trimmedName) {
          set({ error: "wizard.error.preset_name_empty" });
          return;
        }
        const next: CharacterPreset = {
          // crypto.randomUUID() is available in all Chromium targets that
          // support MV3 (Chrome 88+). No fallback needed (A1).
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          name: trimmedName,
          createdAt: new Date().toISOString(),
          config,
        };
        const updated = [...current, next];
        const persistError = persist(updated);
        set({ presets: updated, error: persistError });
      },

      renamePreset: (id, name) => {
        if (!name.trim()) return; // empty rename reverts — UI handles it
        const updated = get().presets.map((p) =>
          p.id === id ? { ...p, name: name.trim() } : p,
        );
        const persistError = persist(updated);
        set({ presets: updated, error: persistError });
      },

      deletePreset: (id) => {
        const updated = get().presets.filter((p) => p.id !== id);
        const persistError = persist(updated);
        set({ presets: updated, error: persistError });
      },

      clearError: () => set({ error: null }),
    };
  },
);
