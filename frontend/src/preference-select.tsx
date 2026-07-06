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

export function getPreferenceMenuPlacement(rect: Pick<DOMRect, "bottom" | "left" | "width">) {
  return {
    top: Math.ceil(rect.bottom + 6),
    left: Math.floor(rect.left),
    minWidth: Math.max(96, Math.ceil(rect.width)),
  };
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
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  describedBy?: string;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPlacement, setMenuPlacement] = useState({ top: 0, left: 0, minWidth: 96 });
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
    setMenuPlacement(getPreferenceMenuPlacement(rect));
  }, []);

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
        <span className="pointer-events-none min-w-6 max-w-24 truncate">{selectedLabel}</span>
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
              className="preference-select-menu fixed z-50 grid max-w-[min(22rem,calc(100vw-1rem))] gap-1 rounded-md border border-border bg-card p-1 text-sm font-semibold text-foreground shadow-panel"
              style={{
                top: menuPlacement.top,
                left: menuPlacement.left,
                minWidth: menuPlacement.minWidth,
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
                    <span className="min-w-0 truncate">{option.label}</span>
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
