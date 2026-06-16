import { useTranslation } from "react-i18next";
import type { CharacterConfig } from "../../../lib/character/schema";

interface StepProps {
  config: Partial<CharacterConfig>;
  onChange(next: Partial<CharacterConfig>): void;
}

// Constant lookup table — no dynamic key construction (D-19, grep gate).
const GENDER_OPTIONS = [
  { key: "male", i18nKey: "wizard.field.gender.option.male" },
  { key: "female", i18nKey: "wizard.field.gender.option.female" },
  { key: "nonbinary", i18nKey: "wizard.field.gender.option.nonbinary" },
] as const;

const ETHNICITY_OPTIONS = [
  { key: "east-asian", i18nKey: "wizard.field.ethnicity.option.east_asian" },
  { key: "southeast-asian", i18nKey: "wizard.field.ethnicity.option.southeast_asian" },
  { key: "south-asian", i18nKey: "wizard.field.ethnicity.option.south_asian" },
  { key: "middle-eastern", i18nKey: "wizard.field.ethnicity.option.middle_eastern" },
  { key: "african", i18nKey: "wizard.field.ethnicity.option.african" },
  { key: "latin", i18nKey: "wizard.field.ethnicity.option.latin" },
  { key: "caucasian", i18nKey: "wizard.field.ethnicity.option.caucasian" },
  { key: "mixed", i18nKey: "wizard.field.ethnicity.option.mixed" },
] as const;

// Ethnicity bucket keys — the chip selection sets charEthnicity to these
// stable English strings stored on node.data. Free-text override clears the
// chip selection and stores the user's typed prose instead (D-20).
const ETHNICITY_BUCKET_KEYS: ReadonlySet<string> = new Set(ETHNICITY_OPTIONS.map((o) => o.key));

export function StepIdentity({ config, onChange }: StepProps) {
  const { t } = useTranslation();

  // Determine whether the current charEthnicity matches a bucket key
  // or is a free-text override.
  const selectedBucket = config.charEthnicity && ETHNICITY_BUCKET_KEYS.has(config.charEthnicity)
    ? config.charEthnicity
    : null;
  const freeTextEthnicity = config.charEthnicity && !ETHNICITY_BUCKET_KEYS.has(config.charEthnicity)
    ? config.charEthnicity
    : "";

  return (
    <div className="char-wizard__step">
      {/* Gender */}
      <div className="gen-dialog__field">
        <span className="gen-dialog__label">{t("wizard.field.gender.label")}</span>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.gender.label")}
        >
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={config.charGender === opt.key}
              className={`aspect-chip${config.charGender === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() =>
                onChange({
                  charGender: config.charGender === opt.key ? undefined : opt.key,
                })
              }
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Ethnicity */}
      <div className="gen-dialog__field">
        <div className="gen-dialog__label-row">
          <span className="gen-dialog__label">
            {t("wizard.field.ethnicity.label")}
            <span
              className="char-wizard__info-tip"
              title={t("wizard.field.ethnicity.info_tip")}
            >
              {" "}ⓘ
            </span>
          </span>
        </div>
        <div
          className="aspect-chip-row"
          role="group"
          aria-label={t("wizard.field.ethnicity.label")}
        >
          {ETHNICITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={selectedBucket === opt.key}
              className={`aspect-chip${selectedBucket === opt.key ? " aspect-chip--active" : ""}`}
              onClick={() => {
                if (selectedBucket === opt.key) {
                  onChange({ charEthnicity: undefined });
                } else {
                  onChange({ charEthnicity: opt.key });
                }
              }}
            >
              {t(opt.i18nKey)}
            </button>
          ))}
        </div>
        <span className="gen-dialog__label" style={{ marginTop: 8, display: "block" }}>
          {t("wizard.field.ethnicity.free_text_label")}
        </span>
        <input
          type="text"
          className="gen-dialog__textarea"
          aria-label={t("wizard.field.ethnicity.free_text_aria")}
          placeholder={t("wizard.field.ethnicity.free_text_placeholder")}
          value={freeTextEthnicity}
          disabled={selectedBucket !== null}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ charEthnicity: v || undefined });
          }}
          style={selectedBucket !== null ? { opacity: 0.4, pointerEvents: "none" } : {}}
        />
      </div>
    </div>
  );
}
