import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGenerationStore } from "../store/generation";
import { useBoardStore } from "../store/board";
import { useSettingsStore } from "../store/settings";
import { useReferencesStore } from "../store/references";
import { getMediaStatus, mediaUrl, type MediaStatus } from "../api/client";

// PHASE 7 SHIM: legacy charCountry → English-label fallback for v1.0 boards
// where hydration migration may not have populated charEthnicity yet.
const LEGACY_COUNTRY_LABELS: Record<string, string> = {
  vn: "Vietnamese",
  jp: "Japanese",
  kr: "Korean",
  cn: "Chinese",
  th: "Thai",
  us: "American",
  fr: "French",
};

// Constant-table mapping ethnicity-bucket key → i18n key. NO dynamic key
// construction (I18N-04 anti-pattern). Free-text / unmapped values fall
// through to raw-string render in the JSX below.
const ETHNICITY_BUCKET_I18N: Record<string, string> = {
  eastAsian: "wizard.field.ethnicity.bucket.eastAsian",
  southAsian: "wizard.field.ethnicity.bucket.southAsian",
  southeastAsian: "wizard.field.ethnicity.bucket.southeastAsian",
  middleEastern: "wizard.field.ethnicity.bucket.middleEastern",
  westAfrican: "wizard.field.ethnicity.bucket.westAfrican",
  eastAfrican: "wizard.field.ethnicity.bucket.eastAfrican",
  european: "wizard.field.ethnicity.bucket.european",
  latinAmerican: "wizard.field.ethnicity.bucket.latinAmerican",
  northAmericanIndigenous: "wizard.field.ethnicity.bucket.northAmericanIndigenous",
  pacificIslander: "wizard.field.ethnicity.bucket.pacificIslander",
};

// Vibe key → i18n key (constant-table; no dynamic construction).
const VIBE_OPTION_I18N: Record<string, string> = {
  clean: "wizard.field.vibe.option.clean",
  douyin: "wizard.field.vibe.option.douyin",
  oldmoney: "wizard.field.vibe.option.oldmoney",
  coldgirl: "wizard.field.vibe.option.coldgirl",
  kpop: "wizard.field.vibe.option.kpop",
  casual: "wizard.field.vibe.option.casual",
};

function ethnicityLabel(
  t: (k: string) => string,
  charEthnicity?: string,
  charCountry?: string,
): string | null {
  if (charEthnicity && ETHNICITY_BUCKET_I18N[charEthnicity]) {
    return t(ETHNICITY_BUCKET_I18N[charEthnicity]);
  }
  if (charEthnicity && charEthnicity.trim().length > 0) {
    // Free-text ethnicity (English prose stored on node.data).
    return charEthnicity;
  }
  if (charCountry && LEGACY_COUNTRY_LABELS[charCountry]) {
    // PHASE 7 SHIM: v1.0 node not yet migrated to charEthnicity.
    return LEGACY_COUNTRY_LABELS[charCountry];
  }
  return null;
}

function vibeLabel(t: (k: string) => string, charVibe?: string): string | null {
  if (charVibe && VIBE_OPTION_I18N[charVibe]) {
    return t(VIBE_OPTION_I18N[charVibe]);
  }
  return null;
}

const ICON: Record<string, string> = {
  character: "◎",
  image: "▣",
  video: "▶",
  prompt: "✦",
  note: "✎",
};

// Friendly labels for the metadata grid's `model` row. Keys match what
// the dispatch code stamps onto node.data — keep in sync with
// `ImageModelKey` (store/settings.ts) and `VideoQuality` respectively.
const IMAGE_MODEL_LABELS: Record<string, string> = {
  NANO_BANANA_PRO: "Banana Pro",
  NANO_BANANA_2: "Banana 2",
};
const VIDEO_QUALITY_LABELS: Record<string, string> = {
  lite: "Lite",
  fast: "Fast",
  quality: "Quality",
  lite_relaxed: "Lite (Low Priority)",
  // Omni Flash dispatches stamp the per-duration model key directly
  // (resolve_omni_flash_model: abra_r2v_4s / 6s / 8s / 10s). Map all
  // four to a single "Omni Flash · Ns" label so the detail panel
  // surfaces the actual duration variant that ran.
  abra_r2v_4s: "Omni Flash · 4s",
  abra_r2v_6s: "Omni Flash · 6s",
  abra_r2v_8s: "Omni Flash · 8s",
  abra_r2v_10s: "Omni Flash · 10s",
};

