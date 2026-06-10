/// <reference types="vite/client" />
/**
 * i18n.ts — i18next singleton for Flowboard.
 *
 * Import this file as a side effect in main.tsx BEFORE <App /> renders:
 *   import "./i18n/i18n";
 *
 * Rules:
 *  - All locale changes go through useSettingsStore.setLocale() — never
 *    call i18n.changeLanguage() directly from components.
 *  - In React components: const { t } = useTranslation()
 *  - In .ts store actions / utilities: import i18n from "../i18n/i18n"; i18n.t(...)
 *  - Never use dynamic key construction: t(`prefix.${variable}`) breaks static analysis.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

// ── Synchronous locale detection ──────────────────────────────────────────────
// Read the persisted locale BEFORE i18n.init() resolves so the first render
// is in the correct language — no flash. LanguageDetector handles this via
// the detection.order config below, but reading it here also lets the
// Zustand settings store mirror the value at init time without an async gap.
const SUPPORTED = ["en", "tr"] as const;
type Locale = (typeof SUPPORTED)[number];

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem("flowboard.i18n.locale");
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // localStorage may be disabled; fall through to navigator
  }
  const nav = (navigator.language ?? navigator.languages?.[0] ?? "en")
    .split("-")[0]
    .toLowerCase();
  return (SUPPORTED as readonly string[]).includes(nav) ? (nav as Locale) : "en";
}

// ── Init ──────────────────────────────────────────────────────────────────────
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: detectInitialLocale(),  // synchronous; prevents cold-start flash
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    interpolation: {
      escapeValue: false,        // React already escapes — double-escaping breaks HTML entities
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "flowboard.i18n.locale",
      caches: ["localStorage"],
    },
  });

// ── Vite HMR — keep running app in sync when locale JSON is edited in dev ─────
if (import.meta.hot) {
  import.meta.hot.accept(
    ["./locales/en.json", "./locales/tr.json"],
    ([newEn, newTr]) => {
      if (newEn) i18n.addResourceBundle("en", "translation", newEn.default, true, true);
      if (newTr) i18n.addResourceBundle("tr", "translation", newTr.default, true, true);
    },
  );
}

export default i18n;
export type { Locale };
