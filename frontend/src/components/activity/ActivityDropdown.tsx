import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ActivityListItem } from "../../api/client";
import { ActivityRow } from "./ActivityRow";

interface ActivityDropdownProps {
  items: ActivityListItem[];
  loading: boolean;
  nextBeforeId: number | null;
  onLoadMore(): void;
  onClose(): void;
  onSelect(id: number): void;
  onCancel?(id: number): Promise<void>;
}

export function ActivityDropdown({
  items,
  loading,
  nextBeforeId,
  onLoadMore,
  onClose,
  onSelect,
  onCancel,
}: ActivityDropdownProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    // Use capture phase so the bell's own click isn't fired again as
    // the dropdown is closing.
    setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [onClose]);

  return (
    <div ref={panelRef} className="activity-dropdown" role="dialog" aria-label={t("activity.dropdown_title")}>
      <div className="activity-dropdown__header">
        <span className="activity-dropdown__title">{t("activity.dropdown_title")}</span>
        <span className="activity-dropdown__count">
          {t("activity.dropdown_item", { count: items.length })}
        </span>
        <button
          type="button"
          className="activity-dropdown__close"
          onClick={onClose}
          aria-label={t("activity.dropdown_close")}
        >
          ×
        </button>
      </div>

      <div className="activity-dropdown__list">
        {loading && items.length === 0 && (
          <div className="activity-dropdown__placeholder">{t("activity.loading")}</div>
        )}
        {!loading && items.length === 0 && (
          <div className="activity-dropdown__placeholder">
            {t("activity.empty")}
          </div>
        )}
        {items.map((item) => (
          <ActivityRow
            key={item.id}
            item={item}
            onClick={() => onSelect(item.id)}
            onCancel={onCancel}
          />
        ))}
      </div>

      {nextBeforeId !== null && (
        <button
          type="button"
          className="activity-dropdown__load-more"
          onClick={onLoadMore}
        >
          {t("activity.load_more")}
        </button>
      )}
    </div>
  );
}
