import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getLocalStorage } from "./browser-storage";

export const interfaceStyleStorageKey = "fundbeads.interfaceStyle";

export const interfaceStyles = [{ id: "modern" }, { id: "pixel" }] as const;

export type InterfaceStyleId = (typeof interfaceStyles)[number]["id"];

export const defaultInterfaceStyle: InterfaceStyleId = "modern";

type InterfaceStyleContextValue = {
  interfaceStyle: InterfaceStyleId;
  setInterfaceStyle: (style: string) => void;
};

const InterfaceStyleContext = createContext<InterfaceStyleContextValue | null>(null);

export function normalizeInterfaceStyle(value: string | null | undefined): InterfaceStyleId | null {
  return interfaceStyles.some((style) => style.id === value) ? (value as InterfaceStyleId) : null;
}

export function readStoredInterfaceStyle(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(interfaceStyleStorageKey) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredInterfaceStyle(storage: Storage | undefined, style: InterfaceStyleId) {
  try {
    storage?.setItem(interfaceStyleStorageKey, style);
  } catch {
    // Preference persistence is optional; the app should continue if storage is unavailable.
  }
}

export function InterfaceStyleProvider({ children }: { children: ReactNode }) {
  const [interfaceStyle, setInterfaceStyleState] = useState<InterfaceStyleId>(() => {
    return normalizeInterfaceStyle(readStoredInterfaceStyle(getLocalStorage())) ?? defaultInterfaceStyle;
  });

  const value = useMemo<InterfaceStyleContextValue>(
    () => ({
      interfaceStyle,
      setInterfaceStyle: (nextStyle) => {
        const normalizedStyle = normalizeInterfaceStyle(nextStyle);
        if (!normalizedStyle) {
          return;
        }
        setInterfaceStyleState(normalizedStyle);
        writeStoredInterfaceStyle(getLocalStorage(), normalizedStyle);
      },
    }),
    [interfaceStyle],
  );

  return <InterfaceStyleContext.Provider value={value}>{children}</InterfaceStyleContext.Provider>;
}

export function useInterfaceStyle() {
  const context = useContext(InterfaceStyleContext);
  if (!context) {
    throw new Error("useInterfaceStyle must be used within InterfaceStyleProvider.");
  }
  return context;
}
