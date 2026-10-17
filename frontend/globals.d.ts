import { type SteamAppOverview } from "millennium";

// Client globals the millennium typings don't cover. None is guaranteed on a
// given build, so the code using them feature tests.

declare global {
  const appStore: {
    allApps: SteamAppOverview[];
  };

  /** Steam draws each of its windows into a popup, announced through here. */
  const g_PopupManager: {
    GetExistingPopup(name: string): SteamPopup | undefined;
    AddPopupCreatedCallback(callback: (popup: SteamPopup) => void): { Unregister(): void };
    AddPopupDestroyedCallback(callback: (popup: SteamPopup) => void): { Unregister(): void };
  };

  interface SteamPopup {
    window?: Window;
  }

  /**
   * The desktop library's router. Big Picture has none, and it only exists once the
   * main window has drawn, so read it off `window`: a bare reference throws until then.
   */
  // oxlint-disable-next-line no-var -- `var` is what puts it on `window`'s type.
  var MainWindowBrowserManager: { m_lastLocation?: { pathname: string } } | undefined;
}

export {};
