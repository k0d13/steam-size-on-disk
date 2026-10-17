// Steam draws every window into its own popup, so DOM patches must reach each one.

const DESKTOP_WINDOW_NAME = "SP Desktop_uid0";
const GAMEPAD_WINDOW_NAME = "SP BPM_uid0";

export enum PopupType {
  Desktop = "desktop",
  Gamepad = "gamepad",
  Other = "other",
}

function getPopupType(popup: SteamPopup) {
  const name = popup.window?.name;
  if (name?.startsWith("SP Desktop_")) return PopupType.Desktop;
  if (name?.startsWith("SP BPM_")) return PopupType.Gamepad;
  return PopupType.Other;
}

/** Call back for every popup, open ones included; a returned teardown runs on destroy. */
export function onPopupCreate(
  handleOpen: (popup: SteamPopup, type: PopupType) => void | VoidFunction,
): () => void {
  const popups = g_PopupManager;
  if (!popups) return () => {};

  // Per registration, so two features watching the same popup keep their own.
  const teardowns = new WeakMap<SteamPopup, void | VoidFunction>();

  function onCreate(popup: SteamPopup) {
    teardowns.set(popup, handleOpen(popup, getPopupType(popup)));
  }

  function onDestroy(popup: SteamPopup) {
    teardowns.get(popup)?.();
    teardowns.delete(popup);
  }

  for (const name of [DESKTOP_WINDOW_NAME, GAMEPAD_WINDOW_NAME]) {
    const existing = popups.GetExistingPopup(name);
    if (existing) onCreate(existing);
  }

  const { Unregister: removeCreate } = popups.AddPopupCreatedCallback(onCreate);
  const { Unregister: removeDestroy } = popups.AddPopupDestroyedCallback(onDestroy);

  return () => {
    removeCreate();
    removeDestroy();
  };
}
