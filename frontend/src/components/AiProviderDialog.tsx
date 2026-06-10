import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AiProvidersSection } from "./settings/AiProvidersSection";

/**
 * Standalone dialog for the AI Providers panel.
 *
 * Two modes:
 *  - **User-opened** (`force=false`): backdrop click + ESC + ✕ all close.
 *  - **Forced setup** (`force=true`): no close affordances. The parent
 *    (ForcedSetupGate at the App level) controls visibility based on
 *    `/api/llm/config.configured`. Once the user runs Apply with a
 *    provider that passes all 3 tests, the next /config poll flips
 *    `configured=true` and the parent unmounts the dialog.
 *
 * SettingsPanel (Google Flow tier / video quality / image model) is a
 * separate dialog — Flow billing decisions don't belong with LLM
 * provider switches.
 */

interface AiProviderDialogProps {
  open: boolean;
  onClose(): void;
  /** When true, hide ✕, ignore ESC, ignore backdrop click. */
  force?: boolean;
}

export function AiProviderDialog({ open, onClose, force = false }: AiProviderDialogProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || force) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, force]);

  if (!open) return null;

  return (
    <div
      className={`ai-provider-dialog-backdrop${force ? " ai-provider-dialog-backdrop--force" : ""}`}
      role="presentation"
      onClick={(e) => {
        if (force) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ai-provider-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("provider.dialog_aria")}
      >
        <div className="ai-provider-dialog__header">
          <span className="ai-provider-dialog__title">
            {force ? t("provider.setup_title") : t("provider.dialog_title")}
          </span>
          {!force && (
            <button
              type="button"
              className="ai-provider-dialog__close"
              onClick={onClose}
              aria-label={t("provider.close")}
            >
              ×
            </button>
          )}
        </div>
        {force && (
          <div className="ai-provider-dialog__force-banner" role="alert">
            {t("provider.force_banner")}
          </div>
        )}
        <AiProvidersSection />
      </div>
    </div>
  );
}
