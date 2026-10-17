import { useEffect, useState } from "react";
import { getKnownAppSize, refreshAppSize } from "../app-sizes";
import { SizeOnDiskStat } from "../components/size-on-disk-stat";

/** The props the stats bar passes each stat, of which only the app is read. */
interface StatProps {
  overview?: { appid: number };
}

/** Rendered by Steam in the library stats bar, through the backend's patch. */
function SizeOnDisk({ overview }: StatProps) {
  const appId = overview?.appid;
  const [size, setSize] = useState(() =>
    appId === undefined ? undefined : getKnownAppSize(appId),
  );

  // Paint what's known first, then catch up in case it's changed since
  useEffect(() => {
    if (appId === undefined) return setSize(undefined);
    setSize(getKnownAppSize(appId));

    let current = true;
    refreshAppSize(appId)
      .then(() => current && setSize(getKnownAppSize(appId)))
      .catch((e) => console.debug(`Failed to refresh size of app ${appId}`, e));
    return () => {
      current = false;
    };
  }, [appId]);

  return size?.totalSize ? <SizeOnDiskStat size={size} /> : null;
}

export const statsBar = { SizeOnDisk };
