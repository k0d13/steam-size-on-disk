import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { NON_STEAM_APP_APPID_MASK, Steam } from "steambrew-utils";
import { logger } from "..";
import { getAppFolder, resolveAppFolder } from "../app-folders";
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

// ===== Sizes ===== //

// Sizes are kept on hand rather than fetched when a page opens, so that the
// stat can go in the moment Steam renders the stats bar, not a beat after
const steamAppSizes = new Map<number, AppSize>();

/** Steam knows the size of its own apps, and which install folder they're in. */
export async function refreshSteamAppSizes() {
  const installFolders = await Steam.InstallFolder.GetInstallFolders();

  steamAppSizes.clear();
  for (const folder of installFolders)
    for (const app of folder.vecApps)
      steamAppSizes.set(app.nAppID, {
        appId: app.nAppID,
        appName: app.strAppName,
        totalSize: app.nUsedSize,
        folderPath: folder.strFolderPath,
        driveName: folder.strDriveName,
        folderLabel: folder.strUserLabel,
        dlcSize: app.nDLCSize,
        workshopSize: app.nWorkshopSize,
        shaderSize: app.nShaderSize,
      });
}

/**
 * Non-Steam apps aren't in any install folder and have no size Steam knows
 * about, so their folder is detected from their shortcut (or set by hand) and
 * measured by the backend, then cached.
 */
function getNonSteamAppSize(appId: number): AppSize | undefined {
  const folderPath = getAppFolder(appId);
  if (!folderPath) return undefined;
  const cached = getCachedFolderSize(folderPath);
  if (!cached) return undefined;

  const app = Steam.AppStore.allApps.find((a) => a.appid === appId);
  return {
    appId,
    appName: app?.display_name ?? String(appId),
    folderPath,
    totalSize: cached.totalSize,
  };
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

// ===== Rendering ===== //

const ATTRIBUTE = "data-size-on-disk-root";
const roots = new Map<HTMLElement, Root>();

/** Put the size stat into every stats bar in a document, or take it out if there's no size. */
function sync(document: Document, appId: number) {
  // Steam throws stats bars away when navigating, so drop the roots left in them
  for (const [container, root] of roots)
    if (!container.isConnected) {
      root.unmount();
      roots.delete(container);
    }

  const app = getKnownAppSize(appId);
  const key = app?.totalSize ? `${app.appId}:${app.totalSize}` : undefined;

  for (const parent of document.querySelectorAll(`.${PlayBarClasses.GameStatsSection}`)) {
    let container = parent.querySelector<HTMLElement>(`:scope > [${ATTRIBUTE}]`);
    // The stats bar can be reused between apps, so checking it's there isn't enough
    if (container?.getAttribute(ATTRIBUTE) === (key ?? "")) continue;

    if (!app || !key) {
      if (container) {
        roots.get(container)?.unmount();
        roots.delete(container);
        container.remove();
      }
      continue;
    }

    if (!container) {
      container = document.createElement("div");
      // Achievements are added whenever Steam gets round to it, so ordering
      // with CSS keeps the stat in the same place whichever lands first
      container.style.order = "1";
      roots.set(container, createRoot(container));
      parent.appendChild(container);
    }
    container.setAttribute(ATTRIBUTE, key);

    logger.debug(`Rendering size on disk for '${app.appName}'`, { app });

    // Rendered synchronously, so the stat appears in the same frame as the
    // stats bar rather than as an empty box that fills in later
    const root = roots.get(container)!;
    flushSync(() =>
      root.render(
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
      ),
    );
  }
}

/**
 * Keep the size of an app, Steam or not, on its library page.
 *
 * Watches the document rather than waiting on location changes, which are only
 * polled every second, so the stat goes in as soon as Steam renders the page.
 */
export function watch(window: Window, getPathname: () => string | undefined) {
  let refreshedAppId: number | undefined;

  function getAppId() {
    const pathname = getPathname()?.replace("/routes", "");
    if (!pathname?.startsWith("/library/app/")) return undefined;
    const appId = Number(pathname.split("/")[3]);
    return Number.isNaN(appId) ? undefined : appId;
  }

  function update() {
    const appId = getAppId();
    if (appId === undefined) {
      refreshedAppId = undefined;
      return;
    }

    sync(window.document, appId);

    // Paint what's known first, then catch up in case it's changed since
    if (appId !== refreshedAppId) {
      refreshedAppId = appId;
      refreshAppSize(appId)
        .then(() => getAppId() === appId && sync(window.document, appId))
        .catch((e) => logger.debug(`Failed to refresh size of app ${appId}`, e));
    }
  }

  const observer = new MutationObserver(update);
  observer.observe(window.document, { childList: true, subtree: true });
  update();

  return () => observer.disconnect();
}
