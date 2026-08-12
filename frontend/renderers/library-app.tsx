import { NON_STEAM_APP_APPID_MASK, Steam } from "steambrew-utils";
import { querySelectorAll, renderComponent } from "steambrew-utils/dom";
import { logger } from "..";
import { resolveAppFolder } from "../app-folders";
import { getCachedFolderSize, resolveFolderSize } from "../app-sizes";
import { PlayBarClasses, SizeOnDisk } from "../components/size-on-disk";

interface AppSize {
  appId: number;
  appName: string;
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

/** Steam knows the size of its own apps, and which install folder they're in. */
async function getSteamAppSize(appId: number): Promise<AppSize | undefined> {
  const installFolders = await Steam.InstallFolder.GetInstallFolders();

  for (const folder of installFolders)
    for (const app of folder.vecApps)
      if (app.nAppID === appId)
        return {
          appId: app.nAppID,
          appName: app.strAppName,
          totalSize: app.nUsedSize,
          folderPath: folder.strFolderPath,
          driveName: folder.strDriveName,
          folderLabel: folder.strUserLabel,
          dlcSize: app.nDLCSize,
          workshopSize: app.nWorkshopSize,
          shaderSize: app.nShaderSize,
        };

  return undefined;
}

/**
 * Non-Steam apps aren't in any install folder and have no size Steam knows
 * about, so their folder is detected from their shortcut (or set by hand) and
 * measured by the backend.
 */
function getNonSteamAppSize(appId: number, folderPath: string, totalSize: number): AppSize {
  const app = Steam.AppStore.allApps.find((a) => a.appid === appId);
  return {
    appId,
    appName: app?.display_name ?? String(appId),
    folderPath,
    totalSize,
  };
}

async function render(window: Window, app: AppSize) {
  if (!app.totalSize) return;

  logger.debug(
    `Patching library app '${app.appName}' to add size on disk`, //
    { window, app },
  );

  const parents = await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`);

  for (const parent of parents) {
    const element = renderComponent(
      <SizeOnDisk
        appId={app.appId}
        driveName={app.driveName}
        folderLabel={app.folderLabel}
        folderPath={app.folderPath}
        dlcSize={app.dlcSize ?? 0}
        workshopSize={app.workshopSize ?? 0}
        shaderSize={app.shaderSize ?? 0}
        totalSize={app.totalSize}
      />,
    );

    const existing = parent.querySelector("[data-size-on-disk]");
    if (existing) existing.replaceWith(element);
    else parent.appendChild(element);
  }
}

/** Add the size of an app, Steam or not, to its library page. */
export async function patch(window: Window, appId: number) {
  if (appId < NON_STEAM_APP_APPID_MASK) {
    const app = await getSteamAppSize(appId);
    if (app) await render(window, app);
    return;
  }

  const folderPath = await resolveAppFolder(appId);
  if (!folderPath) return;

  // Paint whatever size was measured last time first, so a revisited page fills
  // in instantly, then measure again in case the folder has changed since
  const cached = getCachedFolderSize(folderPath);
  if (cached) await render(window, getNonSteamAppSize(appId, folderPath, cached.totalSize));

  const size = await resolveFolderSize(folderPath);
  if (size && size.totalSize !== cached?.totalSize) {
    await render(window, getNonSteamAppSize(appId, folderPath, size.totalSize));
  }
}
