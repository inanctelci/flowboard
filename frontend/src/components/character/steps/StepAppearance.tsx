import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../../lib/character/schema";

interface StepProps {
  config: Partial<CharacterConfig>;
  onChange(next: Partial<CharacterConfig>): void;
}

// Constant lookup tables — no dynamic key construction (D-19, grep gate).
const AGE_OPTIONS = [
  { key: "teenager", i18nKey: "wizard.field.age.option.teenager" },
  { key: "young-adult", i18nKey: "wizard.field.age.option.young_adult" },
  { key: "adult", i18nKey: "wizard.field.age.option.adult" },
  { key: "middle-aged", i18nKey: "wizard.field.age.option.middle_aged" },
  { key: "mature", i18nKey: "wizard.field.age.option.mature" },
  { key: "senior", i18nKey: "wizard.field.age.option.senior" },
] as const;

const HAIR_COLOR_OPTIONS = [
  { key: "black", i18nKey: "wizard.field.hair_color.option.black" },
  { key: "brown", i18nKey: "wizard.field.hair_color.option.brown" },
  { key: "blonde", i18nKey: "wizard.field.hair_color.option.blonde" },
  { key: "red", i18nKey: "wizard.field.hair_color.option.red" },
  { key: "silver", i18nKey: "wizard.field.hair_color.option.silver" },
  { key: "custom", i18nKey: "wizard.field.hair_color.option.custom" },
] as const;

const HAIR_STYLE_OPTIONS = [
  { key: "long-straight", i18nKey: "wizard.field.hair_style.option.long_straight" },
  { key: "long-wavy", i18nKey: "wizard.field.hair_style.option.long_wavy" },
  { key: "short-bob", i18nKey: "wizard.field.hair_style.option.short_bob" },
  { key: "updo", i18nKey: "wizard.field.hair_style.option.updo" },
  { key: "loose-bun", i18nKey: "wizard.field.hair_style.option.loose_bun" },
  { key: "braids", i18nKey: "wizard.field.hair_style.option.braids" },
  { key: "natural", i18nKey: "wizard.field.hair_style.option.natural" },
  { key: "short-cropped", i18nKey: "wizard.field.hair_style.option.short_cropped" },
] as const;

const SKIN_TONE_OPTIONS = [
  { key: "fair", i18nKey: "wizard.field.skin_tone.option.fair" },
  { key: "light", i18nKey: "wizard.field.skin_tone.option.light" },
  { key: "medium", i18nKey: "wizard.field.skin_tone.option.medium" },
  { key: "tan", i18nKey: "wizard.field.skin_tone.option.tan" },
  { key: "deep", i18nKey: "wizard.field.skin_tone.option.deep" },
  { key: "dark", i18nKey: "wizard.field.skin_tone.option.dark" },
] as const;

export function StepAppearance({ config, onChange }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="char-wizard__step">
      {/* Age Range */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.age.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.age.label")}
        >
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charAge === opt.key}
              className={`aspect-chip${config.charAge === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({ charAge: config.charAge === opt.key ? undefined : opt.key })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Color */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.hair_color.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.hair_color.label")}
        >
          {HAIR_COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charHairColor === opt.key}
              className={`aspect-chip${config.charHairColor === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({
                  charHairColor: config.charHairColor === opt.key ? undefined : opt.key,
                })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Style */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.hair_style.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.hair_style.label")}
        >
          {HAIR_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charHairStyle === opt.key}
              className={`aspect-chip${config.charHairStyle === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({
                  charHairStyle: config.charHairStyle === opt.key ? undefined : opt.key,
                })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Skin Tone */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.skin_tone.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.skin_tone.label")}
        >
          {SKIN_TONE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charSkinTone === opt.key}
              className={`aspect-chip${config.charSkinTone === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({
                  charSkinTone: config.charSkinTone === opt.key ? undefined : opt.key,
                })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
