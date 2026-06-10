import { useState, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useBoardStore } from "../store/board";
import { ActivityBell } from "./activity/ActivityBell";
import { AiProviderBadge } from "./AiProviderBadge";
import { SponsorButton } from "./SponsorDialog";

export function Toolbar() {
  const { t } = useTranslation();
  const boardName = useBoardStore((s) => s.boardName);
  const renameBoard = useBoardStore((s) => s.renameBoard);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(boardName);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== boardName) {
      renameBoard(trimmed);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") inputRef.current?.blur();
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  return (
    <div className="toolbar">
      {/* i18n: do-not-translate — "Flowboard" is the product brand wordmark */}
      <span className="toolbar-wordmark">Flowboard</span>
      <span className="toolbar-sep" aria-hidden="true">/</span>
      {editing ? (
        <input
          ref={inputRef}
          className="toolbar-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
          aria-label={t("toolbar.board_name")}
        />
      ) : (
        <button
          className="toolbar-name-btn"
          onClick={startEdit}
          aria-label={t("toolbar.rename_board")}
          title={t("toolbar.click_to_rename")}
        >
          {/* i18n: do-not-translate — boardName is USER DATA; "Untitled" is a TYPE_TITLE data default */}
          {boardName || "Untitled"}
        </button>
      )}

      <div className="toolbar-actions">
        <ActivityBell />
        <AiProviderBadge />
        <SponsorButton />
      </div>
    </div>
  );
}
