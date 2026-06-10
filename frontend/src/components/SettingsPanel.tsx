import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGenerationStore } from "../store/generation";
import {
  useSettingsStore,
  type ImageModelKey,
  type VideoQuality,
} from "../store/settings";
import type { Locale } from "../i18n/i18n";
import { getLatestRelease, isNewerVersion, type LatestRelease } from "../api/github";
import packageJson from "../../package.json";

const APP_VERSION: string = packageJson.version;
const COMMUNITY_URL = "https://www.facebook.com/groups/flowkit.flowboard.community";

/**
 * Dashboard Settings popover anchored to the AccountPanel gear button.
 *
 * Surfaces the model context that drives every generation:
 *   - Paygate tier — auto-detected from Flow's createProject response,
 *     read-only (this isn't user-selectable, it's a fact of their plan).
 *   - Video quality — Veo 3.1 Lite / Fast / Quality, plus Ultra-only
 *     Lite Relaxed / Fast Relaxed (0-credit low-priority queue). Applies
 *     to BOTH portrait and landscape; backend resolves
 *     [tier][quality][aspect] → concrete Flow model key.
 *   - Image model — Banana Pro vs Banana 2 picker. Persisted to
 *     localStorage; every gen_image / edit_image dispatch reads it.
 */

// i18n: do-not-translate — brand model identifiers (Nano Banana Pro, Nano Banana 2)
const IMAGE_MODELS: { key: ImageModelKey; label: string; hintKey: string }[] = [
  {
    key: "NANO_BANANA_PRO",
    // i18n: do-not-translate — brand identifier
    label: "Nano Banana Pro",
    hintKey: "settings.nano_banana_pro_hint",
  },
  {
    key: "NANO_BANANA_2",
    // i18n: do-not-translate — brand identifier
    label: "Nano Banana 2",
    hintKey: "settings.nano_banana_2_hint",
  },
];

// Order: lite → fast → quality (paid), then the Ultra-only relaxed
// variants (0-credit low-priority queue). Lite/Fast/Quality are
// available on both Pro (Tier 1) and Ultra (Tier 2); the *_relaxed
// entries are Ultra-only — Pro users see them locked.
const VIDEO_QUALITIES: {
  key: VideoQuality;
  label: string;
  hintKey: string;
  ultraOnly: boolean;
}[] = [
  {
    key: "lite",
    // i18n: do-not-translate — brand identifier
    label: "Veo 3.1 Lite",
    hintKey: "settings.veo_lite_hint",
    ultraOnly: false,
  },
  {
    key: "fast",
    // i18n: do-not-translate — brand identifier
    label: "Veo 3.1 Fast",
    hintKey: "settings.veo_fast_hint",
    ultraOnly: false,
  },
  {
    key: "quality",
    // i18n: do-not-translate — brand identifier
    label: "Veo 3.1 Quality",
    hintKey: "settings.veo_quality_hint",
    ultraOnly: false,
  },
  {
    key: "lite_relaxed",
    // i18n: do-not-translate — brand identifier
    label: "Veo 3.1 Lite (Low Priority)",
    hintKey: "settings.veo_lite_relaxed_hint",
    ultraOnly: true,
  },
];

interface SettingsPanelProps {
  open: boolean;
  onClose(): void;
  // Provided by AccountPanel. Called when the user clicks "Sign out"
  // — AccountPanel owns the post-logout state reset (clear cached
  // profile, kick the /me poll). Pass undefined when no identity is
  // loaded (the button auto-hides in that case).
  onLogout?: () => Promise<void> | void;
  // True while the parent's logout call is in flight — disables the
  // button so a double-click doesn't fire two POSTs.
  logoutPending?: boolean;
}

// i18n: locale names — intentionally not translated (native names by convention)
const LOCALES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

