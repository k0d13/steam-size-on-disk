import { createStore } from "./storage";

interface Settings {
  /** Whether clicking the size opens the game's folder instead of its properties. */
  openFolderOnClick: boolean;
}

const store = createStore<Settings[keyof Settings]>("size-on-disk:settings");

export function getSetting<K extends keyof Settings>(key: K, fallback: Settings[K]) {
  return (store.get(key) as Settings[K] | undefined) ?? fallback;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  store.set(key, value);
}