/** Format Flow's aspect-ratio enum to the human label shown on the node
 *  card. Returns "—" when the value is missing or unrecognised so the
 *  metadata grid never displays a stale hardcoded fallback. */
function formatAspectRatio(value: string | undefined): string {
  switch (value) {
    case "IMAGE_ASPECT_RATIO_LANDSCAPE":
    case "VIDEO_ASPECT_RATIO_LANDSCAPE":
      return "16:9";
    case "IMAGE_ASPECT_RATIO_PORTRAIT":
    case "VIDEO_ASPECT_RATIO_PORTRAIT":
      return "9:16";
    case "IMAGE_ASPECT_RATIO_SQUARE":
      return "1:1";
    default:
      return "—";
  }
}

/** Format an ISO timestamp as a relative time string using the active locale.
 *  Returns "—" when the timestamp is missing or unparseable.
 *
 *  Pass `t` (from useTranslation) and `resolvedLanguage` (from i18n) as
 *  parameters so the function remains a pure utility — no hook calls inside. */
function formatRelativeTime(
  iso: string | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
  resolvedLanguage: string,
): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diffSec = Math.max(0, (Date.now() - ts) / 1000);
  if (diffSec < 60) return t("time.just_now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("time.minutes_ago", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("time.hours_ago", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("time.days_ago", { count: diffDay });
  // Long-form date: use the active locale so each user sees a
  // date formatted in their language instead of a hardcoded locale.
  return new Intl.DateTimeFormat(resolvedLanguage).format(new Date(ts));
}

