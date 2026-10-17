import { createStore } from "./storage";

export interface FolderSize {
  /** Sum of every file's size, in bytes. */
  totalSize: number;
  fileCount: number;
  /** The folder's last write time when it was measured. */
  lastWriteTime: number;
}

// Versioned so a fix to how folders are measured throws away sizes measured by
// the broken version, instead of serving them until each folder happens to change
const folderSizes = createStore<FolderSize>("size-on-disk:folder-sizes:v2");

/** Get the cached size of a folder, however stale it may be. */
export function getCachedFolderSize(path: string) {
  return folderSizes.get(path);
}

export function forgetFolderSize(path: string) {
  folderSizes.delete(path);
}

/** Walk a folder and cache the result. Slow on large folders. */
export async function measureFolder(path: string) {
  const measured = await backend.MeasureFolder(path);
  if (!measured) {
    console.debug(`Failed to measure '${path}'`);
    forgetFolderSize(path);
    return undefined;
  }

  const size: FolderSize = {
    totalSize: measured.total_size,
    fileCount: measured.file_count,
    lastWriteTime: measured.last_write_time,
  };
  console.debug(`Measured '${path}'`, size);
  folderSizes.set(path, size);
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

  const lastWriteTime = await backend.GetFolderStat(path);
  if (lastWriteTime === null) {
    // The folder is gone, so the cached size is meaningless now
    forgetFolderSize(path);
    return undefined;
  }

  if (lastWriteTime === cached.lastWriteTime) return cached;
  return measureFolder(path);
}
