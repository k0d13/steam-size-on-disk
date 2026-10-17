import { type SteamAppOverview } from "millennium";

// Client globals the millennium typings don't cover. None is guaranteed on a
// given build, so the code using them feature tests.

declare global {
  const appStore: {
    allApps: SteamAppOverview[];
  };

  /** Only waited on to know Steam has started. A bare reference throws until it exists. */
  // oxlint-disable-next-line no-var -- `var` is what puts it on `window`'s type.
  var MainWindowBrowserManager: unknown;
}

export {};
