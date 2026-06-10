import { useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { useBoardStore } from "../store/board";
import type { NodeType } from "../store/board";

interface Chip {
  type: NodeType;
  icon: string;
  // i18n: do-not-translate (data identifier used for dispatch)
  kind: string;
}

// i18n: do-not-translate (kind values are data identifiers sent to backend — display labels come from t("palette.kind.*"))
const CHIPS: Chip[] = [
  { type: "character", icon: "◎", kind: "character" },
  { type: "image", icon: "▣", kind: "image" },
  { type: "Storyboard", icon: "▦", kind: "storyboard" },
  { type: "video", icon: "▶", kind: "video" },
  { type: "visual_asset", icon: "◇", kind: "visual_asset" },
  { type: "prompt", icon: "✦", kind: "prompt" },
  { type: "note", icon: "✎", kind: "note" },
];

export function AddNodePalette() {
  const { t } = useTranslation();
  const { screenToFlowPosition } = useReactFlow();
  const addNodeOfType = useBoardStore((s) => s.addNodeOfType);

  // Resolve display label per chip kind using literal keys (D-08: no dynamic key construction)
  function chipLabel(kind: string): string {
    if (kind === "character") return t("palette.kind.character");
    if (kind === "image") return t("palette.kind.image");
    if (kind === "storyboard") return t("palette.kind.storyboard");
    if (kind === "video") return t("palette.kind.video");
    if (kind === "visual_asset") return t("palette.visual_asset");
    if (kind === "prompt") return t("palette.kind.prompt");
    if (kind === "note") return t("palette.kind.note");
    return kind;
  }

  function handleAdd(type: NodeType) {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNodeOfType(type, position);
  }

  return (
    <div className="add-node-palette" aria-label={t("palette.add_node")}>
      <span className="add-node-plus" aria-hidden="true">+</span>
      {CHIPS.map((chip) => {
        const label = chipLabel(chip.kind);
        return (
          <button
            key={chip.type}
            className="add-node-chip"
            aria-label={t("palette.add_node_type", { label })}
            onClick={() => handleAdd(chip.type)}
          >
            <span aria-hidden="true">{chip.icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
