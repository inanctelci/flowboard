// Locked prompt assembler for character reference images. Token order is
// frozen (D-10) — do not reshuffle. FRAMING_ANCHORS are FROZEN — do not
// parameterize. Unset fields contribute zero tokens (.filter(Boolean), D-11).
// Token delimiter is ", " (D-12). Call buildCharacterPrompt() with any
// partial CharacterConfig; it always returns a non-empty string.
import type { CharacterConfig } from "./schema";
import { CHARACTER_VIBES } from "../../constants/character";

// Framing anchors are FROZEN — do not parameterize. Appended after
// styling tokens but before negative constraints so diffusion models
// weight them as corrective constraints, not style descriptors. These
// anchors appear verbatim in the v1.0 buildCharacterPrompt and must
// survive the v1.1 refactor unchanged for generation parity.
export const FRAMING_ANCHORS: readonly string[] = [
  "head and shoulders framing, centered composition, sharp focus on face",
  "strictly front-on orientation, no head tilt, no head turn, no profile angle, no three-quarter view, no over-the-shoulder pose",
  "no glasses, no hat, no mask, no occlusion, nothing covering the face",
  "photorealistic, ultra-detailed, consistent character reference",
] as const;

// Age-to-prompt-token mapping. Raw age keys map to English descriptors
// that read naturally in the assembled prompt (e.g. "teenage" not "teenager").
const AGE_TOKENS: Record<string, string> = {
  "teenager": "teenage",
  "young-adult": "young adult",
  "adult": "adult",
  "middle-aged": "middle-aged",
  "mature": "mature",
  "senior": "elderly",
};

// Resolve vibe tokens from the CHARACTER_VIBES constant. Returns the
// 4-element token array for a known vibe key, or an empty array for
// unknown / unset vibes — no error, no fallback to a default vibe.
function resolveVibeTokens(vibe: string | undefined): readonly string[] {
  if (!vibe) return [];
  return CHARACTER_VIBES.find((v) => v.key === vibe)?.tokens ?? [];
}

// Assemble a deterministic character prompt from any partial CharacterConfig.
// Implements the locked D-10 token order:
//   subject anchor → pose anchors → hair → skin → outfit → vibe tokens
//   → expression → lighting → extras → FRAMING_ANCHORS
// Returns a non-empty string for any input, including {}.
export function buildCharacterPrompt(config: Partial<CharacterConfig>): string {
  // 1. Subject anchor — ethnicity + age + gender combined
  const descriptors = [
    config.charEthnicity,
    config.charAge ? (AGE_TOKENS[config.charAge] ?? config.charAge) : undefined,
    config.charGender,
  ].filter(Boolean);
  const subject = descriptors.join(" ") || "person";
  const subjectAnchor = `Studio portrait headshot of a ${subject} character`;

  // 2. Pose anchors (hardcoded — matches v1.0 exactly)
  const poseAnchor1 =
    "subject directly faces the camera, head perfectly straight with zero tilt and zero turn";
  const poseAnchor2 =
    "shoulders square to camera, axially symmetric pose, nose centered, both eyes equally visible at the same height";

  // 3. Appearance tokens
  const hairToken = config.charHair ?? null;
  const skinToken = config.charSkinTone ? `${config.charSkinTone} skin` : null;
  const outfitToken = config.charOutfit ?? null;

  // 4. Vibe tokens (multi-clause arrays spread inline)
  const vibeTokens = resolveVibeTokens(config.charVibe);

  // 5. Expression
  const expressionToken = config.charExpression ?? null;

  // 6. Lighting
  const lightingToken = config.charLighting ?? null;

  // 7. Extras
  const extrasToken = config.charExtras?.trim() || null;

  // Assemble in locked D-10 order and filter out null/undefined/empty:
  const tokens = [
    subjectAnchor,
    poseAnchor1,
    poseAnchor2,
    hairToken,
    skinToken,
    outfitToken,
    ...vibeTokens,
    expressionToken,
    lightingToken,
    extrasToken,
    ...FRAMING_ANCHORS,
  ].filter(Boolean) as string[];

  return tokens.join(", ");
}
