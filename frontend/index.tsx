import { Steam } from "steambrew-utils";
import { Logger } from "steambrew-utils/logger";
import { onLocationChange, onPopupCreate, PopupType } from "steambrew-utils/watchers";
import { register as registerAppProperties } from "./renderers/app-properties";
import { patch as patchLibraryApp } from "./renderers/library-app";

export const logger = new Logger("Steam Size On Disk");

export default async function OnPluginLoad() {
  registerAppProperties();

  onPopupCreate((popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Main Window Location ===== //

    onLocationChange(
      () => {
        if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
        if (type === PopupType.Gamepad) return popup.window?.opener?.location;
      },
      async ({ pathname }) => {
        if (!pathname.startsWith("/library/app/")) return;

        const appId = Number(pathname.split("/")[3]);
        if (Number.isNaN(appId)) return;

        await patchLibraryApp(popup.window!, appId);
      },
    );
  });
}
