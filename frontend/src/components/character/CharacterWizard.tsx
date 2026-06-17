import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../lib/character/schema";
import { buildCharacterPrompt } from "../../lib/character/buildCharacterPrompt";
import { toCharacterDataPatch } from "../../lib/character/toDataPatch";
import { useBoardStore } from "../../store/board";
import { useGenerationStore } from "../../store/generation";
import { patchNode } from "../../api/client";
import { PresetList } from "./PresetList";
import { StepIdentity } from "./steps/StepIdentity";
import { StepAppearance } from "./steps/StepAppearance";
import { StepStyling } from "./steps/StepStyling";
import { StepExpression } from "./steps/StepExpression";
import { StepReview } from "./steps/StepReview";

interface CharacterWizardProps {
  rfId: string;
  onDone(): void;
}

// Step indices:
//   1 = Identity, 2 = Appearance, 3 = Styling, 4 = Expression, 5 = Review
type WizardStep = 1 | 2 | 3 | 4 | 5;

// Step tab descriptor — constant table per D-19.
const STEPS: Array<{ step: WizardStep; i18nKey: string }> = [
  { step: 1, i18nKey: "wizard.step.identity" },
  { step: 2, i18nKey: "wizard.step.appearance" },
  { step: 3, i18nKey: "wizard.step.styling" },
  { step: 4, i18nKey: "wizard.step.expression" },
  { step: 5, i18nKey: "wizard.step.review" },
];

export function CharacterWizard({ rfId, onDone }: CharacterWizardProps) {
  const { t } = useTranslation();
  const dispatchGeneration = useGenerationStore((s) => s.dispatchGeneration);

  // Step 0 (Presets) is rendered as the preset shelf above step tabs.
  // Steps 1-5 are the wizard steps.
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Wizard field state — lazy-seeded from the node's current data on first open
  // (so v1.0 boards with migrated char* fields pre-fill the wizard — ROADMAP SC-5).
  // Discard-on-cancel (WIZARD-05, D-03) is preserved by React unmounting the
  // component on ESC / close — no module-level draft cache is kept across reopens.
  const [config, setConfig] = useState<Partial<CharacterConfig>>(() => {
    const node = useBoardStore.getState().nodes.find((n) => n.id === rfId);
    const d = node?.data;
    if (!d) return {};
    return {
      charGender: d.charGender,
      charEthnicity: d.charEthnicity,
      charAge: d.charAge,
      charHair: d.charHair,
      charHairColor: d.charHairColor,
      charHairStyle: d.charHairStyle,
      charSkinTone: d.charSkinTone,
      charVibe: d.charVibe,
      charOutfit: d.charOutfit,
      charExpression: d.charExpression,
      charLighting: d.charLighting,
      charExtras: d.charExtras,
    };
  });

  // Merge a partial update into the config (clone-then-edit pattern).
  function handleChange(patch: Partial<CharacterConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    // Any field change de-selects the loaded preset (clone-then-edit, D-11).
    setSelectedPresetId(null);
  }

  // Load preset: populate all fields and jump to Review.
  function handleLoadPreset(presetId: string, presetConfig: Partial<CharacterConfig>) {
    setConfig({ ...presetConfig });
    setSelectedPresetId(presetId);
    setStep(5);
  }

  // Start over: clear all fields, return to step 1.
  function handleStartOver() {
    setConfig({});
    setSelectedPresetId(null);
    setStep(1);
  }

  // canGenerate: at least one of ethnicity, vibe, or extras is set.
  // Mirrors existing GenerationDialog:761-766 minimal gate.
  const canGenerate =
    (config.charEthnicity?.trim().length ?? 0) > 0 ||
    (config.charVibe?.trim().length ?? 0) > 0 ||
    (config.charExtras?.trim().length ?? 0) > 0;

  async function handleSubmit() {
    // 1. Build prompt via the locked assembler (Pitfall #4 guardrail).
    const promptString = buildCharacterPrompt(config);

    // 2. Get current node data for delta calculation.
    const node = useBoardStore.getState().nodes.find((n) => n.id === rfId);
    const prevData = node?.data ?? {};

    // 3. Compute delta — MUST use toCharacterDataPatch, never raw data: {} write.
    const delta = toCharacterDataPatch(config as CharacterConfig, prevData);

    // 4. Persist only the delta (null-sentinel contract honored).
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId) && Object.keys(delta).length > 0) {
      useBoardStore.getState().updateNodeData(rfId, delta);
      patchNode(dbId, { data: delta }).catch(() => {});
    }

    // 5. Dispatch generation — unchanged boundary (D-02).
    // Character nodes default to square aspect ratio.
    dispatchGeneration(rfId, {
      prompt: promptString,
      aspectRatio: "IMAGE_ASPECT_RATIO_SQUARE",
      variantCount: 1,
    });

    // 6. Close dialog — ESC/Cancel already calls onDone() directly.
    onDone();
  }

  return (
    <div>
      {/* Preset shelf — shown regardless of step (above step tabs) */}
      <PresetList
        onLoad={(presetConfig) => {
          // Find the preset ID from the config passed back.
          // We use a callback pattern: PresetList passes config;
          // CharacterWizard assigns ID separately via the selectedPresetId state.
          handleLoadPreset("", presetConfig);
        }}
        selectedPresetId={selectedPresetId}
      />

      {/* Step tabs */}
      <div
        className="char-wizard__tabs"
        role="tablist"
        aria-label={t("wizard.tabs_aria_label")}
      >
        {STEPS.map(({ step: s, i18nKey }) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={step === s}
            aria-controls={`char-wizard-step-${s}`}
            className={`char-wizard__tab${step === s ? " char-wizard__tab--active" : ""}`}
            onClick={() => setStep(s)}
          >
            {t(i18nKey)}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div
        id={`char-wizard-step-${step}`}
        role="tabpanel"
        aria-labelledby={`char-wizard-tab-${step}`}
      >
        {step === 1 && (
          <StepIdentity config={config} onChange={handleChange} />
        )}
        {step === 2 && (
          <StepAppearance config={config} onChange={handleChange} />
        )}
        {step === 3 && (
          <StepStyling config={config} onChange={handleChange} />
        )}
        {step === 4 && (
          <StepExpression config={config} onChange={handleChange} />
        )}
        {step === 5 && (
          <StepReview config={config} />
        )}
      </div>

      {/* Navigation footer (Back / Next) + Start over */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div className="char-wizard__nav">
          {step > 1 && (
            <button
              type="button"
              className="char-wizard__nav-btn"
              onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)}
            >
              {t("wizard.back_btn")}
            </button>
          )}
          {step < 5 && (
            <button
              type="button"
              className="char-wizard__nav-btn"
              onClick={() => setStep((s) => Math.min(5, s + 1) as WizardStep)}
            >
              {t("wizard.next_btn")}
            </button>
          )}
        </div>
        <button
          type="button"
          className="char-wizard__start-over"
          onClick={handleStartOver}
        >
          {t("wizard.start_over")}
        </button>
      </div>

      {/* Generate button */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        {!canGenerate && (
          <p className="gen-dialog__hint" style={{ color: "var(--muted)", fontSize: 11 }}>
            {t("wizard.can_generate_hint")}
          </p>
        )}
        <button
          type="button"
          className="gen-dialog__cta"
          disabled={!canGenerate}
          onClick={handleSubmit}
        >
          {t("wizard.generate_cta")}
        </button>
      </div>
    </div>
  );
}
