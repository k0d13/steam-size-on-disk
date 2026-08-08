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

// Non-Steam (shortcut) games never appear in InstallFolder.GetInstallFolders()
// — that system only covers apps Steam itself installs and manages, and
// shortcuts are neither. There's no DLC/workshop/shader breakdown for them
// either, since that data is specific to InstallFolderApp. What IS available
// is size_on_disk on the generic AppOverview (steambrew-utils' own type,
// covering any app, Steam or not) — how reliably Steam actually populates
// this for a given shortcut is the one thing here that needs real testing
// rather than just reading the types.
export async function patchNonSteam(window: Window, app: Steam.AppOverview) {
  const totalSize = Number(app.size_on_disk);
  if (!totalSize) return;

  logger.debug(
    `Patching non-Steam library app '${app.display_name}' to add size on disk`, //
    { window, app },
  );

  const parents = await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`);

  for (const parent of parents) {
    const component = <SizeOnDisk appId={app.appid} totalSize={totalSize} />;
    const element = renderComponent(component);

    const existing = parent.querySelector("[data-size-on-disk]");
    if (existing) existing.replaceWith(element);
    else parent.appendChild(element);
  }
}
