import { getAppFolder, isNonSteamApp, resolveAppFolder } from "./app-folders";
import { getCachedFolderSize, resolveFolderSize } from "./folder-sizes";

export interface AppSize {
  appId: number;
  /** Everything the app takes up on disk, in bytes, DLC and the rest included. */
  totalSize: number;
  dlcSize: number;
  workshopSize: number;
  shaderSize: number;
  folderPath: string;
  // Only known for Steam apps, which live in a labelled install folder
  driveName?: string;
  folderLabel?: string;
}

/** Only the fields we read. Millennium only types the string sizes, not these numbers. */
interface InstallFolder {
  strFolderPath: string;
  strDriveName: string;
  strUserLabel: string;
  vecApps: {
    nAppID: number;
    nUsedSize: number;
    nDLCSize: number;
    nWorkshopSize: number;
    nShaderSize: number;
  }[];
}

interface InstallFolderClient {
  InstallFolder: { GetInstallFolders(): Promise<InstallFolder[]> };
}

// Kept on hand rather than fetched when a page opens, so that the stat renders
// with the stats bar's first frame, not a beat after
const steamAppSizes = new Map<number, AppSize>();

/** Steam knows the size of its own apps, and which install folder they're in. */
export async function refreshSteamAppSizes() {
  const client = SteamClient as unknown as InstallFolderClient;
  const installFolders = await client.InstallFolder.GetInstallFolders();

  steamAppSizes.clear();
  for (const folder of installFolders)
    for (const app of folder.vecApps)
      steamAppSizes.set(app.nAppID, {
        appId: app.nAppID,
        totalSize: app.nUsedSize,
        dlcSize: app.nDLCSize,
        workshopSize: app.nWorkshopSize,
        shaderSize: app.nShaderSize,
        folderPath: folder.strFolderPath,
        driveName: folder.strDriveName,
        folderLabel: folder.strUserLabel,
      });
}

/** Non-Steam apps have no size Steam knows, so their folder is measured and cached. */
function getNonSteamAppSize(appId: number): AppSize | undefined {
  const folderPath = getAppFolder(appId);
  const cached = folderPath && getCachedFolderSize(folderPath);
  if (!cached) return undefined;

  return {
    appId,
    totalSize: cached.totalSize,
    dlcSize: 0,
    workshopSize: 0,
    shaderSize: 0,
    folderPath,
  };
}

/** Whatever size is known for an app right now, without waiting on anything. */
export function getKnownAppSize(appId: number) {
  return isNonSteamApp(appId) ? getNonSteamAppSize(appId) : steamAppSizes.get(appId);
}

/** Bring an app's size up to date, measuring its folder again if it's changed. */
export async function refreshAppSize(appId: number) {
  if (!isNonSteamApp(appId)) return refreshSteamAppSizes();

  const folderPath = await resolveAppFolder(appId);
  if (folderPath) await resolveFolderSize(folderPath);
}
