import { Steam } from "steambrew-utils";
import { Logger } from "steambrew-utils/logger";
import { onPopupCreate, PopupType } from "steambrew-utils/watchers";
import { register as registerAppProperties } from "./renderers/app-properties";
import { refreshSteamAppSizes, watch as watchLibraryApp } from "./renderers/library-app";

export const logger = new Logger("Steam Size On Disk");

export default async function OnPluginLoad() {
  registerAppProperties();

  // Fetched up front, so the first library page opened already has sizes to show
  refreshSteamAppSizes().catch((e) => logger.debug("Failed to fetch Steam app sizes", e));

  onPopupCreate((popup, type, { onClose }) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Library App Pages ===== //

    const getLocation = () => {
      if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
      if (type === PopupType.Gamepad) return popup.window?.opener?.location;
    };

    onClose(watchLibraryApp(popup.window!, () => getLocation()?.pathname));
  });
}
