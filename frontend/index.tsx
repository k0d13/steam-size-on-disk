import { Steam } from "steambrew-utils";
import { Logger } from "steambrew-utils/logger";
import { onPopupCreate, PopupType, onLocationChange } from "steambrew-utils/watchers";
import { patch as patchLibraryApp } from "./renderers/library-app";

export const logger = new Logger("Steam Size On Disk");

export default async function OnPluginLoad() {
  onPopupCreate((popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Main Window Location ===== //

    onLocationChange(
      () => {
        if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
        if (type === PopupType.Gamepad) return popup.window?.opener?.location;
      },
      async ({ pathname }) => {
        if (pathname.startsWith("/library/app/")) {
          const appId = Number(pathname.split("/")[3]);
          const installFolders = await Steam.InstallFolder.GetInstallFolders();
          for (const folder of installFolders)
            for (const app of folder.vecApps)
              if (app.nAppID === appId) {
                patchLibraryApp(popup.window!, folder, app);
                break;
              }
        }
      },
    );
  });
}
