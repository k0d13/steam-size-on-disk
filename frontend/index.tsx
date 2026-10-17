import { definePlugin, IconsModule } from "millennium";
import { register as registerAppProperties } from "./renderers/app-properties";
import { refreshSteamAppSizes } from "./renderers/library-app";

/** @ffi */
export { libraryApp } from "./renderers/library-app";

export default definePlugin(() => {
  registerAppProperties();

  // Fetched up front, so the first library page opened already has sizes to show
  refreshSteamAppSizes().catch((e) => console.debug("Failed to fetch Steam app sizes", e));

  return { title: "Size on Disk", icon: <IconsModule.HardDrive /> };
});
