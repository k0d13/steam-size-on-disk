import { type SteamAppOverview } from "millennium";

// Client globals the millennium typings don't cover. None is guaranteed on a
// given build, so the code using them feature tests.

declare global {
  const appStore: {
    allApps: SteamAppOverview[];
  };
}

export {};
