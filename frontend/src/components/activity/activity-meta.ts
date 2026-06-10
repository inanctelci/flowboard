// Static maps for type → label and status → color/icon. Kept in one
// file so adding a new activity type means touching one place. Icons
// (SVG) live in ActivityIcon.tsx; status icons stay as ASCII glyphs
// since they read clean at small sizes.
import i18n from "../../i18n/i18n";

export const ACTIVITY_TYPE_META: Record<
  string,
  { get label(): string; group: "llm" | "gen" | "upload" }
> = {
  auto_prompt:       { get label() { return i18n.t("activity.auto_prompt"); },       group: "llm" },
  auto_prompt_batch: { get label() { return i18n.t("activity.auto_prompt_batch"); }, group: "llm" },
  vision:            { get label() { return i18n.t("activity.vision"); },             group: "llm" },
  planner:           { get label() { return i18n.t("activity.planner"); },            group: "llm" },
  gen_image:         { get label() { return i18n.t("activity.gen_image"); },          group: "gen" },
  gen_video:         { get label() { return i18n.t("activity.gen_video"); },          group: "gen" },
  edit_image:        { get label() { return i18n.t("activity.edit_image"); },         group: "gen" },
  upload:            { get label() { return i18n.t("activity.upload_file"); },        group: "upload" },
  upload_url:        { get label() { return i18n.t("activity.upload_link"); },        group: "upload" },
};

// Fallback for unknown types — keeps the UI rendering forward-compat
// when the backend ships a new type before the frontend catches up.
export function metaFor(type: string) {
  return (
    ACTIVITY_TYPE_META[type] ?? { label: type, group: "llm" as const }
  );
}

export const STATUS_META: Record<
  string,
  { icon: string; get label(): string; tone: "muted" | "running" | "ok" | "fail" }
> = {
  queued:   { icon: "⋯", get label() { return i18n.t("activity.status_queued"); },   tone: "muted" },
  running:  { icon: "⟳", get label() { return i18n.t("activity.status_running"); },  tone: "running" },
  done:     { icon: "✓", get label() { return i18n.t("activity.status_done"); },      tone: "ok" },
  failed:   { icon: "✗", get label() { return i18n.t("activity.status_failed"); },    tone: "fail" },
  // User-initiated cancel — soft, not an error. Muted tone so it
  // doesn't compete visually with real failures.
  canceled: { icon: "⊘", get label() { return i18n.t("activity.status_canceled"); }, tone: "muted" },
  // Auto-cancel after the 5-minute video-gen budget elapses. Treated
  // as a soft failure so the badge still pings the user.
  timeout:  { icon: "⏱", get label() { return i18n.t("activity.status_timeout"); },  tone: "fail" },
};

export function statusMeta(status: string) {
  return STATUS_META[status] ?? { icon: "•", label: status, tone: "muted" as const };
}

export function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  if (diff < 0) return i18n.t("activity.just_now");
  const sec = Math.round(diff / 1000);
  if (sec < 5) return i18n.t("activity.just_now");
  if (sec < 60) return i18n.t("activity.sec_ago", { count: sec });
  const min = Math.round(sec / 60);
  if (min < 60) return i18n.t("activity.min_ago", { count: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return i18n.t("activity.hr_ago", { count: hr });
  const day = Math.round(hr / 24);
  if (day < 7) return i18n.t("activity.day_ago", { count: day });
  return new Date(iso).toLocaleDateString();
}

// i18n: do-not-translate (technical — SI duration abbreviations)
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${min}m ${s}s`;
}
