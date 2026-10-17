/** A record kept in localStorage under one key. Parsed once and kept in memory, since it's read on every library page. */
export function createStore<T>(key: string) {
  let entries: Record<string, T> | undefined;

  function load() {
    if (entries) return entries;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
      entries = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, T>) : {};
    } catch (e) {
      console.debug(`Failed to read '${key}'`, e);
      entries = {};
    }
    return entries;
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.debug(`Failed to write '${key}'`, e);
    }
  }

  return {
    get(id: string | number): T | undefined {
      return load()[id];
    },
    set(id: string | number, value: T) {
      load()[id] = value;
      save();
    },
    delete(id: string | number) {
      delete load()[id];
      save();
    },
  };
}
