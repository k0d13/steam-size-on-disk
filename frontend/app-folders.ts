import type { AppDetails } from "millennium";
import { createStore } from "./storage";

/** Steam hands out appids from here up to non-Steam shortcuts. */
const FIRST_NON_STEAM_APPID = 2147483648;

/** How long to wait for app details to be populated before giving up. */
const DETAILS_TIMEOUT_MS = 5000;

/**
 * A folder path per app, or `null` for an app whose folder has been cleared.
 * Clearing is remembered so it isn't undone by detecting the folder again.
 */
const appFolders = createStore<string | null>("size-on-disk:app-folders");

export function isNonSteamApp(appId: number) {
  return appId >= FIRST_NON_STEAM_APPID;
}

export function getAppFolder(appId: number) {
  return appFolders.get(appId) ?? undefined;
}

/** Whether an app's folder was cleared, opting it out of having a size. */
export function isAppFolderCleared(appId: number) {
  return appFolders.get(appId) === null;
}

export function setAppFolder(appId: number, path: string) {
  appFolders.set(appId, path);
}

/** Clear an app's folder, opting it out of having a size until one is picked. */
export function clearAppFolder(appId: number) {
  appFolders.set(appId, null);
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
    }, DETAILS_TIMEOUT_MS);

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
async function detectAppFolder(appId: number) {
  const details = await getShortcutDetails(appId);
  if (!details) return undefined;

  const startDir = cleanPath(details.strShortcutStartDir ?? "");
  if (startDir) return startDir;

  const exe = cleanPath(details.strShortcutExe ?? "");
  return exe ? dirname(exe) : undefined;
}

/** Detects and stores the folder from the app's shortcut when none is stored. */
export async function resolveAppFolder(appId: number) {
  const stored = appFolders.get(appId);
  if (stored !== undefined) return stored ?? undefined;

  const detected = await detectAppFolder(appId);
  if (!detected) {
    console.debug(`Could not detect folder for app ${appId}`);
    return undefined;
  }

  console.debug(`Detected folder for app ${appId}`, { detected });
  setAppFolder(appId, detected);
  return detected;
}
