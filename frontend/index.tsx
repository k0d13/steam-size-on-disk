import { definePlugin, IconsModule } from "millennium";
import { refreshSteamAppSizes } from "./renderers/library-app";

/** @ffi */
export { appProperties } from "./renderers/app-properties";
/** @ffi */
export { libraryApp } from "./renderers/library-app";

export default definePlugin(() => {
  // Fetched up front, so the first library page opened already has sizes to show
  refreshSteamAppSizes().catch((e) => console.debug("Failed to fetch Steam app sizes", e));

  return { title: "Size on Disk", icon: <IconsModule.HardDrive /> };
});
