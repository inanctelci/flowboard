import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../../lib/character/schema";

interface StepProps {
  config: Partial<CharacterConfig>;
  onChange(next: Partial<CharacterConfig>): void;
}

// Constant lookup table — no dynamic key construction (D-19, grep gate).
// Keys are the stable English identifiers stored on node.data (D-20);
// display labels come from i18n at render time.
const VIBE_OPTIONS = [
  { key: "clean", i18nKey: "wizard.field.vibe.option.clean" },
  { key: "douyin", i18nKey: "wizard.field.vibe.option.douyin" },
  { key: "oldmoney", i18nKey: "wizard.field.vibe.option.oldmoney" },
  { key: "coldgirl", i18nKey: "wizard.field.vibe.option.coldgirl" },
  { key: "kpop", i18nKey: "wizard.field.vibe.option.kpop" },
  { key: "casual", i18nKey: "wizard.field.vibe.option.casual" },
] as const;

export function StepStyling({ config, onChange }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="char-wizard__step">
      {/* Vibe */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.vibe.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.vibe.label")}
        >
          {VIBE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charVibe === opt.key}
              className={`aspect-chip${config.charVibe === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({ charVibe: config.charVibe === opt.key ? undefined : opt.key })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Outfit Hint (free-text) */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.outfit.label")}</span>
        <input
          type="text"
          className="gen-dialog__textarea"
          placeholder={t("wizard.field.outfit.placeholder")}
          value={config.charOutfit ?? ""}
          onChange={(e) =>
            onChange({ charOutfit: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}
