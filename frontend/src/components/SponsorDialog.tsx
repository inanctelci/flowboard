import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sponsor entry point — top-right canvas button + modal dialog.
 *
 * The button is intentionally premium: gradient background, sparkle
 * cursor accent, gentle hover lift. Click opens a 4-tier sponsor card
 * grid (Coffee → Diamond) backed by PayPal donate URLs. Each tier
 * card is fully clickable, opens PayPal in a new tab with the tier's
 * amount + label pre-filled, and the dialog stays open so the user
 * can switch tiers without re-opening.
 *
 * Sponsors are listed at the top of the README repo by tier — the
 * trust signal we lean on here is "real money, real attribution".
 */

// Ko-fi is the primary sponsor rail because it works globally — no
// country gating like PayPal's `/donate` endpoint, and the page
// accepts an `?amount=` hint to pre-fill the tip box for the chosen
// tier. PayPal stays as a fallback in the footer for users who
// already have a balance there.
const KOFI_USERNAME = "crisnguyen95";
const PAYPAL_EMAIL = "tuannguyenhoangit@gmail.com";

interface Tier {
  key: "coffee" | "gold" | "platinum" | "diamond";
  label: string;
  amount: number;
  tagline: string;
  perks: string[];
  // Visual accents — per-tier so cards read as distinct collectibles
  // rather than four near-identical pills.
  icon: string;
  ringClass: string;
}

// i18n: do-not-translate (TIERS — tier labels/taglines/perks are product content data, not UI chrome)
const TIERS: Tier[] = [
  {
    key: "coffee",
    label: "Coffee",
    amount: 5,
    tagline: "Buy me a coffee",
    perks: ["Name listed in README sponsors", "Discord supporter role"],
    icon: "☕",
    ringClass: "sponsor-tier--coffee",
  },
  {
    key: "gold",
    label: "Gold",
    amount: 25,
    tagline: "Solid backing",
    perks: ["Gold badge in README", "Priority issue triage", "Discord supporter role"],
    icon: "★",
    ringClass: "sponsor-tier--gold",
  },
  {
    key: "platinum",
    label: "Platinum",
    amount: 50,
    tagline: "For serious users",
    perks: [
      "Platinum badge with logo in README",
      "Priority issue + feature triage",
      "Direct chat with the maintainer",
    ],
    icon: "✦",
    ringClass: "sponsor-tier--platinum",
  },
  {
    key: "diamond",
    label: "Diamond",
    amount: 100,
    tagline: "Top tier",
    perks: [
      "Diamond badge with logo in README header",
      "Direct chat + feature priority",
      "Early access to roadmap drops",
    ],
    icon: "◆",
    ringClass: "sponsor-tier--diamond",
  },
];

function kofiTierUrl(tier: Tier): string {
  // Ko-fi's tip page reads `amount` from the query string and pre-fills
  // the tip selector. Users still confirm on Ko-fi's side, so we don't
  // bypass their checkout — just save them a click.
  const params = new URLSearchParams({ amount: String(tier.amount) });
  return `https://ko-fi.com/${KOFI_USERNAME}?${params.toString()}`;
}

const KOFI_URL = `https://ko-fi.com/${KOFI_USERNAME}`;

export function SponsorButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="sponsor-trigger"
        onClick={() => setOpen(true)}
        // i18n: do-not-translate (brand name "Flowboard" embedded in aria-label)
        aria-label="Support Flowboard"
        title={t("sponsor.become_sponsor")}
      >
        <span className="sponsor-trigger__heart" aria-hidden="true">♥</span>
        <span>{t("sponsor.button_label")}</span>
      </button>
      <SponsorDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface SponsorDialogProps {
  open: boolean;
  onClose(): void;
}

function SponsorDialog({ open, onClose }: SponsorDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

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
      className="sponsor-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="sponsor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-dialog-title"
      >
        <button
          type="button"
          className="sponsor-dialog__close"
          onClick={onClose}
          aria-label={t("sponsor.close")}
        >
          ×
        </button>

        <div className="sponsor-dialog__header">
          <div className="sponsor-dialog__eyebrow">{t("sponsor.eyebrow")}</div>
          {/* i18n: do-not-translate (brand name "Flowboard" in title value) */}
          <h2 id="sponsor-dialog-title" className="sponsor-dialog__title">
            {t("sponsor.title")}
          </h2>
          <p className="sponsor-dialog__subtitle">
            {t("sponsor.subtitle")}
          </p>
        </div>

        <div className="sponsor-tier-grid">
          {TIERS.map((tier) => (
            <a
              key={tier.key}
              className={`sponsor-tier ${tier.ringClass}`}
              href={kofiTierUrl(tier)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="sponsor-tier__icon" aria-hidden="true">
                {tier.icon}
              </div>
              {/* i18n: do-not-translate (tier.label, tier.tagline, tier.perks — product content data) */}
              <div className="sponsor-tier__name">{tier.label}</div>
              <div className="sponsor-tier__amount">
                <span className="sponsor-tier__currency">$</span>
                {tier.amount}
              </div>
              <div className="sponsor-tier__tagline">{tier.tagline}</div>
              <ul className="sponsor-tier__perks">
                {tier.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {/* i18n: do-not-translate (brand "Ko-fi" embedded) */}
              <div className="sponsor-tier__cta">{t("sponsor.tip_kofi")}</div>
            </a>
          ))}
        </div>

        <div className="sponsor-dialog__footer">
          <div className="sponsor-dialog__paypal">
            {/* i18n: do-not-translate (brand "Ko-fi" in link text) */}
            <a
              className="sponsor-dialog__kofi"
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("sponsor.open_kofi")}
            </a>
            {/* i18n: do-not-translate (brand "PayPal" embedded) */}
            <span className="sponsor-dialog__or">{t("sponsor.or_paypal")}</span>
            {/* i18n: do-not-translate (contact email — maintainer data) */}
            <code className="sponsor-dialog__paypal-email">{PAYPAL_EMAIL}</code>
            <button
              type="button"
              className="sponsor-dialog__copy"
              onClick={() => {
                navigator.clipboard?.writeText(PAYPAL_EMAIL).catch(() => {});
              }}
              title={t("sponsor.copy_email_title")}
            >
              {t("sponsor.copy")}
            </button>
          </div>
          <p className="sponsor-dialog__fineprint">
            {t("sponsor.fineprint_prefix")}{" "}
            {/* i18n: do-not-translate (maintainer contact email) */}
            <code>{PAYPAL_EMAIL}</code>{" "}
            {t("sponsor.fineprint_suffix")}
          </p>
        </div>
      </div>
    </div>
  );
}
