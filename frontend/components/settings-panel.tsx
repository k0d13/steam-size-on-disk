import { DialogButton, Focusable, Toggle } from "millennium";
import { useState } from "react";
import { getSetting, setSetting } from "../settings";

const KOFI_URL = "https://ko-fi.com/X8X554X28";

// Steam's Field rows draw as padded cards, ragged in a panel this narrow, so the panel
// lays itself out and keeps only Steam's buttons and toggles; colours are Steam's variables
const PANEL_CSS = `
.sod-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 16px;
  color: var(--gpSystemLighterGrey, #dcdedf);
  font-size: 13px;
  line-height: 1.4;
  --sod-dim: color-mix(
    in srgb,
    var(--gpSystemLightGrey, #8b929a) 75%,
    var(--gpSystemLighterGrey, #dcdedf)
  );
}

.sod-dim {
  color: var(--sod-dim);
  font-size: 12px;
}

.sod-heading {
  margin: 0 2px 8px;
  color: var(--sod-dim);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sod-list,
.sod-card {
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.sod-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 16px;
  box-sizing: border-box;
}

.sod-row-text {
  flex: 1;
  min-width: 0;
}

.sod-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

/* Ko-fi's red, darker than its own #ff5e5b, which only reaches 3:1 under white text */
.sod-kofi > .sod-kofi-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  background: #d63c39;
  color: #fff;
}

.sod-kofi > .sod-kofi-button:hover,
.sod-kofi > .sod-kofi-button.gpfocus {
  background: #c2302d;
  color: #fff;
}

.sod-kofi > .sod-kofi-button.gpfocus {
  outline: 2px solid var(--gpColor-White, #fff);
  outline-offset: 2px;
}
`;

export function SettingsPanel() {
  const [openFolderOnClick, setOpenFolderOnClick] = useState(() =>
    getSetting("openFolderOnClick", false),
  );

  return (
    <div className="sod-panel">
      <style>{PANEL_CSS}</style>
      <div>
        <div className="sod-heading">Options</div>
        <div className="sod-list">
          <div className="sod-row">
            <div className="sod-row-text">
              <div>Open the game's folder on click</div>
              <div className="sod-dim">Instead of its Installed Files properties</div>
            </div>
            <Toggle
              value={openFolderOnClick}
              onChange={(value) => {
                setOpenFolderOnClick(value);
                setSetting("openFolderOnClick", value);
              }}
            />
          </div>
        </div>
      </div>
      <div className="sod-card">
        <div className="sod-dim">
          Made by one person in their spare time. If it saves you digging through Properties, a
          coffee keeps it going.
        </div>
        <Focusable className="sod-kofi">
          <DialogButton
            className="sod-kofi-button"
            onClick={() => SteamClient.System.OpenInSystemBrowser(KOFI_URL)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" stroke="currentColor" strokeWidth="2" />
              <path
                d="M10 16.5s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8Z"
                fill="currentColor"
              />
            </svg>
            Support on Ko-fi
          </DialogButton>
        </Focusable>
      </div>
    </div>
  );
}
