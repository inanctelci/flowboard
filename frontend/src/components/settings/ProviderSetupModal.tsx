import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LLMProviderName } from "../../api/client";

/**
 * Inline setup guide opened from the "Setup help" button on each
 * provider row. Content varies by provider per the plan UI Spec:
 *   - Claude: install + auth + verify (CLI subscription)
 *   - Gemini: install + auth + verify (CLI subscription)
 *   - OpenAI: 2-tab layout — Codex CLI (preferred) / API key (fallback)
 *
 * Backdrop click + ESC + Close button all dismiss. Focus trap is
 * provided by the Settings panel backdrop already (we render inside it).
 */

interface ProviderSetupModalProps {
  provider: LLMProviderName;
  open: boolean;
  onClose(): void;
}

interface CommandLineProps {
  cmd: string;
}

function CommandLine({ cmd }: CommandLineProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail on insecure contexts — silently no-op,
      // user can still select+copy by hand.
    }
  }
  return (
    <div className="setup-modal__cmd">
      <code className="setup-modal__cmd-text">{cmd}</code>
      <button
        type="button"
        className="setup-modal__copy"
        onClick={handleCopy}
        aria-label={t("provider.copy_command")}
      >
        {copied ? t("provider.copied") : t("provider.copy")}
      </button>
    </div>
  );
}

