import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterConfig, CharacterPreset } from "../../lib/character/schema";
import { useCharacterPresetsStore } from "../../store/characterPresets";

interface PresetListProps {
  onLoad(config: Partial<CharacterConfig>): void;
  selectedPresetId?: string | null;
}

interface PresetCardProps {
  preset: CharacterPreset;
  isSelected: boolean;
  onLoad(): void;
  onRename(name: string): void;
  onDelete(): void;
}

function PresetCard({ preset, isSelected, onLoad, onRename, onDelete }: PresetCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(preset.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Auto-cancel confirm-delete after 3s
  useEffect(() => {
    if (!confirmDelete) return;
    confirmTimer.current = setTimeout(() => {
      setConfirmDelete(false);
      confirmTimer.current = null;
    }, 3000);
    return () => {
      if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
    };
  }, [confirmDelete]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  // Update rename value when preset name changes externally
  useEffect(() => {
    setRenameValue(preset.name);
  }, [preset.name]);

  function handleRenameConfirm() {
    if (renameValue.trim()) {
      onRename(renameValue.trim());
    }
    setRenaming(false);
    setMenuOpen(false);
  }

  // Meta line: vibe · ethnicity (or first non-empty field)
  const meta = [preset.config.charVibe, preset.config.charEthnicity]
    .filter(Boolean)
    .join(" · ") || "";

  return (
    <div
      className={`char-wizard__preset-card${isSelected ? " char-wizard__preset-card--selected" : ""}`}
      role="button"
      aria-label={t("wizard.preset.load_aria", { name: preset.name })}
      onClick={() => {
        if (!renaming) onLoad();
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!renaming) onLoad();
        }
      }}
    >
      <div className="char-wizard__preset-actions" ref={menuRef}>
        <button
          type="button"
          className="char-wizard__preset-kebab"
          aria-label={t("wizard.preset.kebab_aria", { name: preset.name })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ···
        </button>
        {menuOpen && (
          <div className="char-wizard__preset-menu" role="menu">
            <button
              type="button"
              className="char-wizard__preset-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setRenaming(true);
              }}
            >
              {t("wizard.preset.rename")}
            </button>
            <button
              type="button"
              className="char-wizard__preset-menu-item char-wizard__preset-menu-danger"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
            >
              {t("wizard.preset.delete")}
            </button>
          </div>
        )}
      </div>

      {renaming ? (
        <input
          ref={renameInputRef}
          type="text"
          className="char-wizard__preset-rename-input"
          value={renameValue}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameConfirm();
            if (e.key === "Escape") {
              setRenameValue(preset.name);
              setRenaming(false);
            }
            e.stopPropagation();
          }}
          onBlur={handleRenameConfirm}
          maxLength={60}
        />
      ) : (
        <div className="char-wizard__preset-name">{preset.name}</div>
      )}

      {meta && !renaming && (
        <div className="char-wizard__preset-meta">{meta}</div>
      )}

      {confirmDelete && !renaming && (
        <div
          className="char-wizard__preset-delete-confirm"
          role="alert"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{t("wizard.preset.delete_confirm", { name: preset.name })}</span>
          <button
            type="button"
            className="char-wizard__preset-menu-item char-wizard__preset-menu-danger"
            style={{ padding: "2px 6px", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            {t("wizard.preset.delete_confirm_btn")}
          </button>
          <button
            type="button"
            className="char-wizard__preset-menu-item"
            style={{ padding: "2px 6px", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(false);
            }}
          >
            {t("wizard.preset.delete_cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

export function PresetList({ onLoad, selectedPresetId }: PresetListProps) {
  const { t } = useTranslation();
  const presets = useCharacterPresetsStore((s) => s.presets);
  const renamePreset = useCharacterPresetsStore((s) => s.renamePreset);
  const deletePreset = useCharacterPresetsStore((s) => s.deletePreset);

  const [collapsed, setCollapsed] = useState(false);

  if (presets.length === 0) {
    return (
      <div className="char-wizard__preset-shelf">
        <button
          type="button"
          className="char-wizard__preset-shelf-header"
        >
          {t("wizard.preset.shelf_label")}
        </button>
        <div className="char-wizard__preset-shelf-empty">
          {t("wizard.preset.shelf_empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="char-wizard__preset-shelf">
      <button
        type="button"
        className="char-wizard__preset-shelf-header"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? "▶" : "▼"} {t("wizard.preset.shelf_label")}
      </button>
      {!collapsed && (
        <div className="char-wizard__preset-list">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={selectedPresetId === preset.id}
              onLoad={() => onLoad({ ...preset.config })}
              onRename={(name) => renamePreset(preset.id, name)}
              onDelete={() => deletePreset(preset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
