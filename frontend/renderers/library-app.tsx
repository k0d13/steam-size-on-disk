import { useEffect, useState } from "react";
import { getAppFolder, NON_STEAM_APP_APPID_MASK, resolveAppFolder } from "../app-folders";
import { getCachedFolderSize, resolveFolderSize } from "../app-sizes";
import { SizeOnDisk } from "../components/size-on-disk";

interface AppSize {
  appId: number;
  /** Total size of the app on disk, in bytes. */
  totalSize: number;
  folderPath: string;
  /** Only known for Steam apps, which live in a labelled install folder. */
  driveName?: string;
  /** Only known for Steam apps, which live in a labelled install folder. */
  folderLabel?: string;
  dlcSize?: number;
  workshopSize?: number;
  shaderSize?: number;
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

interface Bridge {
  InstallFolder: { GetInstallFolders(): Promise<InstallFolder[]> };
}

// Sizes are kept on hand rather than fetched when a page opens, so that the
// stat renders with the stats bar's first frame, not a beat after
const steamAppSizes = new Map<number, AppSize>();

/** Steam knows the size of its own apps, and which install folder they're in. */
export async function refreshSteamAppSizes() {
  const bridge = SteamClient as unknown as Bridge;
  const installFolders = await bridge.InstallFolder.GetInstallFolders();

  steamAppSizes.clear();
  for (const folder of installFolders)
    for (const app of folder.vecApps)
      steamAppSizes.set(app.nAppID, {
        appId: app.nAppID,
        totalSize: app.nUsedSize,
        folderPath: folder.strFolderPath,
        driveName: folder.strDriveName,
        folderLabel: folder.strUserLabel,
        dlcSize: app.nDLCSize,
        workshopSize: app.nWorkshopSize,
        shaderSize: app.nShaderSize,
      });
}

/** Non-Steam apps have no size Steam knows, so their folder is measured and cached. */
function getNonSteamAppSize(appId: number): AppSize | undefined {
  const folderPath = getAppFolder(appId);
  if (!folderPath) return undefined;
  const cached = getCachedFolderSize(folderPath);
  if (!cached) return undefined;

  return { appId, folderPath, totalSize: cached.totalSize };
}

/** Whatever size is known for an app right now, without waiting on anything. */
function getKnownAppSize(appId: number) {
  return appId < NON_STEAM_APP_APPID_MASK ? steamAppSizes.get(appId) : getNonSteamAppSize(appId);
}

/** Bring an app's size up to date, measuring its folder again if it's changed. */
async function refreshAppSize(appId: number) {
  if (appId < NON_STEAM_APP_APPID_MASK) return refreshSteamAppSizes();

  const folderPath = await resolveAppFolder(appId);
  if (folderPath) await resolveFolderSize(folderPath);
}

/** The props the stats bar passes each stat, of which only the app is read. */
interface StatsBarProps {
  overview?: { appid: number };
}

/** Rendered by Steam in the library stats bar, through the backend's patch. */
function LibraryAppSizeOnDisk({ overview }: StatsBarProps) {
  const appId = overview?.appid;
  const [app, setApp] = useState(() => (appId === undefined ? undefined : getKnownAppSize(appId)));

  // Paint what's known first, then catch up in case it's changed since
  useEffect(() => {
    if (appId === undefined) return setApp(undefined);
    setApp(getKnownAppSize(appId));

    let current = true;
    refreshAppSize(appId)
      .then(() => current && setApp(getKnownAppSize(appId)))
      .catch((e) => console.debug(`Failed to refresh size of app ${appId}`, e));
    return () => {
      current = false;
    };
  }, [appId]);

  if (!app?.totalSize) return null;

  return (
    <SizeOnDisk
      appId={app.appId}
      driveName={app.driveName}
      folderLabel={app.folderLabel}
      folderPath={app.folderPath}
      dlcSize={app.dlcSize ?? 0}
      workshopSize={app.workshopSize ?? 0}
      shaderSize={app.shaderSize ?? 0}
      totalSize={app.totalSize}
    />
  );
}

export const libraryApp = { SizeOnDisk: LibraryAppSizeOnDisk };
