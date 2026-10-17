import { FolderSelector } from "../components/folder-selector";

interface AppPropertiesPage {
  title: string;
  route: string;
  link: string;
  content: React.ReactNode;
}

/** Called by Steam while listing a non-Steam app's properties pages, through the backend's patch. */
function addInstalledFilesPage(pages: AppPropertiesPage[], appId: number) {
  pages.push({
    title: "Installed Files",
    route: "/app/:appid/properties/localfiles",
    link: `/app/${appId}/properties/localfiles`,
    content: (
      <div className="DialogBody">
        <FolderSelector appId={appId} />
      </div>
    ),
  });
}

export const appProperties = { addInstalledFilesPage };
