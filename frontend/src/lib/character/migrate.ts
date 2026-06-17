// Pure idempotent convert-on-read migration for legacy character node data.
// Runs in loadInitialBoard, switchBoard, and refreshBoardState hydration paths
// — NEVER writes to the backend (D-21, MIGRATE-01). charCountry is preserved on
// the returned object; Phase 7 (MIGRATE-02) handles its removal.
//
// Migration steps (in order):
//   Step 1: charCountry → charEthnicity (Phase 5 MIGRATE-01)
//   Step 2: charHair composite → charHairColor + charHairStyle (Phase 6 D-14)
import type { FlowboardNodeData } from "../../store/board";

/**
 * Legacy charCountry codes (v1.0 schema) → English ethnicity-bucket strings.
 * Inlined from the (deleted) constants/character.ts CHARACTER_COUNTRIES map.
 * Used by migrateCharacterNodeData() to populate charEthnicity on hydration
 * of pre-v1.1 boards. Locked at 7 entries — no future codes will be added.
 */
export const LEGACY_COUNTRY_TO_ETHNICITY: Record<string, string> = {
  vn: "Vietnamese",
  jp: "Japanese",
  kr: "Korean",
  cn: "Chinese",
  th: "Thai",
  us: "American",
  fr: "French",
};

// Migrate a single node's data applying all v1.1 convert-on-read migrations.
// Pure, idempotent, no side effects (D-22).
export function migrateCharacterNodeData(
  data: FlowboardNodeData,
): FlowboardNodeData {
  let result = data;

  // Step 1: charCountry → charEthnicity (Phase 5 MIGRATE-01).
  // Idempotency guard: if charEthnicity is already set, the node
  // has already been migrated — skip to prevent double-execution from
  // StrictMode double-mount or repeated hydration calls.
  if (!result.charEthnicity && result.charCountry) {
    const mapped = LEGACY_COUNTRY_TO_ETHNICITY[result.charCountry];
    // Unknown charCountry key (not in the 7-key set) — leave as-is (D-19).
    if (mapped) {
      // charCountry is intentionally left on the returned object — the backend
      // row still carries it; Phase 7 (MIGRATE-02) handles deletion.
      result = { ...result, charEthnicity: mapped };
    }
  }

  // Step 2 (Phase 6 D-14): decompose charHair composite → charHairColor + charHairStyle.
  // Idempotency guard: skip if either new key is already set.
  // Single-word value → treat as color only. Multi-word → first word is color,
  // rest is style. charHair is intentionally retained (Phase 7 removes it).
  if (result.charHair && !result.charHairColor && !result.charHairStyle) {
    const spaceIdx = result.charHair.indexOf(" ");
    if (spaceIdx === -1) {
      result = { ...result, charHairColor: result.charHair };
    } else {
      result = {
        ...result,
        charHairColor: result.charHair.slice(0, spaceIdx),
        charHairStyle: result.charHair.slice(spaceIdx + 1),
      };
    }
  }

  return result;
}
