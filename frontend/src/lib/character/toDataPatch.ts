// Delta-only PATCH payload emitter for CharacterConfig fields. Honors the
// shallow-merge null-sentinel contract documented in client.ts:182–205:
//   - Changed fields → emit new value (D-13)
//   - Cleared fields (prev had value, next does not) → emit null (D-14)
//     (NOT undefined — JSON.stringify drops undefined silently)
//   - Unchanged fields → omit entirely (D-15)
// Non-character keys (mediaId, aiBrief, prompt, etc.) are not in
// CharacterConfig and therefore can NEVER appear in the output (D-16).
import type { DataPatch } from "../../api/client";
import type { CharacterConfig } from "./schema";

// Produce a delta-only DataPatch from wizard state changes.
// `next` is the new field values; `prev` is the previous field values.
// Only CharacterConfig keys are ever iterated — this function cannot
// accidentally include unrelated node.data fields like mediaId or aiBrief.
export function toCharacterDataPatch(
  next: Partial<CharacterConfig>,
  prev: Partial<CharacterConfig>,
): DataPatch {
  const patch: DataPatch = {};
  const keys = new Set([
    ...Object.keys(next),
    ...Object.keys(prev),
  ]) as Set<keyof CharacterConfig>;

  for (const key of keys) {
    const nextVal = next[key];
    const prevVal = prev[key];

    // Unchanged — omit (D-15)
    if (nextVal === prevVal) continue;

    if (nextVal !== undefined && nextVal !== "") {
      // Changed to a new non-empty value (D-13)
      patch[key] = nextVal;
    } else if (prevVal !== undefined && prevVal !== "") {
      // Field was cleared — emit null sentinel so the backend
      // shallow-merge removes the key from the JSON column (D-14).
      // NEVER emit undefined here: JSON.stringify drops it silently.
      patch[key] = null;
    }
    // Both empty/undefined — no prior value existed; omit
  }

  return patch;
}
