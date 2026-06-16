// Pure idempotent convert-on-read migration for legacy charCountry → charEthnicity.
// Runs in loadInitialBoard and switchBoard hydration paths — NEVER writes to the
// backend (D-21, MIGRATE-01). charCountry is preserved on the returned object;
// Phase 7 (MIGRATE-02) handles its removal. Import CHARACTER_COUNTRIES here only —
// this is the Phase 5 sole importer of that constant (Phase 7 deletes it).
import { CHARACTER_COUNTRIES } from "../../constants/character";
import type { FlowboardNodeData } from "../../store/board";

// Build lookup from CHARACTER_COUNTRIES to stay in sync if the constants
// array ever adds entries. Phase 7 (MIGRATE-02) deletes CHARACTER_COUNTRIES —
// at that point this import moves to an inline map.
// Produces: { vn: "Vietnamese", jp: "Japanese", kr: "Korean", cn: "Chinese",
//             th: "Thai", us: "American", fr: "French" }
export const LEGACY_COUNTRY_TO_ETHNICITY: Record<string, string> = Object.fromEntries(
  CHARACTER_COUNTRIES.map((c) => [c.key, c.tag]),
);

// Migrate a single node's data from the v1.0 charCountry key to the v1.1
// charEthnicity key. Pure, idempotent, no side effects (D-22).
export function migrateCharacterNodeData(
  data: FlowboardNodeData,
): FlowboardNodeData {
  // Idempotency guard (D-22): if charEthnicity is already set, the node
  // is already migrated — skip to prevent double-execution from StrictMode
  // double-mount or repeated hydration calls.
  if (data.charEthnicity) return data;

  // No legacy charCountry present — nothing to migrate (handles non-character
  // nodes like video, image, storyboard that never had charCountry).
  if (!data.charCountry) return data;

  const mapped = LEGACY_COUNTRY_TO_ETHNICITY[data.charCountry];

  // Unknown charCountry key (not in the 7-key set) — leave node as-is (D-19).
  if (!mapped) return data;

  // Return a new object (never mutate the input — D-22).
  // charCountry is intentionally left on the returned object — the backend
  // row still carries it; Phase 7 (MIGRATE-02) handles deletion.
  return { ...data, charEthnicity: mapped };
}