export function ProviderSetupModal({ provider, open, onClose }: ProviderSetupModalProps) {
  const { t } = useTranslation();
  // OpenAI is the only modal with tabs. Default to "cli" (the recommended
  // path); user can flip to "api" for the fallback.
  const [openaiTab, setOpenaiTab] = useState<"cli" | "api">("cli");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="setup-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="setup-modal" role="dialog" aria-modal="true">
        <div className="setup-modal__header">
          <span className="setup-modal__title">{titleFor(provider, t)}</span>
          <button
            type="button"
            className="setup-modal__close"
            onClick={onClose}
            aria-label={t("provider.setup_close")}
          >
            ×
          </button>
        </div>

        {provider === "claude" && <ClaudeContent />}
        {provider === "gemini" && <GeminiContent />}
        {provider === "openai" && (
          <OpenAiContent tab={openaiTab} onTabChange={setOpenaiTab} />
        )}

        <div className="setup-modal__footer">
          <a
            className="setup-modal__docs-link"
            href={docsLinkFor(provider)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("provider.docs_link", { name: labelFor(provider) })}
          </a>
          <button
            type="button"
            className="setup-modal__close-btn"
            onClick={onClose}
          >
            {t("provider.close_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaudeContent() {
  const { t } = useTranslation();
  return (
    <div className="setup-modal__body">
      <p>
        {t("provider.claude_intro")}
      </p>
      <ol className="setup-modal__steps">
        <li>
          <span className="setup-modal__step-label">{t("provider.step_install")}</span>
          {/* i18n: do-not-translate (npm package name — technical identifier) */}
          <CommandLine cmd="npm install -g @anthropic-ai/claude-code" />
        </li>
        <li>
          <span className="setup-modal__step-label">{t("provider.step_authenticate")}</span>
          {/* i18n: do-not-translate (CLI command) */}
          <CommandLine cmd="claude" />
          <span className="setup-modal__step-hint">
            {t("provider.claude_auth_hint")}
          </span>
        </li>
        <li>
          <span className="setup-modal__step-label">{t("provider.step_verify")}</span>
          {/* i18n: do-not-translate (CLI command) */}
          <CommandLine cmd="claude --version" />
        </li>
      </ol>
      <p className="setup-modal__note">
        {t("provider.claude_note")}
      </p>
    </div>
  );
}

function GeminiContent() {
  const { t } = useTranslation();
  return (
    <div className="setup-modal__body">
      <p>
        {t("provider.gemini_intro")}
      </p>
      <ol className="setup-modal__steps">
        <li>
          <span className="setup-modal__step-label">{t("provider.step_install")}</span>
          {/* i18n: do-not-translate (npm package name — technical identifier) */}
          <CommandLine cmd="npm install -g @google/gemini-cli" />
        </li>
        <li>
          <span className="setup-modal__step-label">{t("provider.step_authenticate")}</span>
          {/* i18n: do-not-translate (CLI command) */}
          <CommandLine cmd="gemini auth login" />
        </li>
        <li>
          <span className="setup-modal__step-label">{t("provider.step_verify")}</span>
          {/* i18n: do-not-translate (CLI command) */}
          <CommandLine cmd="gemini --version" />
        </li>
      </ol>
      <p className="setup-modal__note">
        {t("provider.gemini_note")}
      </p>
    </div>
  );
}

interface OpenAiContentProps {
  tab: "cli" | "api";
  onTabChange(t: "cli" | "api"): void;
}

function OpenAiContent({ tab, onTabChange }: OpenAiContentProps) {
  const { t } = useTranslation();
  return (
    <div className="setup-modal__body">
      <div className="setup-modal__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cli"}
          className={`setup-modal__tab${tab === "cli" ? " setup-modal__tab--active" : ""}`}
          onClick={() => onTabChange("cli")}
        >
          {/* i18n: do-not-translate (brand "Codex CLI" embedded) */}
          {t("provider.openai_tab_cli")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "api"}
          className={`setup-modal__tab${tab === "api" ? " setup-modal__tab--active" : ""}`}
          onClick={() => onTabChange("api")}
        >
          {t("provider.openai_tab_api")}
        </button>
      </div>

      {tab === "cli" ? (
        <>
          <p>{t("provider.openai_cli_intro")}</p>
          <ol className="setup-modal__steps">
            <li>
              <span className="setup-modal__step-label">{t("provider.step_install")}</span>
              {/* i18n: do-not-translate (npm package name) */}
              <CommandLine cmd="npm install -g @openai/codex" />
            </li>
            <li>
              <span className="setup-modal__step-label">{t("provider.step_authenticate")}</span>
              {/* i18n: do-not-translate (CLI command) */}
              <CommandLine cmd="codex login" />
            </li>
            <li>
              <span className="setup-modal__step-label">{t("provider.step_verify")}</span>
              {/* i18n: do-not-translate (CLI command) */}
              <CommandLine cmd="codex --version" />
            </li>
          </ol>
          <p className="setup-modal__note">
            {t("provider.openai_cli_note")}
          </p>
        </>
      ) : (
        <>
          <p>{t("provider.openai_api_intro")}</p>
          <ol className="setup-modal__steps">
            <li>
              <span className="setup-modal__step-label">{t("provider.step_get_key")}</span>
              {/* i18n: do-not-translate (external URL) */}
              <a
                className="setup-modal__step-link"
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.openai.com/api-keys ↗
              </a>
            </li>
            <li>
              <span className="setup-modal__step-label">{t("provider.step_save_key")}</span>
              <span className="setup-modal__step-hint">
                {t("provider.openai_api_save_hint")}
              </span>
            </li>
          </ol>
          <p className="setup-modal__note">
            {t("provider.openai_api_note")}
          </p>
        </>
      )}
    </div>
  );
}

function titleFor(p: LLMProviderName, t: (key: string) => string): string {
  switch (p) {
    case "claude":
      // i18n: do-not-translate (brand "Claude CLI" in title value)
      return t("provider.setup_claude_title");
    case "gemini":
      // i18n: do-not-translate (brand "Gemini CLI" in title value)
      return t("provider.setup_gemini_title");
    case "openai":
      // i18n: do-not-translate (brand "OpenAI" in title value)
      return t("provider.setup_openai_title");
  }
}

function labelFor(p: LLMProviderName): string {
  switch (p) {
    case "claude":
      // i18n: do-not-translate (brand name)
      return "Anthropic";
    case "gemini":
      // i18n: do-not-translate (brand name)
      return "Google Gemini";
    case "openai":
      // i18n: do-not-translate (brand name)
      return "OpenAI";
  }
}

function docsLinkFor(p: LLMProviderName): string {
  switch (p) {
    case "claude":
      return "https://docs.anthropic.com/en/docs/claude-code/quickstart";
    case "gemini":
      return "https://github.com/google/gemini-cli";
    case "openai":
      return "https://platform.openai.com/docs/quickstart";
  }
}
