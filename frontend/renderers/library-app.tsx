import { NON_STEAM_APP_APPID_MASK, Steam } from "steambrew-utils";
import { querySelectorAll, renderComponent } from "steambrew-utils/dom";
import { logger } from "..";
import { PlayBarClasses, SizeOnDisk } from "../components/play-bar";

export async function patch(
  window: Window,
  folder: Steam.InstallFolder,
  app: Steam.InstallFolderApp,
) {
  if (app.nAppID >= NON_STEAM_APP_APPID_MASK) return;

  logger.debug(
    `Patching library app '${app.strAppName}' to add size on disk`, //
    { window, app },
  );

  const parents = await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`);

  for (const parent of parents) {
    if (app.nUsedSize) {
      const component = (
        <SizeOnDisk
          appId={app.nAppID}
          driveName={folder.strDriveName}
          folderLabel={folder.strUserLabel}
          folderPath={folder.strFolderPath}
          dlcSize={app.nDLCSize}
          workshopSize={app.nWorkshopSize}
          shaderSize={app.nShaderSize}
          totalSize={app.nUsedSize}
        />
      );
      const element = renderComponent(component);

      const existing = parent.querySelector("[data-size-on-disk]");
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }
  }
}
