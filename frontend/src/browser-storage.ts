type LocalStorageHost = {
  readonly localStorage: Storage;
};

export function getLocalStorage(host?: LocalStorageHost): Storage | undefined {
  const storageHost = host ?? (typeof window === "undefined" ? undefined : window);
  if (!storageHost) {
    return undefined;
  }

  try {
    return storageHost.localStorage;
  } catch {
    return undefined;
  }
}
