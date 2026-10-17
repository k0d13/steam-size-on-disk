import { definePlugin, IconsModule } from "millennium";
import { onPopupCreate, PopupType } from "./popups";
import { register as registerAppProperties } from "./renderers/app-properties";
import { refreshSteamAppSizes, watch as watchLibraryApp } from "./renderers/library-app";

export default definePlugin(() => {
  registerAppProperties();

  // Fetched up front, so the first library page opened already has sizes to show
  refreshSteamAppSizes().catch((e) => console.debug("Failed to fetch Steam app sizes", e));

  onPopupCreate((popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Library App Pages ===== //

    const getLocation = () => {
      if (type === PopupType.Desktop) return window.MainWindowBrowserManager?.m_lastLocation;
      if (type === PopupType.Gamepad) return popup.window?.opener?.location;
    };

    return watchLibraryApp(popup.window!, () => getLocation()?.pathname);
  });

  return { title: "Size on Disk", icon: <IconsModule.HardDrive /> };
});
