import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../../lib/character/schema";
import { buildCharacterPrompt } from "../../../lib/character/buildCharacterPrompt";
import { useCharacterPresetsStore } from "../../../store/characterPresets";

interface StepReviewProps {
  config: Partial<CharacterConfig>;
}

export function StepReview({ config }: StepReviewProps) {
  const { t } = useTranslation();
  const addPreset = useCharacterPresetsStore((s) => s.addPreset);

  const [saveName, setSaveName] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    };
  }, []);

  const promptText = buildCharacterPrompt(config);
  const hasPromptContent = !!config.charGender || !!config.charEthnicity || !!config.charVibe
    || !!config.charAge || !!config.charHairColor || !!config.charHairStyle
    || !!config.charSkinTone || !!config.charOutfit || !!config.charExpression
    || !!config.charExtras;

  function handleSave() {
    if (saveFlash) return;
    addPreset(saveName, config as CharacterConfig);
    // Show success flash for 1200ms
    setSaveFlash(true);
    setSaveName("");
    flashTimer.current = setTimeout(() => {
      setSaveFlash(false);
      flashTimer.current = null;
    }, 1200);
  }

  return (
    <div className="char-wizard__step">
      {/* Prompt preview */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.review.prompt_preview_label")}</span>
        {hasPromptContent ? (
          <div
            className="char-wizard__prompt-preview"
            aria-label={t("wizard.review.prompt_preview_aria")}
            aria-readonly="true"
          >
            {promptText}
          </div>
        ) : (
          <div className="char-wizard__prompt-preview">
            <span className="char-wizard__prompt-empty">
              {t("wizard.review.prompt_empty")}
            </span>
          </div>
        )}
        {hasPromptContent && (
          <p className="gen-dialog__hint">{t("wizard.review.prompt_hint")}</p>
        )}
      </div>

      {/* Save as preset */}
      <div className="gen-dialog__field">
        <div className="char-wizard__save-row">
          <input
            type="text"
            className="char-wizard__save-input"
            placeholder={t("wizard.preset.save_name_placeholder")}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            maxLength={60}
          />
          {saveFlash ? (
            <span className="char-wizard__save-flash">{t("wizard.preset.saved_flash")}</span>
          ) : (
            <button
              type="button"
              className="char-wizard__save-btn"
              onClick={handleSave}
              disabled={!hasPromptContent}
            >
              {t("wizard.preset.save_btn")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