export function SettingsPanel({ open, onClose, onLogout, logoutPending }: SettingsPanelProps) {
  const { t } = useTranslation();
  const tier = useGenerationStore((s) => s.paygateTier);
  const imageModel = useSettingsStore((s) => s.imageModel);
  const setImageModel = useSettingsStore((s) => s.setImageModel);
  const videoQuality = useSettingsStore((s) => s.videoQuality);
  const setVideoQuality = useSettingsStore((s) => s.setVideoQuality);
  const videoModel = useSettingsStore((s) => s.videoModel);
  const setVideoModel = useSettingsStore((s) => s.setVideoModel);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes (click-outside is handled by the backdrop's onClick).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Check GitHub for a newer release. Cached in sessionStorage by
  // the helper, so re-opening the dialog doesn't burn API quota.
  const [latestRelease, setLatestRelease] = useState<LatestRelease | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getLatestRelease().then((r) => {
      if (alive) setLatestRelease(r);
    });
    return () => {
      alive = false;
    };
  }, [open]);
  const updateAvailable =
    !!latestRelease?.tagName &&
    isNewerVersion(latestRelease.tagName, APP_VERSION);

  if (!open) return null;

  const tierLabel = tier === "PAYGATE_TIER_TWO"
    ? "Ultra"
    : tier === "PAYGATE_TIER_ONE"
      ? "Pro"
      : t("settings.tier_detecting");

  return (
    <div
      className="settings-panel-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.title")}
      >
        <div className="settings-panel__header">
          <span className="settings-panel__title">{t("settings.title")}</span>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
            aria-label={t("settings.close")}
          >
            ×
          </button>
        </div>

        <div className="settings-panel__section">
          <div className="settings-panel__label">{t("settings.language_section_label")}</div>
          <div className="settings-panel__hint">
            {t("settings.language_picker_desc")}
          </div>
          <select
            className="settings-panel__select"
            aria-label={t("settings.language_picker_aria")}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-panel__section">
          <div className="settings-panel__label">{t("settings.account_tier")}</div>
          <div className="settings-panel__value settings-panel__value--readonly">
            {tierLabel}
          </div>
          <div className="settings-panel__hint">
            {t("settings.tier_hint")}
          </div>
        </div>

        {/* Single unified Video model picker — flat list of every option
            (Veo tiers + Omni Flash). Selecting a Veo row stamps both
            videoModel="veo" + the matching quality; selecting Omni Flash
            stamps videoModel="omni_flash" (duration is picked per dispatch
            in the GenerationDialog). */}
        <div className="settings-panel__section">
          <div className="settings-panel__label">{t("settings.video_model_label")}</div>
          <div className="settings-panel__radio-group">
            {VIDEO_QUALITIES.map((q) => {
              const locked = q.ultraOnly && tier !== "PAYGATE_TIER_TWO";
              const checked = videoModel === "veo" && videoQuality === q.key;
              return (
                <label
                  key={q.key}
                  className={`settings-panel__radio${checked ? " settings-panel__radio--active" : ""}${locked ? " settings-panel__radio--locked" : ""}`}
                >
                  <input
                    type="radio"
                    name="video-model"
                    value={`veo:${q.key}`}
                    checked={checked}
                    disabled={locked}
                    onChange={() => {
                      setVideoModel("veo");
                      setVideoQuality(q.key);
                    }}
                  />
                  <div>
                    <div className="settings-panel__radio-label">
                      {/* i18n: do-not-translate — brand identifier */}
                      {q.label}
                      {q.ultraOnly && (
                        <span className="model-badge">{t("settings.ultra_only")}</span>
                      )}
                    </div>
                    <div className="settings-panel__radio-hint">{t(q.hintKey as "settings.veo_lite_hint")}</div>
                  </div>
                </label>
              );
            })}
            <label
              className={`settings-panel__radio${videoModel === "omni_flash" ? " settings-panel__radio--active" : ""}`}
            >
              <input
                type="radio"
                name="video-model"
                value="omni_flash"
                checked={videoModel === "omni_flash"}
                onChange={() => setVideoModel("omni_flash")}
              />
              <div>
                <div className="settings-panel__radio-label">
                  {/* i18n: do-not-translate — brand identifier */}
                  Omni Flash (r2v)
                </div>
                <div className="settings-panel__radio-hint">
                  {t("settings.omni_flash_hint")}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="settings-panel__section">
          <div className="settings-panel__label">{t("settings.image_model_label")}</div>
          <div className="settings-panel__radio-group">
            {IMAGE_MODELS.map((m) => (
              <label
                key={m.key}
                className={`settings-panel__radio${imageModel === m.key ? " settings-panel__radio--active" : ""}`}
              >
                <input
                  type="radio"
                  name="image-model"
                  value={m.key}
                  checked={imageModel === m.key}
                  onChange={() => setImageModel(m.key)}
                />
                <div>
                  <div className="settings-panel__radio-label">
                    {/* i18n: do-not-translate — brand identifier */}
                    {m.label}
                  </div>
                  <div className="settings-panel__radio-hint">{t(m.hintKey as "settings.nano_banana_pro_hint")}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-panel__section">
          <div className="settings-panel__label">{t("settings.about")}</div>
          <div className="settings-panel__about-row">
            <span className="settings-panel__about-key">{t("settings.version")}</span>
            <span className="settings-panel__about-value">
              <code>v{APP_VERSION}</code>
              {updateAvailable && latestRelease && (
                <a
                  className="settings-panel__update-badge"
                  href={latestRelease.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Latest: ${latestRelease.tagName}`}
                >
                  {t("settings.update_available", { version: latestRelease.tagName })}
                </a>
              )}
            </span>
          </div>
          <div className="settings-panel__about-row">
            <span className="settings-panel__about-key">{t("settings.community")}</span>
            <a
              className="settings-panel__about-link"
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("settings.community_link")}
            </a>
          </div>
        </div>

        {onLogout && (
          // Sign out lives here (not in the AccountPanel chip) so the
          // chip stays narrow enough for the email + status row to
          // render without ellipsizing on default sidebar widths.
          <div className="settings-panel__section settings-panel__section--logout">
            <button
              type="button"
              className="settings-panel__logout-btn"
              onClick={onLogout}
              disabled={logoutPending}
            >
              {logoutPending ? t("settings.signing_out") : t("settings.sign_out")}
            </button>
            <div className="settings-panel__hint">
              {t("settings.logout_hint")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
