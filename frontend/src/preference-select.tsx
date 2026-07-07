import { ChevronDown } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
  selectedLabel?: string;
  displayLabel?: string;
  description?: string;
};

type PreferenceMenuAnchorRect = Pick<DOMRect, "bottom" | "left" | "width"> & Partial<Pick<DOMRect, "top">>;
type PreferenceMenuViewport = Pick<Window, "innerWidth" | "innerHeight">;

const preferenceMenuOffset = 6;
const preferenceMenuViewportMargin = 8;
const preferenceMenuMinWidth = 96;
const preferenceMenuMaxWidth = 360;
const preferenceMenuPreferredMaxHeight = 320;
const preferenceMenuMinFlipHeight = 160;
const preferenceMenuOptionHorizontalPadding = 48;
const preferenceMenuOptionLabelGap = 20;
const preferenceMenuTextUnitWidth = 9;
const defaultSelectedLabelClassName = "pointer-events-none min-w-6 max-w-24 truncate";

export function getPreferenceMenuPlacement(
  rect: PreferenceMenuAnchorRect,
  viewport: PreferenceMenuViewport = typeof window === "undefined" ? { innerWidth: 1024, innerHeight: 768 } : window,
  preferredWidth = rect.width,
) {
  const maxWidth = Math.max(preferenceMenuMinWidth, Math.min(preferenceMenuMaxWidth, viewport.innerWidth - preferenceMenuViewportMargin * 2));
  const menuWidth = Math.min(maxWidth, Math.max(preferenceMenuMinWidth, Math.ceil(rect.width), Math.ceil(preferredWidth)));
  const maxLeft = Math.max(preferenceMenuViewportMargin, viewport.innerWidth - preferenceMenuViewportMargin - menuWidth);
  const left = Math.min(Math.max(preferenceMenuViewportMargin, Math.floor(rect.left)), maxLeft);
  const belowTop = Math.ceil(rect.bottom + preferenceMenuOffset);
  const belowHeight = Math.max(0, viewport.innerHeight - preferenceMenuViewportMargin - belowTop);
  const anchorTop = rect.top ?? rect.bottom;
  const aboveHeight = Math.max(0, anchorTop - preferenceMenuViewportMargin - preferenceMenuOffset);
  const shouldFlip = belowHeight < preferenceMenuMinFlipHeight && aboveHeight > belowHeight;
  const maxHeight = Math.max(1, Math.min(preferenceMenuPreferredMaxHeight, shouldFlip ? aboveHeight : belowHeight));

  return {
    top: shouldFlip ? Math.max(preferenceMenuViewportMargin, Math.floor(anchorTop - preferenceMenuOffset - maxHeight)) : belowTop,
    left,
    minWidth: menuWidth,
    width: menuWidth,
    maxWidth,
    maxHeight,
  };
}

export function estimatePreferenceMenuWidth(options: readonly SelectOption[]) {
  const widestOptionContent = options.reduce((widestWidth, option) => {
    const labelWidth = estimatePreferenceTextWidth(option.label);
    const displayLabelWidth = option.displayLabel ? preferenceMenuOptionLabelGap + estimatePreferenceTextWidth(option.displayLabel) : 0;
    const descriptionWidth = option.description ? Math.min(34 * preferenceMenuTextUnitWidth, estimatePreferenceTextWidth(option.description)) : 0;
    return Math.max(widestWidth, labelWidth + displayLabelWidth, descriptionWidth);
  }, 0);

  return Math.ceil(widestOptionContent + preferenceMenuOptionHorizontalPadding);
}

export function getNextPreferenceOptionIndex(currentIndex: number, direction: 1 | -1, optionCount: number) {
  if (optionCount <= 0) {
    return 0;
  }
  return (currentIndex + direction + optionCount) % optionCount;
}

export function PreferenceSelect({
  label,
  icon,
  value,
  options,
  onChange,
  describedBy,
  className = "",
  selectedLabelClassName = defaultSelectedLabelClassName,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  describedBy?: string;
  className?: string;
  selectedLabelClassName?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPlacement, setMenuPlacement] = useState({ top: 0, left: 0, minWidth: preferenceMenuMinWidth, width: preferenceMenuMinWidth, maxWidth: preferenceMenuMaxWidth, maxHeight: preferenceMenuPreferredMaxHeight });
  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = selectedOption?.selectedLabel ?? selectedOption?.displayLabel ?? selectedOption?.label ?? value;
  const buttonAriaLabel = `${label}: ${selectedLabel}`;
  const activeOptionId = `${menuId}-option-${activeIndex}`;

  const updateMenuPlacement = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setMenuPlacement(getPreferenceMenuPlacement(rect, window, estimatePreferenceMenuWidth(options)));
  }, [options]);

  const openMenu = useCallback(() => {
    updateMenuPlacement();
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  }, [selectedIndex, updateMenuPlacement]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectOption = useCallback(
    (option: SelectOption) => {
      onChange(option.value);
      closeMenu();
      buttonRef.current?.focus();
    },
    [closeMenu, onChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    }

    function onWindowChange() {
      updateMenuPlacement();
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [closeMenu, isOpen, updateMenuPlacement]);

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex((currentIndex) => getNextPreferenceOptionIndex(currentIndex, 1, options.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex((currentIndex) => getNextPreferenceOptionIndex(currentIndex, -1, options.length));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex(Math.max(0, options.length - 1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      const activeOption = options[activeIndex];
      if (activeOption) {
        selectOption(activeOption);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={buttonAriaLabel}
        aria-describedby={describedBy}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }
          openMenu();
        }}
        onKeyDown={onButtonKeyDown}
        className={`preference-select-control inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      >
        <span className="pointer-events-none text-muted-foreground">{icon}</span>
        <span className={selectedLabelClassName}>{selectedLabel}</span>
        <ChevronDown className="pointer-events-none text-muted-foreground" size={15} />
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label={label}
              aria-activedescendant={activeOptionId}
              className="preference-select-menu fixed grid overflow-y-auto rounded-md border border-border bg-card p-1 text-sm font-semibold text-foreground shadow-panel"
              style={{
                top: menuPlacement.top,
                left: menuPlacement.left,
                minWidth: menuPlacement.minWidth,
                width: menuPlacement.width,
                maxWidth: menuPlacement.maxWidth,
                maxHeight: menuPlacement.maxHeight,
              }}
            >
              {options.map((option, optionIndex) => (
                <button
                  key={option.value}
                  id={`${menuId}-option-${optionIndex}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onClick={() => selectOption(option)}
                  className={`grid min-h-9 w-full gap-1 rounded px-3 py-2 text-left transition ${
                    optionIndex === activeIndex || option.value === value ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0 break-words">{option.label}</span>
                    {option.displayLabel ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{option.displayLabel}</span> : null}
                  </span>
                  {option.description ? <span className="text-caption-compact min-w-0 break-words font-medium leading-snug text-muted-foreground">{option.description}</span> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function estimatePreferenceTextWidth(value: string) {
  return Array.from(value).reduce((width, character) => width + estimatePreferenceTextUnits(character) * preferenceMenuTextUnitWidth, 0);
}

function estimatePreferenceTextUnits(character: string) {
  return /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(character) ? 2 : 1;
}
