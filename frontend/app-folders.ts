import type { AppDetails } from "@steambrew/client";
import { logger } from ".";

const STORAGE_KEY = "size-on-disk:app-folders";

/** How long to wait for app details to be populated before giving up. */
const DETAILS_TIMEOUT = 5000;

/**
 * A stored folder path, or `null` for an app whose folder has been cleared.
 *
 * Clearing has to be remembered, rather than just dropping the entry, so that
 * "I don't want a size for this game" isn't undone by detecting its folder from
 * its shortcut all over again on the next visit.
 */
type AppFolders = Record<string, string | null>;

function readAll(): AppFolders {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as AppFolders;
  } catch (e) {
    logger.debug("Failed to read stored app folders", e);
    return {};
  }
}

function writeAll(folders: AppFolders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    logger.debug("Failed to store app folder", e);
  }
}

/** Get the stored folder path for an app, if it has one. */
export function getAppFolder(appId: number): string | undefined {
  return readAll()[String(appId)] ?? undefined;
}

/** Whether an app's folder was cleared, opting it out of having a size. */
export function isAppFolderCleared(appId: number) {
  return readAll()[String(appId)] === null;
}

/** Store the folder path for an app. */
export function setAppFolder(appId: number, path: string) {
  const all = readAll();
  all[String(appId)] = path;
  writeAll(all);
}

/** Clear an app's folder, opting it out of having a size until one is picked. */
export function clearAppFolder(appId: number) {
  const all = readAll();
  all[String(appId)] = null;
  writeAll(all);
}

/**
 * Get the details for an app, waiting until its shortcut data is populated.
 *
 * The details callback fires immediately, but the shortcut fields are often
 * still empty on that first call, so we keep listening until they aren't.
 */
function getShortcutDetails(appId: number) {
  return new Promise<AppDetails | undefined>((resolve) => {
    let registration: { unregister(): void } | undefined;
    const timeout = setTimeout(() => {
      registration?.unregister();
      resolve(undefined);
    }, DETAILS_TIMEOUT);

    registration = SteamClient.Apps.RegisterForAppDetails(appId, (details) => {
      if (!details?.strShortcutExe) return;
      clearTimeout(timeout);
      registration?.unregister();
      resolve(details);
    });
  });
}

/** Strip surrounding quotes and trailing separators from a path. */
function cleanPath(path: string) {
  return path
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/[/\\]+$/, "");
}

/** Get the parent directory of a path, or undefined if it has no parent. */
function dirname(path: string) {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index > 0 ? path.slice(0, index) : undefined;
}

/**
 * Detect the install folder of a non-Steam app from its shortcut, preferring
 * the shortcut's start directory and falling back to the executable's parent.
 */
export async function detectAppFolder(appId: number) {
  const details = await getShortcutDetails(appId);
  if (!details) return undefined;

  const startDir = cleanPath(details.strShortcutStartDir ?? "");
  if (startDir) return startDir;

  const exe = cleanPath(details.strShortcutExe ?? "");
  return exe ? dirname(exe) : undefined;
}

/**
 * Get the folder for an app, detecting and storing it from the app's shortcut
 * when nothing has been stored yet. Stored paths always win, so a folder picked
 * by hand is never overwritten, and a cleared one is never filled back in.
 */
export async function resolveAppFolder(appId: number) {
  const stored = getAppFolder(appId);
  if (stored) return stored;
  if (isAppFolderCleared(appId)) return undefined;

  const detected = await detectAppFolder(appId);
  if (!detected) {
    logger.debug(`Could not detect folder for app ${appId}`);
    return undefined;
  }

  logger.debug(`Detected folder for app ${appId}`, { detected });
  setAppFolder(appId, detected);
  return detected;
}
