// Single source of truth for the character-builder data contract.
// All fields are optional by design — the wizard (Phase 6) enforces
// minimum-viable submission; the schema stays tolerant of partial blobs
// from localStorage. Values stored here are stable English keys or
// English prose — NEVER translated display labels (D-03); boards must
// be locale-independent. Use `.safeParse()` at every call boundary
// (D-07) — never let Zod throw to the React tree.
import { z } from "zod";

// Version sentinel — bump when CharacterConfig shape changes incompatibly.
// The persist middleware in Phase 6 uses this to gate migrations.
export const CHARACTER_CONFIG_VERSION = 1 as const;

// ── Closed enum types (suffix Key per project convention) ─────────────────

export type GenderKey = "male" | "female" | "nonbinary";

// Regional ethnicity buckets (8 regions). Free-text override uses the
// same charEthnicity field with a user-typed English string instead of
// one of these keys — the prompt assembler passes the value through as-is.
export type EthnicityKey =
  | "east-asian"
  | "southeast-asian"
  | "south-asian"
  | "middle-eastern"
  | "african"
  | "latin"
  | "caucasian"
  | "mixed";

// Age buckets mapping to discrete prompt tokens.
export type AgeKey =
  | "teenager"     // 13–17
  | "young-adult"  // 18–25
  | "adult"        // 26–35
  | "middle-aged"  // 36–50
  | "mature"       // 51–65
  | "senior";      // 65+

// Expression keys — peeled out of vibe tokens so expression is
// independently controllable without changing vibe styling.
export type ExpressionKey =
  | "neutral"
  | "soft-smile"
  | "confident"
  | "thoughtful"
  | "custom";    // wizard shows free-text input when this is selected

// Lighting keys — Phase 5 starter set; full decoupling from vibe tokens
// is deferred to a future milestone.
export type LightingKey =
  | "soft-daylight"
  | "studio"
  | "golden-hour"
  | "cinematic"
  | "low-key";

// ── Schema ────────────────────────────────────────────────────────────────

export const CharacterConfigSchema = z.object({
  // Identity
  charGender: z.string().optional(),         // GenderKey or free-text
  charEthnicity: z.string().optional(),      // EthnicityKey or free-text override
  charAge: z.string().optional(),            // AgeKey

  // Appearance
  charHair: z.string().optional(),           // composite: "long wavy black hair"
  charSkinTone: z.string().optional(),       // free-text: "fair", "tan", "deep"

  // Styling
  charVibe: z.string().optional(),           // VibeKey (from existing CHARACTER_VIBES)
  charOutfit: z.string().optional(),         // free-text

  // Expression / lighting
  charExpression: z.string().optional(),     // ExpressionKey or free-text (when "custom")
  charLighting: z.string().optional(),       // LightingKey or free-text

  // Escape hatch
  charExtras: z.string().max(200).optional(),  // 200-char cap per WIZARD-03
});

export type CharacterConfig = z.infer<typeof CharacterConfigSchema>;

// Versioned envelope for localStorage blobs (LIB-01 in Phase 6 will
// wire this into the persist middleware's `version` + `migrate` options).
export const VersionedCharacterConfigSchema = z.object({
  version: z.literal(CHARACTER_CONFIG_VERSION),
  data: CharacterConfigSchema,
});

export type VersionedCharacterConfig = z.infer<typeof VersionedCharacterConfigSchema>;
