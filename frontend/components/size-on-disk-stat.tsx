import {
  findModuleDetailsByExport,
  findModuleExport,
  IconsModule,
  playSectionClasses,
} from "millennium";
import type { AppSize } from "../app-sizes";
import { openAppFolder } from "../open-app-folder";
import { getSetting } from "../settings";

// Older Steam builds inline the "Tera" prefix, newer ones move it into a helper
export const formatBytes: (bytes: number, decimals: number) => string =
  findModuleExport((e) => {
    const s = e?.toString?.();
    return s?.includes('"bytes"') && s.includes('"_PerSecond"');
  }) ?? findModuleExport((e) => e?.toString?.()?.includes('"Tera"'));
const localize = findModuleExport((e) =>
  e?.toString?.()?.match(/\.LocalizeString\([a-zA-Z_$][\w$]*\)/),
);
const Tooltip = findModuleDetailsByExport((m) => {
  const s = m?.toString?.();
  return (
    s?.includes("divProps") &&
    s.includes("tooltipProps") &&
    s.includes("toolTipContent") &&
    s.includes("tool-tip-source")
  );
})?.[1];
const getNavigator = findModuleExport((e) =>
  e?.toString?.()?.includes('"No global navigator context found!"'),
);

/** One line of the tooltip's breakdown, left out when it's zero. */
function SizeBreakdownLine({ label, bytes }: { label: string; bytes: number }) {
  if (bytes <= 0) return null;
  return (
    <>
      <br />
      {localize(label)}: {formatBytes(bytes, 2)}
    </>
  );
}

export function SizeOnDiskStat({ size }: { size: AppSize }) {
  const { appId, totalSize, dlcSize, workshopSize, shaderSize } = size;

  // The only "Size on Disk" translation is for sorting, which only reads right in
  // English, so other languages get the plainer "Size" instead
  const sizeOnDiskLabel = localize("#Library_SortBySizeOnDisk");
  const label =
    sizeOnDiskLabel.props.children === "Size on Disk"
      ? sizeOnDiskLabel
      : localize("#ContentManagement_AppSize");
  const total = formatBytes(totalSize, 2);
  const navigator = getNavigator();

  const toolTipContent = (
    <>
      {localize(
        "#AppProperties_LocalFilesSizeOnDrive",
        total,
        // Non-Steam apps have no install folder to name, so their own folder
        // path is all there is to point at
        size.folderLabel && size.driveName
          ? `${size.folderLabel} (${size.driveName})`
          : size.folderPath,
      )}
      <br />
      <span style={{ textTransform: "capitalize" }}>{localize("#AppType_Singular_2")}</span>:{" "}
      {formatBytes(totalSize - dlcSize - workshopSize - shaderSize, 2)}
      <SizeBreakdownLine label="#ContentManagement_UsedByDLC" bytes={dlcSize} />
      <SizeBreakdownLine label="#ContentManagement_UsedByWorkshop" bytes={workshopSize} />
      <SizeBreakdownLine label="#ContentManagement_UsedByShaders" bytes={shaderSize} />
    </>
  );

  return (
    <Tooltip toolTipContent={toolTipContent}>
      <div
        onClick={async () => {
          // Falls back to the properties when the folder can't be worked out
          if (getSetting("openFolderOnClick", false) && (await openAppFolder(size))) return;
          navigator?.AppProperties(appId, "localfiles");
        }}
        className={`${playSectionClasses.GameStat} ${playSectionClasses.LastPlayed} Panel`}
        style={{ cursor: "pointer" }}
      >
        <div className={`${playSectionClasses.GameStatIcon} ${playSectionClasses.PlaytimeIcon}`}>
          {/* Borrows the cloud icon's colour, since the drive icon is filled with currentColor */}
          <IconsModule.HardDrive className={playSectionClasses.CloudIconSVG} />
        </div>
        <div className={playSectionClasses.GameStatRight}>
          <div className={playSectionClasses.PlayBarLabel}>{label}</div>
          <div
            className={`${playSectionClasses.PlayBarDetailLabel} ${playSectionClasses.LastPlayedInfo}`}
          >
            {total}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}
