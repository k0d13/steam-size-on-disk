// Versioned so a fix to how folders are measured throws away sizes measured by
// the broken version, instead of serving them until each folder happens to change
const STORAGE_KEY = "size-on-disk:folder-sizes:v2";

export interface FolderSize {
  /** Sum of every file's size, in bytes. */
  totalSize: number;
  /** Number of files counted. */
  fileCount: number;
  /** The folder's last write time when it was measured. */
  lastWriteTime: number;
  /** Unix timestamp of when it was measured. */
  measuredAt: number;
}

type FolderSizes = Record<string, FolderSize>;

function readAll(): FolderSizes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as FolderSizes;
  } catch (e) {
    console.debug("Failed to read cached folder sizes", e);
    return {};
  }
}

function writeAll(sizes: FolderSizes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch (e) {
    console.debug("Failed to cache folder sizes", e);
  }
}

/** Get the cached size of a folder, however stale it may be. */
export function getCachedFolderSize(path: string): FolderSize | undefined {
  return readAll()[path];
}

function cacheFolderSize(path: string, size: FolderSize) {
  const all = readAll();
  all[path] = size;
  writeAll(all);
}

/** Forget the cached size of a folder, or of every folder. */
export function forgetFolderSize(path?: string) {
  if (path === undefined) return writeAll({});
  const all = readAll();
  delete all[path];
  writeAll(all);
}

/** Walk a folder and cache the result. Slow on large folders. */
export async function measureFolder(path: string) {
  const measured = await backend.measure_folder(path);
  if (!measured) {
    console.debug(`Failed to measure '${path}'`);
    forgetFolderSize(path);
    return undefined;
  }

  const size: FolderSize = {
    totalSize: measured.total_size,
    fileCount: measured.file_count,
    lastWriteTime: measured.last_write_time,
    measuredAt: Math.floor(Date.now() / 1000),
  };
  console.debug(`Measured '${path}'`, size);
  cacheFolderSize(path, size);
  return size;
}

/**
 * Get the size of a folder, measuring it again only when the folder's last
 * write time has changed since it was cached.
 *
 * Nested writes don't touch the folder's own write time, so a game that patched
 * itself in place keeps its cached size until it's measured again by hand.
 */
export async function resolveFolderSize(path: string) {
  const cached = getCachedFolderSize(path);
  if (!cached) return measureFolder(path);

  const lastWriteTime = await backend.get_folder_stat(path);
  if (lastWriteTime === null) {
    // The folder is gone, so the cached size is meaningless now
    forgetFolderSize(path);
    return undefined;
  }

  if (lastWriteTime === cached.lastWriteTime) return cached;
  return measureFolder(path);
}
