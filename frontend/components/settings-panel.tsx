import { DialogControlsSection, ToggleField } from "millennium";
import { useState } from "react";
import { getSetting, setSetting } from "../settings";

export function SettingsPanel() {
  const [openFolderOnClick, setOpenFolderOnClick] = useState(() =>
    getSetting("openFolderOnClick", false),
  );

  return (
    <DialogControlsSection>
      <ToggleField
        label="Open the game's folder on click"
        description="Clicking the size opens the game's folder in the file explorer, instead of its Installed Files properties."
        checked={openFolderOnClick}
        onChange={(checked) => {
          setOpenFolderOnClick(checked);
          setSetting("openFolderOnClick", checked);
        }}
      />
    </DialogControlsSection>
  );
}
