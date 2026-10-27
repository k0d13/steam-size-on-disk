import { definePlugin, IconsModule } from "millennium";
import { refreshSteamAppSizes } from "./app-sizes";
import { SettingsPanel } from "./components/settings-panel";

/** @ffi */
export { appProperties } from "./patches/app-properties";
/** @ffi */
export { statsBar } from "./patches/stats-bar";

export default definePlugin(() => {
  // Fetched up front, so the first library page opened already has sizes to show
  refreshSteamAppSizes().catch((e) => console.debug("Failed to fetch Steam app sizes", e));

  return { title: "Size on Disk", icon: <IconsModule.HardDrive />, content: <SettingsPanel /> };
});
