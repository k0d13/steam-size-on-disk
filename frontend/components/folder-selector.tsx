import { Button, findClassModule, findModuleExport, TextField } from "@steambrew/client";
import { useCallback, useEffect, useState } from "react";
import type { Steam } from "steambrew-utils";
import { logger } from "..";
import {
  clearAppFolder,
  getAppFolder,
  isAppFolderCleared,
  resolveAppFolder,
  setAppFolder,
} from "../app-folders";
import {
  type FolderSize,
  forgetFolderSize,
  getCachedFolderSize,
  measureFolder,
  resolveFolderSize,
} from "../app-sizes";

/** How long "Calculating..." stays up for, so that it's readable at all. */
const MEASURE_FEEDBACK_MS = 600;

const SettingsStyles = findClassModule((m) => m.SectionTopLine)!;

const formatBytes = //
  findModuleExport((e) => e?.toString?.()?.includes('"Tera"'));

export function FolderSelector({ app }: { app: Steam.AppOverview }) {
  const [path, setPath] = useState(() => getAppFolder(app.appid));
  const [size, setSize] = useState<FolderSize | undefined>(() =>
    path ? getCachedFolderSize(path) : undefined,
  );
  const [measuring, setMeasuring] = useState(false);
  const [cleared, setCleared] = useState(() => isAppFolderCleared(app.appid));

  // Nothing stored yet, so try to detect it from the app's shortcut
  useEffect(() => {
    if (path || cleared) return;

    let cancelled = false;
    resolveAppFolder(app.appid).then((detected) => {
      if (!cancelled && detected) setPath(detected);
    });

    return () => {
      cancelled = true;
    };
  }, [app.appid, cleared, path]);

  // Measure whatever folder we ended up with, reusing the cached size unless
  // the folder has been written to since
  useEffect(() => {
    if (!path) return;

    let cancelled = false;
    setMeasuring(true);
    resolveFolderSize(path)
      .then((resolved) => {
        if (!cancelled) setSize(resolved);
      })
      .finally(() => {
        if (!cancelled) setMeasuring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const selectFolder = useCallback(async () => {
    let result: unknown;
    try {
      result = await SteamClient.System.OpenFileDialog({
        bChooseDirectory: true,
        strTitle: "Select Installed Files Folder",
      });
    } catch (e) {
      // Rejects when the dialog is cancelled
      logger.debug("Folder dialog cancelled", e);
      return;
    }

    // Returns an OperationResponse instead of a path when nothing is selected
    if (typeof result !== "string" || result === "") return;

    setAppFolder(app.appid, result);
    setSize(getCachedFolderSize(result));
    setCleared(false);
    setPath(result);
  }, [app.appid]);

  // Clearing is remembered rather than forgotten, so that it reads as "don't
  // show a size for this app" instead of being undone by detecting the
  // shortcut's folder again on the next visit
  const clearFolder = useCallback(() => {
    if (path) forgetFolderSize(path);
    clearAppFolder(app.appid);
    setSize(undefined);
    setCleared(true);
    setPath(undefined);
  }, [app.appid, path]);

  // A game that patched itself in place doesn't change its folder's own write
  // time, so measuring again by hand is the only way to catch that
  const recalculate = useCallback(async () => {
    if (!path) return;

    setMeasuring(true);
    try {
      // Measuring a small folder can finish quicker than the UI can show that
      // it started, which reads as the button having done nothing at all
      const [measured] = await Promise.all([
        measureFolder(path),
        new Promise((resolve) => setTimeout(resolve, MEASURE_FEEDBACK_MS)),
      ]);
      setSize(measured);
    } finally {
      setMeasuring(false);
    }
  }, [path]);

  const buttonClassName = `${SettingsStyles.SettingsDialogButton} ${SettingsStyles.ShortcutChange} DialogButton`;

  return (
    <div>
      <div className={SettingsStyles.Title}>Folder</div>
      <div>
        Set the folder this app is installed in, so its size on disk can be calculated. Clear it to
        stop showing a size for this app entirely.
      </div>
      <div className={SettingsStyles.AsyncBackedInputChildren}>
        <TextField
          // @ts-expect-error - placeholder is a valid prop but not typed
          placeholder={cleared ? "Not showing a size for this app" : "No folder selected"}
          value={path ?? ""}
          readOnly
        />
        <Button className={buttonClassName} onClick={selectFolder}>
          {path ? "Change" : "Select"}
        </Button>
        {path && (
          <Button className={buttonClassName} onClick={clearFolder}>
            Clear
          </Button>
        )}
      </div>
      {path && (
        <>
          <div className={SettingsStyles.Title}>Size on Disk</div>
          <div>
            {measuring
              ? "Calculating..."
              : size
                ? `${formatBytes(size.totalSize, 2)} across ${size.fileCount} files`
                : "Could not calculate the size of this folder."}
          </div>
          <div className={SettingsStyles.AsyncBackedInputChildren}>
            <Button className={buttonClassName} onClick={recalculate} disabled={measuring}>
              {measuring ? "Calculating..." : "Recalculate"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
