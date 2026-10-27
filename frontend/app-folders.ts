import type { AppDetails } from "millennium";
import { createStore } from "./storage";

/** Steam hands out appids from here up to non-Steam shortcuts. */
const FIRST_NON_STEAM_APPID = 2147483648;

/** How long to wait for app details to be populated before giving up. */
const DETAILS_TIMEOUT_MS = 5000;

/**
 * A folder path per app picked in its properties, or `null` for an app whose folder has
 * been cleared. Clearing is remembered so it isn't undone by detecting the folder again.
 */
const pickedFolders = createStore<string | null>("size-on-disk:picked-folders");

/**
 * The folder last detected from each app's shortcut. Detected again on every refresh, as
 * a launcher can move its shortcut's folder, say once the game it launches is installed,
 * and kept only so the stat can be drawn before that finishes.
 */
const detectedFolders = createStore<string>("size-on-disk:detected-folders");

/**
 * Detected and picked folders alike, from before they were kept apart. Each app's entry is
 * sorted into one or the other the next time its folder is resolved.
 */
const legacyFolders = createStore<string | null>("size-on-disk:app-folders");

export function isNonSteamApp(appId: number) {
  return appId >= FIRST_NON_STEAM_APPID;
}

function getPickedFolder(appId: number) {
  const picked = pickedFolders.get(appId);
  return picked === undefined ? legacyFolders.get(appId) : picked;
}

export function getAppFolder(appId: number) {
  const picked = getPickedFolder(appId);
  return picked === undefined ? detectedFolders.get(appId) : (picked ?? undefined);
}

/** Whether an app's folder was cleared, opting it out of having a size. */
export function isAppFolderCleared(appId: number) {
  return getPickedFolder(appId) === null;
}

export function setAppFolder(appId: number, path: string) {
  pickedFolders.set(appId, path);
  legacyFolders.delete(appId);
}

/** Clear an app's folder, opting it out of having a size until one is picked. */
export function clearAppFolder(appId: number) {
  pickedFolders.set(appId, null);
  legacyFolders.delete(appId);
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
 * the shortcut's start directory and falling back to the executable's parent,
 * which is also returned so a folder stored from it can be recognised.
 */
async function detectAppFolder(appId: number) {
  const details = await getShortcutDetails(appId);
  if (!details) return undefined;

  const exe = cleanPath(details.strShortcutExe ?? "");
  const exeFolder = exe ? dirname(exe) : undefined;
  const startDir = cleanPath(details.strShortcutStartDir ?? "");
  return { folder: startDir || exeFolder, exeFolder };
}

/**
 * A folder stored before picked and detected ones were kept apart is taken as detected
 * when detection would still find it, or would have from the executable, and as picked
 * otherwise.
 */
function sortLegacyFolder(appId: number, detection: Awaited<ReturnType<typeof detectAppFolder>>) {
  const legacy = legacyFolders.get(appId);
  if (legacy === undefined) return;

  legacyFolders.delete(appId);
  if (legacy !== null && (legacy === detection?.folder || legacy === detection?.exeFolder)) return;
  pickedFolders.set(appId, legacy);
}

/** The app's picked folder, or else the one detected from its shortcut as it is now. */
export async function resolveAppFolder(appId: number) {
  if (pickedFolders.get(appId) !== undefined) return pickedFolders.get(appId) ?? undefined;

  const detection = await detectAppFolder(appId);
  sortLegacyFolder(appId, detection);
  const picked = pickedFolders.get(appId);
  if (picked !== undefined) return picked ?? undefined;

  const detected = detection?.folder;
  if (!detected) {
    console.debug(`Could not detect folder for app ${appId}`);
    detectedFolders.delete(appId);
    return undefined;
  }

  if (detectedFolders.get(appId) !== detected) {
    console.debug(`Detected folder for app ${appId}`, { detected });
    detectedFolders.set(appId, detected);
  }
  return detected;
}
