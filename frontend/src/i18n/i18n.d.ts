/**
 * i18n.d.ts — TypeScript module augmentation for i18next typed keys.
 *
 * This file teaches TypeScript the shape of en.json so that:
 *   t("missing.key")         → compile error
 *   t("time.just_now")       → ✓ autocomplete
 *
 * The augmentation points at `typeof en` from en.json. TypeScript
 * re-infers key types automatically whenever en.json changes — no
 * code generation step is needed.
 *
 * Only English (the reference locale) is used here. tr.json key
 * completeness is enforced by convention and code review, not by
 * the type system (the TS types describe en.json's shape, and
 * missing tr.json keys fall back to English at runtime).
 */
import "i18next";
import type en from "./locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