export function ResultViewer() {
  const openViewer = useGenerationStore((s) => s.openViewer);
  const closeResultViewer = useGenerationStore((s) => s.closeResultViewer);
  const openGenerationDialog = useGenerationStore((s) => s.openGenerationDialog);
  const dispatchGeneration = useGenerationStore((s) => s.dispatchGeneration);
  const projectId = useGenerationStore((s) => s.projectId);
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const settingsImageModel = useSettingsStore((s) => s.imageModel);
  const settingsVideoQuality = useSettingsStore((s) => s.videoQuality);
  const { t, i18n } = useTranslation();

  const [activeIdx, setActiveIdx] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [cacheKey, setCacheKey] = useState(0);
  const [status, setStatus] = useState<MediaStatus | null>(null);
  // Save-to-library state. MUST live above the `if (!data) return null`
  // early-return below — React's Rules of Hooks require all hooks to be
  // called unconditionally on every render in the same order.
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rfId = openViewer.rfId;
  const node = nodes.find((n) => n.id === rfId);
  const data = node?.data;
  const mediaIds = data?.mediaIds ?? (data?.mediaId ? [data.mediaId] : []);

  // METADATA model label. Two tiers:
  //   - `isBadge: true` — node was generated AFTER the model-stamp feature
  //     shipped, so we know the exact model that produced it. Render as
  //     a pill (matches the Settings "Ultra only" badge visual language).
  //   - `isBadge: false` — old node, or unrenderable type (prompt/note),
  //     or upload (no model). Render as plain text so the visual
  //     difference signals "estimate vs ground truth".
  const metadataModel: { label: string; isBadge: boolean } = (() => {
    if (data?.type === "video") {
      if (data.videoQuality) {
        return {
          label: VIDEO_QUALITY_LABELS[data.videoQuality] ?? data.videoQuality,
          isBadge: true,
        };
      }
      // Pre-feature node — fall back to the user's current preference.
      return {
        label: VIDEO_QUALITY_LABELS[settingsVideoQuality] ?? settingsVideoQuality,
        isBadge: false,
      };
    }
    if (data && ["image", "character", "visual_asset"].includes(data.type)) {
      if (data.imageModel) {
        return {
          label: IMAGE_MODEL_LABELS[data.imageModel] ?? data.imageModel,
          isBadge: true,
        };
      }
      return {
        label: IMAGE_MODEL_LABELS[settingsImageModel] ?? settingsImageModel,
        isBadge: false,
      };
    }
    return { label: "—", isBadge: false };
  })();

  // Upstream refs feeding this target. Walk EDGES (not just nodes) so
  // each entry resolves to the variant the edge is pinned to — same
  // logic as `collectUpstreamRefMediaIds` at dispatch. The chip then
  // shows the exact thumbnail Flow will receive instead of always
  // defaulting to the source's "active" mediaId.
  const REF_TYPES = new Set(["character", "image", "visual_asset"]);
  const refSourceNodes = rfId
    ? edges
        .filter((e) => e.target === rfId)
        .map((e) => {
          const n = nodes.find((node) => node.id === e.source);
          if (!n || !REF_TYPES.has(n.data.type)) return null;
          const variants = Array.isArray(n.data.mediaIds) ? n.data.mediaIds : [];
          const pin = (e.data?.sourceVariantIdx ?? null) as number | null;
          let mediaId: string | undefined;
          let variantIdx: number | null = null;
          if (
            pin !== null
            && pin >= 0
            && pin < variants.length
            && typeof variants[pin] === "string"
            && variants[pin]
          ) {
            mediaId = variants[pin] as string;
            variantIdx = pin;
          } else if (typeof n.data.mediaId === "string" && n.data.mediaId) {
            mediaId = n.data.mediaId;
          } else if (
            variants.length > 0
            && typeof variants[0] === "string"
            && variants[0]
          ) {
            mediaId = variants[0] as string;
          }
          if (!mediaId) return null;
          return { node: n, mediaId, variantIdx };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  // Slot-aware mediaId resolution. When the node has a per-variant
  // `mediaIds` array, slot index activeIdx is authoritative even if
  // its value is `null` — the null means "this variant got blocked",
  // which is semantically distinct from "no per-variant array exists,
  // fall back to the legacy single mediaId". Using `??` chained the
  // two together and made every blocked slot silently render the
  // primary mediaId from slot 0 — i.e. clicking tile 4 played
  // tile 1's video.
  const slotMediaId = data?.mediaIds?.[activeIdx];
  const currentMediaId = rfId && data
    ? (data.mediaIds !== undefined
        ? (typeof slotMediaId === "string" && slotMediaId ? slotMediaId : null)
        : (data.mediaId ?? null))
    : null;
  const slotError = data?.slotErrors?.[activeIdx] ?? null;

  // Reset active variant index and media state when viewer opens for a different node
  useEffect(() => {
    if (rfId !== null) {
      // Honor the idx the caller passed via openResultViewer(rfId, idx)
      // so clicking a specific tile in the node card opens at that
      // variant. Bound by current mediaIds length (best-effort).
      setActiveIdx(openViewer.idx ?? 0);
      setMediaReady(false);
      setStatus(null);
      triggerRef.current = document.activeElement;
    } else {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    }
  }, [rfId]);

  // Reset media state when active variant changes
  useEffect(() => {
    setMediaReady(false);
    setStatus(null);
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [currentMediaId]);

  // Keyboard handling
  useEffect(() => {
    if (rfId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeResultViewer();
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % Math.max(mediaIds.length, 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + Math.max(mediaIds.length, 1)) % Math.max(mediaIds.length, 1));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // Focus trap
  useEffect(() => {
    if (rfId === null) return;
    const el = dialogRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = el.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [rfId]);

  if (rfId === null || !data) return null;

  const isVideo = data.type === "video";
  const shortMediaId = currentMediaId ? `${currentMediaId.slice(0, 12)}…` : "pending";

  const cacheBust = cacheKey > 0 ? `?t=${cacheKey}` : "";

  function onImgLoad() {
    setMediaReady(true);
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function onImgError() {
    if (!currentMediaId) return;
    setMediaReady(false);
    if (pollTimerRef.current !== null) return; // already polling
    const mid = currentMediaId;
    pollTimerRef.current = setInterval(async () => {
      try {
        const s = await getMediaStatus(mid);
        setStatus(s);
        if (s.available) {
          setCacheKey((k) => k + 1);
          setMediaReady(true);
          if (pollTimerRef.current !== null) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch {
        // ignore transient errors; keep polling
      }
    }, 2000);
  }

  function handleRefresh() {
    setCacheKey((k) => k + 1);
  }

  let hintText: string;
  if (status === null) {
    hintText = t("result.loading");
  } else if (!status.has_url) {
    // i18n: do-not-translate (brand "Flowboard" embedded in value)
    hintText = t("result.no_url_hint");
  } else {
    hintText = t("result.fetching_bytes");
  }

  // Blocks the three generation-flow buttons (Edit prompt, Regenerate,
  // New variant) while the LLM layer is mid-flight on this node — same
  // signal as the canvas-side .node-card--llm-busy treatment so the user
  // can't fire a duplicate dispatch via the detail panel either.
  const llmBusy =
    data?.autoPromptStatus === "pending"
    || data?.aiBriefStatus === "pending";

  function handleRegenerate() {
    if (!rfId || !data || llmBusy) return;
    // Carry forward the node's persisted setup so regenerate matches the
    // original generation. Without this we silently snap to LANDSCAPE / 1
    // variant — wrong for portrait/square shots, character refs (square),
    // and multi-variant batches.
    const aspectRatio =
      typeof data.aspectRatio === "string" ? data.aspectRatio : undefined;
    const variantCount =
      typeof data.variantCount === "number" && data.variantCount > 0
        ? data.variantCount
        : 1;

    // Critical: video nodes must dispatch with `kind: "video"` AND the
    // upstream source(s). Without `kind`, the store falls back to
    // gen_image — silently produces a still image, overwriting the
    // actual video result on the node.
    if (data.type === "video") {
      const upstreamEdge = edges.find((e) => e.target === rfId);
      const upstreamNode = upstreamEdge
        ? nodes.find((n) => n.id === upstreamEdge.source)
        : undefined;
      // Prefer the full variant list so batch i2v re-runs all N sources;
      // fall back to the singular mediaId for legacy single-source nodes.
      // Skip null placeholders from partial-batch upstreams.
      const sourceMediaIds: string[] = (
        upstreamNode?.data.mediaIds ??
        (upstreamNode?.data.mediaId ? [upstreamNode.data.mediaId] : [])
      ).filter((m): m is string => typeof m === "string" && m.length > 0);
      if (sourceMediaIds.length === 0) {
        useGenerationStore.setState({
          error: i18n.t("result.video_regen_needs_upstream"),
        });
        return;
      }
      const useMulti = sourceMediaIds.length > 1;
      dispatchGeneration(rfId, {
        prompt: data.prompt ?? "",
        kind: "video",
        sourceMediaId: useMulti ? undefined : sourceMediaIds[0],
        sourceMediaIds: useMulti ? sourceMediaIds : undefined,
        aspectRatio,
        variantCount: sourceMediaIds.length,
      });
      return;
    }
    dispatchGeneration(rfId, {
      prompt: data.prompt ?? "",
      aspectRatio,
      variantCount,
    });
  }

  function handleEditPrompt() {
    if (!rfId || !data || llmBusy) return;
    closeResultViewer();
    openGenerationDialog(rfId, data.prompt ?? "");
  }

  async function handleNewVariant() {
    if (!rfId || llmBusy) return;
    const newRfId = await useBoardStore
      .getState()
      .cloneNodeWithUpstream(rfId);
    if (!newRfId) return;
    closeResultViewer();
    // Open the gen dialog on the fresh sibling so the user can hit
    // Generate immediately (or tweak prompt first) — that's the natural
    // next step after cloning.
    openGenerationDialog(newRfId, data?.prompt ?? "");
  }

  // Save the currently-viewed variant to the cross-board Reference
  // library. Backend POST is idempotent on media_id, so multi-clicking
  // is safe — we still flip the button to "Saved" for 1.5s for feedback.
  // (State declared at the top of the component to satisfy Rules of Hooks.)

  async function handleSaveToLibrary() {
    if (!rfId || !data || !currentMediaId || saving) return;
    setSaving(true);
    try {
      const kind: "image" | "character" | "visual_asset" | "storyboard_shot" =
        data.type === "Storyboard"
          ? "storyboard_shot"
          : data.type === "character"
            ? "character"
            : data.type === "visual_asset"
              ? "visual_asset"
              : "image";
      await useReferencesStore.getState().save({
        media_id: currentMediaId,
        kind,
        ai_brief: typeof data.aiBrief === "string" ? data.aiBrief : null,
        aspect_ratio:
          typeof data.aspectRatio === "string" ? data.aspectRatio : null,
        label:
          typeof data.aiBrief === "string"
            ? data.aiBrief.slice(0, 80)
            : `#${data.shortId}`,
        source_board_id: useBoardStore.getState().boardId,
        source_node_short_id:
          typeof data.shortId === "string" ? data.shortId : null,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      // Surfaced via store.error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="result-viewer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeResultViewer();
      }}
    >
      <div
        className="result-viewer"
        role="dialog"
        aria-labelledby="result-viewer-title"
        aria-modal="true"
        ref={dialogRef}
      >
        {/* Left panel — media tile */}
        <div className="result-viewer__left">
          <div
            className="media-placeholder"
            role={mediaReady ? undefined : "img"}
            aria-label={mediaReady ? undefined : t("result.media_pending", { title: data.title })}
          >
            {currentMediaId ? (
              <>
                {/* Single media element — always mounted so load/error fires once and
                    there's no flicker from mount/unmount on state flip. */}
                {isVideo ? (
                  <video
                    className="media-placeholder__video"
                    style={mediaReady ? undefined : { display: "none" }}
                    src={mediaUrl(currentMediaId) + cacheBust}
                    controls
                    preload="metadata"
                    onError={onImgError}
                    onLoadedData={onImgLoad}
                  />
                ) : (
                  <img
                    className="media-placeholder__img"
                    style={mediaReady ? undefined : { display: "none" }}
                    src={mediaUrl(currentMediaId) + cacheBust}
                    alt={data.title as string /* i18n: do-not-translate (USER DATA — node title) */}
                    onError={onImgError}
                    onLoad={onImgLoad}
                  />
                )}
                {!mediaReady && (
                  <div className="media-placeholder__content">
                    <span className="media-placeholder__icon" aria-hidden="true">
                      {ICON[data.type] ?? "□"}
                    </span>
                    {/* i18n: do-not-translate (data.title — USER DATA, node title) */}
                    <span className="media-placeholder__title">{data.title}</span>
                    {/* i18n: do-not-translate (shortMediaId — technical debug string) */}
                    <span className="media-placeholder__id">media_id: {shortMediaId}</span>
                  </div>
                )}
              </>
            ) : slotError ? (
              // Blocked variant — Veo's safety classifier rejected this
              // specific clip while the rest of the batch rendered.
              // Show the exact filter reason so the user can decide
              // whether to retry, change inputs, or accept the loss.
              <div className="media-placeholder__content media-placeholder__content--blocked">
                <span className="media-placeholder__icon media-placeholder__icon--warn" aria-hidden="true">⚠</span>
                <span className="media-placeholder__title">{t("result.variant_blocked")}</span>
                {/* i18n: do-not-translate (slotError — technical error code from API) */}
                <span className="media-placeholder__error-code">{slotError}</span>
                <span className="media-placeholder__error-hint">
                  {t("result.variant_blocked_hint")}
                </span>
              </div>
            ) : (
              <div className="media-placeholder__content">
                <span className="media-placeholder__icon" aria-hidden="true">
                  {ICON[data.type] ?? "□"}
                </span>
                {/* i18n: do-not-translate (data.title — USER DATA, node title) */}
                <span className="media-placeholder__title">{data.title}</span>
                {/* i18n: do-not-translate (shortMediaId — technical debug string) */}
                <span className="media-placeholder__id">media_id: {shortMediaId}</span>
              </div>
            )}
          </div>

          {currentMediaId && !mediaReady && (
            <p className="media-placeholder__hint">{hintText}</p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {currentMediaId && (
              <button className="media-placeholder__refresh" onClick={handleRefresh}>
                {t("result.refresh")}
              </button>
            )}
            {/* Variant switcher — chips for each slot. Blocked slots
                get a warning treatment + tooltip with the error code so
                the user can scan the strip and see at a glance which
                variants succeeded vs failed. */}
            {mediaIds.length > 0 && (
              <div className="variant-switcher" role="group" aria-label={t("result.variant_selection")}>
                {mediaIds.map((_id, idx) => {
                  const chipError = data?.slotErrors?.[idx] ?? null;
                  const blocked = chipError !== null && chipError !== undefined;
                  return (
                    <button
                      key={idx}
                      className={`variant-switcher__chip${idx === activeIdx ? " variant-switcher__chip--active" : ""}${blocked ? " variant-switcher__chip--blocked" : ""}`}
                      onClick={() => setActiveIdx(idx)}
                      aria-label={blocked ? t("result.variant_blocked_label", { n: idx + 1, error: chipError }) : t("result.variant_n", { n: idx + 1 })}
                      title={blocked ? t("result.blocked_title", { error: chipError }) : undefined}
                      aria-pressed={idx === activeIdx}
                    >
                      {blocked ? "⚠" : idx + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — metadata */}
        <div className="result-viewer__right">
          <div className="result-viewer__status-pill">{t("result.rendered_status")}</div>

          {/* i18n: do-not-translate (data.title — USER DATA, node title) */}
          <h2 id="result-viewer-title" className="result-viewer__node-title">
            {data.title}
          </h2>
          <span className="result-viewer__node-id">#{data.shortId}</span>

          <hr className="result-viewer__divider" />

          <span className="result-viewer__section-label">{t("result.section_prompt")}</span>
          {/* i18n: do-not-translate (data.prompt — USER DATA) */}
          <p className="result-viewer__prompt">{data.prompt ?? t("result.no_prompt")}</p>
          <button
            className="result-viewer__edit-prompt"
            onClick={handleEditPrompt}
            disabled={llmBusy}
            title={llmBusy ? t("result.composing_wait") : undefined}
          >
            {t("result.edit_prompt")}
          </button>

          {refSourceNodes.length > 0 && (
            <>
              <hr className="result-viewer__divider" />
              <span className="result-viewer__section-label">
                {t("result.source_refs_label", { count: refSourceNodes.length })}
              </span>
              <div className="ref-source-row">
                {refSourceNodes.map((r) => (
                  <div
                    key={r.node.id}
                    className="ref-source-chip"
                    title={
                      r.variantIdx !== null
                        // i18n: do-not-translate (r.node.data.title — USER DATA; "variant N" label pattern)
                        ? `${r.node.data.title} — variant ${r.variantIdx + 1}`
                        // i18n: do-not-translate (r.node.data.title — USER DATA)
                        : r.node.data.title
                    }
                  >
                    <img
                      className="ref-source-chip__img"
                      src={mediaUrl(r.mediaId)}
                      alt={r.node.data.title /* i18n: do-not-translate (USER DATA) */}
                    />
                    {r.variantIdx !== null && (
                      <span className="ref-source-chip__variant">
                        v{r.variantIdx + 1}
                      </span>
                    )}
                    <span className="ref-source-chip__id">
                      #{r.node.data.shortId}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <hr className="result-viewer__divider" />

          <span className="result-viewer__section-label">{t("result.section_metadata")}</span>
          <dl className="result-viewer__metadata-grid">
            <dt>{t("result.meta_model")}</dt>
            <dd>
              {/* i18n: do-not-translate (metadataModel.label — brand model name) */}
              {metadataModel.isBadge ? (
                <span className="model-badge">{metadataModel.label}</span>
              ) : (
                metadataModel.label
              )}
            </dd>
            {(() => {
              const label = data?.type === "character"
                ? ethnicityLabel(t, data.charEthnicity, data.charCountry)
                : null;
              return label ? (
                <>
                  <dt>{t("result.meta_country")}</dt>
                  <dd>
                    <span className="model-badge">{label}</span>
                  </dd>
                </>
              ) : null;
            })()}
            {(() => {
              const label = data?.type === "character" ? vibeLabel(t, data.charVibe) : null;
              return label ? (
                <>
                  <dt>{t("result.meta_vibe")}</dt>
                  <dd>
                    <span className="model-badge">{label}</span>
                  </dd>
                </>
              ) : null;
            })()}
            <dt>{t("result.meta_aspect")}</dt>
            <dd>{formatAspectRatio(data?.aspectRatio)}</dd>
            <dt>{t("result.meta_time")}</dt>
            <dd>{formatRelativeTime(data?.renderedAt, t, i18n.resolvedLanguage ?? "en")}</dd>
          </dl>

          <div className="result-viewer__actions">
            {llmBusy && (
              // Inline busy banner explains why the action buttons are
              // disabled — without this the disabled state looks like a bug.
              <div className="result-viewer__busy-banner" role="status">
                <span className="node-header__llm-spinner" aria-hidden="true" />
                {data?.autoPromptStatus === "pending"
                  ? t("result.composing_actions_disabled")
                  : t("result.analyzing_actions_disabled")}
              </div>
            )}
            <button
              className="result-viewer__btn result-viewer__btn--primary"
              onClick={handleRegenerate}
              disabled={llmBusy}
              title={llmBusy ? t("result.backend_busy") : undefined}
            >
              {t("result.regenerate_kbd")}
            </button>
            <button
              className="result-viewer__btn"
              onClick={handleNewVariant}
              disabled={llmBusy}
              title={
                llmBusy
                  ? t("result.backend_busy")
                  : t("result.clone_title")
              }
            >
              {t("result.new_variant")}
            </button>
            <button
              className={
                "result-viewer__btn result-viewer__btn--save"
                + (savedFlash ? " result-viewer__btn--saved" : "")
              }
              onClick={handleSaveToLibrary}
              disabled={!currentMediaId || saving}
              title={
                !currentMediaId
                  ? t("result.wait_for_gen")
                  : t("result.save_ref_library")
              }
            >
              {/* i18n: do-not-translate (saving "…" — loading ellipsis, not translatable) */}
              {savedFlash ? t("result.saved") : saving ? "…" : t("result.save_to_library")}
            </button>
            {projectId ? (
              <a
                className="result-viewer__btn result-viewer__btn--link"
                href={`https://labs.google/fx/tools/flow/project/${projectId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* i18n: do-not-translate (brand "Flow" embedded in link text) */}
                {t("result.open_in_flow")}
              </a>
            ) : (
              <button className="result-viewer__btn" disabled>
                {/* i18n: do-not-translate (brand "Flow" embedded in button text) */}
                {t("result.open_in_flow")}
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="result-viewer__footer-hint">
          {t("result.footer_hint")}
        </div>

        {/* Close button */}
        <button
          className="result-viewer__close"
          onClick={closeResultViewer}
          aria-label={t("result.close")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
