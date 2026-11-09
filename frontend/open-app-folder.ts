import { isNonSteamApp } from "./app-folders";
import type { AppSize } from "./app-sizes";

/** How long to wait for app details to be populated before giving up. */
const DETAILS_TIMEOUT_MS = 5000;

/** The one field we read. Millennium doesn't type the install folder. */
interface InstallFolderDetails {
  strInstallFolder?: string;
}

/** Steam's own idea of where an app is installed, once its details are populated. */
function getSteamInstallFolder(appId: number) {
  return new Promise<string | undefined>((resolve) => {
    let registration: { unregister(): void } | undefined;
    const timeout = setTimeout(() => {
      registration?.unregister();
      resolve(undefined);
    }, DETAILS_TIMEOUT_MS);

    registration = SteamClient.Apps.RegisterForAppDetails(appId, (details) => {
      const folder = (details as InstallFolderDetails | undefined)?.strInstallFolder;
      if (!folder) return;
      clearTimeout(timeout);
      registration?.unregister();
      resolve(folder);
    });
  });
}

/**
 * Open an app's own folder in the system file explorer.
 * Returns false when the folder couldn't be worked out, so the caller can fall back.
 */
export async function openAppFolder(size: AppSize) {
  // A non-Steam app's folder path is its own folder, but a Steam app's is the
  // library folder it's installed in, which holds every other app too
  const folder = isNonSteamApp(size.appId)
    ? size.folderPath
    : await getSteamInstallFolder(size.appId);
  if (!folder) return false;

  SteamClient.System.OpenLocalDirectoryInSystemExplorer(folder);
  return true;
}
