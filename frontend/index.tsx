import { NON_STEAM_APP_APPID_MASK, Steam } from "steambrew-utils";
import { Logger } from "steambrew-utils/logger";
import { onPopupCreate, PopupType, onLocationChange } from "steambrew-utils/watchers";
import {
  patch as patchLibraryApp,
  patchNonSteam as patchNonSteamLibraryApp,
} from "./renderers/library-app";

export const logger = new Logger("Steam Size On Disk");

async function handleLocationChange(window: Window, pathname: string) {
  if (!pathname.startsWith("/library/app/")) return;
  const appId = Number(pathname.split("/")[3]);

  if (appId >= NON_STEAM_APP_APPID_MASK) {
    const overview = Steam.AppStore.allApps.find((app) => app.appid === appId);
    if (overview) patchNonSteamLibraryApp(window, overview);
    return;
  }

  const installFolders = await Steam.InstallFolder.GetInstallFolders();
  for (const folder of installFolders)
    for (const app of folder.vecApps)
      if (app.nAppID === appId) {
        patchLibraryApp(window, folder, app);
        return;
      }
}

export default async function OnPluginLoad() {
  onPopupCreate(async (popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    if (type === PopupType.Desktop) {
      // Event-based: reacts the instant Steam's own browser finishes a
      // navigation, instead of onLocationChange below, which polls a
      // SHARED, hardcoded 1s interval (WATCHER_LOCATION_POLL_INTERVAL in
      // steambrew-utils/dist/watchers/index.mjs) that every plugin using it
      // is stuck with. finished-request is already a first-class, typed
      // part of steambrew-utils (see MainWindowBrowser in its .d.mts) —
      // this isn't bypassing the package, just using a faster part of it.
      let mwbm = Steam.MainWindowBrowserManager;
      for (let i = 0; i < 50 && !mwbm; i++) {
        await new Promise((r) => setTimeout(r, 100));
        mwbm = Steam.MainWindowBrowserManager;
      }
      if (!mwbm) {
        logger.info("MainWindowBrowserManager never became available; falling back to polling");
      } else {
        mwbm.m_browser.on("finished-request", () =>
          handleLocationChange(popup.window!, mwbm!.m_lastLocation.pathname),
        );
        if (mwbm.m_lastLocation?.pathname)
          handleLocationChange(popup.window!, mwbm.m_lastLocation.pathname);
        return;
      }
    }

    // Gamepad/Big Picture mode, and the Desktop fallback above: no proven
    // fast-path equivalent for Gamepad yet, so this keeps the original,
    // slower (~1s) polling-based watcher rather than leaving it unhandled.
    onLocationChange(
      () => {
        if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
        if (type === PopupType.Gamepad) return popup.window?.opener?.location;
      },
      async ({ pathname }) => handleLocationChange(popup.window!, pathname),
    );
  });
}
