import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../../lib/character/schema";

interface StepProps {
  config: Partial<CharacterConfig>;
  onChange(next: Partial<CharacterConfig>): void;
}

// Constant lookup table — no dynamic key construction (D-19, grep gate).
const EXPRESSION_OPTIONS = [
  { key: "neutral", i18nKey: "wizard.field.expression.option.neutral" },
  { key: "soft-smile", i18nKey: "wizard.field.expression.option.soft_smile" },
  { key: "confident", i18nKey: "wizard.field.expression.option.confident" },
  { key: "thoughtful", i18nKey: "wizard.field.expression.option.thoughtful" },
  { key: "custom", i18nKey: "wizard.field.expression.option.custom" },
] as const;

// When "custom" is selected, charExpression stores the free-text description
// instead of the key. "custom" itself is never stored on node.data.
const EXPRESSION_PRESET_KEYS: ReadonlySet<string> = new Set(
  EXPRESSION_OPTIONS.filter((o) => o.key !== "custom").map((o) => o.key),
);

export function StepExpression({ config, onChange }: StepProps) {
  const { t } = useTranslation();

  // Determine if we're in custom mode — either explicitly "custom" selected
  // or charExpression is a free-text value not matching any preset key.
  const selectedPreset = config.charExpression && EXPRESSION_PRESET_KEYS.has(config.charExpression)
    ? config.charExpression
    : null;
  const isCustomMode = config.charExpression !== undefined && selectedPreset === null;
  const customText = isCustomMode ? (config.charExpression ?? "") : "";

  return (
    <div className="char-wizard__step">
      {/* Expression */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.expression.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.expression.label")}
        >
          {EXPRESSION_OPTIONS.map((opt) => {
            const isActive =
              opt.key === "custom" ? isCustomMode : selectedPreset === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`aspect-chip${isActive ? " aspect-chip--active" : ""}`}
                onClick={() => {
                  if (opt.key === "custom") {
                    // Enter custom mode — clear preset, set expression to empty
                    // so the input appears and user can type
                    if (!isCustomMode) {
                      onChange({ charExpression: "" });
                    } else {
                      // Clicking custom again exits custom mode
                      onChange({ charExpression: undefined });
                    }
                  } else if (selectedPreset === opt.key) {
                    // Toggle-to-deselect (D-06)
                    onChange({ charExpression: undefined });
                  } else {
                    onChange({ charExpression: opt.key });
                  }
                }}
              >
                {t(opt.i18nKey)}
              </button>
            );
          })}
        </div>
        {isCustomMode && (
          <input
            type="text"
            className="gen-dialog__textarea"
            aria-label={t("wizard.field.expression.custom_aria")}
            placeholder={t("wizard.field.expression.custom_placeholder")}
            value={customText}
            onChange={(e) => onChange({ charExpression: e.target.value || "" })}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {/* Extras (free-text escape hatch, 200-char cap) */}
      <div className="gen-dialog__field">
        <div className="gen-dialog__label-row">
          <label className="gen-dialog__label" htmlFor="char-wizard-extras">
            {t("wizard.field.extras.label")}
          </label>
          {/* i18n: do-not-translate (character count format "N/200" — numeric) */}
          <span className="gen-dialog__char-count">{(config.charExtras ?? "").length}/200</span>
        </div>
        <textarea
          id="char-wizard-extras"
          className="gen-dialog__textarea"
          rows={2}
          maxLength={200}
          aria-label={t("wizard.field.extras.label")}
          placeholder={t("wizard.field.extras.placeholder")}
          value={config.charExtras ?? ""}
          onChange={(e) =>
            onChange({ charExtras: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}
