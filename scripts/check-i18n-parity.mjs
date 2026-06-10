#!/usr/bin/env node
// Validate that a locale catalog is at full parity with frontend/src/i18n/locales/en.json.
//
// Usage:
//   node scripts/check-i18n-parity.mjs          # checks every locale found alongside en.json
//   node scripts/check-i18n-parity.mjs tr       # checks just frontend/src/i18n/locales/tr.json
//
// Exit codes:
//   0 — all checked catalogs pass (keys match en.json, placeholders preserved)
//   1 — key set differs (extra or missing keys)
//   2 — placeholder mismatch in one or more values
//   3 — file read / JSON parse error
//
// Empty values are reported as warnings (allowed during development).

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, "..", "frontend", "src", "i18n", "locales");
const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`✗ Failed to load ${path}: ${err.message}`);
    process.exit(3);
  }
}

function placeholders(value) {
  return new Set(Array.from(value.matchAll(PLACEHOLDER_RE), (m) => m[1]));
}

function checkLocale(localeCode, en) {
  const trPath = resolve(LOCALES_DIR, `${localeCode}.json`);
  const tr = loadJson(trPath);

  const enKeys = new Set(Object.keys(en));
  const trKeys = new Set(Object.keys(tr));

  const missingInTr = [...enKeys].filter((k) => !trKeys.has(k));
  const extraInTr = [...trKeys].filter((k) => !enKeys.has(k));

  let parityOk = true;
  if (missingInTr.length || extraInTr.length) {
    parityOk = false;
    console.error(`\n✗ ${localeCode}.json: key parity broken`);
    if (missingInTr.length) {
      console.error(`  Missing ${missingInTr.length} keys (present in en.json, absent in ${localeCode}.json):`);
      missingInTr.slice(0, 10).forEach((k) => console.error(`    - ${k}`));
      if (missingInTr.length > 10) console.error(`    ...and ${missingInTr.length - 10} more`);
    }
    if (extraInTr.length) {
      console.error(`  Extra ${extraInTr.length} keys (present in ${localeCode}.json, absent in en.json):`);
      extraInTr.slice(0, 10).forEach((k) => console.error(`    - ${k}`));
      if (extraInTr.length > 10) console.error(`    ...and ${extraInTr.length - 10} more`);
    }
  }

  const placeholderMismatches = [];
  const empty = [];
  for (const key of enKeys) {
    if (!trKeys.has(key)) continue;
    const enPh = placeholders(en[key]);
    const trPh = placeholders(tr[key]);
    if (enPh.size !== trPh.size || ![...enPh].every((p) => trPh.has(p))) {
      placeholderMismatches.push({ key, enPh: [...enPh], trPh: [...trPh] });
    }
    if (!String(tr[key]).trim()) empty.push(key);
  }

  let placeholderOk = true;
  if (placeholderMismatches.length) {
    placeholderOk = false;
    console.error(`\n✗ ${localeCode}.json: ${placeholderMismatches.length} placeholder mismatch(es)`);
    placeholderMismatches.slice(0, 5).forEach(({ key, enPh, trPh }) => {
      console.error(`  ${key}:`);
      console.error(`    en placeholders: {${enPh.join(", ")}}`);
      console.error(`    ${localeCode} placeholders: {${trPh.join(", ")}}`);
    });
    if (placeholderMismatches.length > 5) console.error(`  ...and ${placeholderMismatches.length - 5} more`);
  }

  if (empty.length) {
    console.warn(`\n⚠ ${localeCode}.json: ${empty.length} empty value(s) (allowed during development; will fall back to en)`);
    if (empty.length <= 5) empty.forEach((k) => console.warn(`    - ${k}`));
  }

  if (parityOk && placeholderOk) {
    console.log(`✓ ${localeCode}.json — ${enKeys.size} keys, parity OK, all placeholders preserved${empty.length ? `, ${empty.length} empty value(s)` : ""}`);
  }

  return { parityOk, placeholderOk };
}

const en = loadJson(resolve(LOCALES_DIR, "en.json"));
console.log(`✓ en.json — ${Object.keys(en).length} keys (reference catalog)`);

const requested = process.argv.slice(2);
let locales;
if (requested.length) {
  locales = requested;
} else {
  locales = readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .map((f) => f.replace(/\.json$/, ""));
}

if (!locales.length) {
  console.warn("⚠ No non-en locale catalogs found.");
  process.exit(0);
}

let exitCode = 0;
for (const code of locales) {
  const { parityOk, placeholderOk } = checkLocale(code, en);
  if (!parityOk) exitCode = Math.max(exitCode, 1);
  if (!placeholderOk) exitCode = Math.max(exitCode, 2);
}

if (exitCode === 0) {
  console.log(`\n✓ All ${locales.length} locale(s) pass parity + placeholder checks.`);
}

process.exit(exitCode);
