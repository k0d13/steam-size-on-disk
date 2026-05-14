import {
  findClassModule,
  findModuleDetailsByExport,
  findModuleExport,
  IconsModule,
} from "@steambrew/client";

const PlayBar = findClassModule((m) => m.GameStat) as Record<string, string>;
export const PlayBarClasses = PlayBar;

const formatBytes = //
  findModuleExport((e) => e?.toString?.()?.includes('"Tera"'));
const t = findModuleExport((e) => e?.toString?.()?.match(/\.LocalizeString\([a-z]\)/g));
const Tooltip = findModuleDetailsByExport(
  (m) =>
    m?.toString?.()?.includes(`divProps`) &&
    m?.toString?.()?.includes(`tooltipProps`) &&
    m?.toString?.()?.includes(`toolTipContent`) &&
    m?.toString?.()?.includes(`tool-tip-source`),
)?.[1];
const getNavigator = findModuleExport((e) =>
  e?.toString?.()?.includes('"No global navigator context found!"'),
);

interface SizeOnDiskProps {
  appId: number;
  driveName: string;
  folderLabel: string;
  folderPath: string;
  dlcSize: number;
  workshopSize: number;
  shaderSize: number;
  totalSize: number;
}

export function SizeOnDisk({
  appId,
  driveName,
  folderLabel,
  dlcSize,
  workshopSize,
  shaderSize,
  totalSize,
}: SizeOnDiskProps) {
  // The only "Size on Disk" translation is for sorting, so while it makes sense still in English,
  // it's not ideal for other languages, so we just use the app size instead in those cases
  const sizeOnDiskLabel = t("#Library_SortBySizeOnDisk");
  const sizeLabel = t("#ContentManagement_AppSize");
  const label = sizeOnDiskLabel === "Size on Disk" ? sizeOnDiskLabel : sizeLabel;

  const navigator = getNavigator();
  const appSize = totalSize - dlcSize - workshopSize - shaderSize;

  const toolTipContent = (
    <>
      {t(
        "#AppProperties_LocalFilesSizeOnDrive",
        formatBytes(totalSize, 2),
        `${folderLabel} (${driveName})`,
      )}
      <br />
      <span style={{ textTransform: "capitalize" }}>{t("#AppType_Singular_2")}</span>:{" "}
      {formatBytes(appSize, 2)}
      {dlcSize > 0 && (
        <>
          <br />
          {t("#ContentManagement_UsedByDLC")}: {formatBytes(dlcSize, 2)}
        </>
      )}
      {workshopSize > 0 && (
        <>
          <br />
          {t("#ContentManagement_UsedByWorkshop")}: {formatBytes(workshopSize, 2)}
        </>
      )}
      {shaderSize > 0 && (
        <>
          <br />
          {t("#ContentManagement_UsedByShaders")}: {formatBytes(shaderSize, 2)}
        </>
      )}
    </>
  );

  return (
    <Tooltip toolTipContent={toolTipContent}>
      <div
        data-size-on-disk
        onClick={() => navigator?.AppProperties(appId, "localfiles")}
        className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}
        style={{ cursor: "pointer" }}
      >
        <div className={`${PlayBar.GameStatIcon} ${PlayBar.PlaytimeIcon}`}>
          <IconsModule.HardDrive />
        </div>
        <div className={PlayBar.GameStatRight}>
          <div className={PlayBar.PlayBarLabel}>{label}</div>
          <div className={`${PlayBar.PlayBarDetailLabel} ${PlayBar.LastPlayedInfo}`}>
            {formatBytes(Number(totalSize), 2)}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}
