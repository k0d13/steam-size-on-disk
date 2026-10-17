local log = require("log")
local millennium = require("millennium")

-- Loaded for the `---@ffi` functions it defines, which is all the frontend calls.
require("sizes")

-- Measured sizes are cached in the frontend's localStorage rather than here, so
-- a revisited library page can render instantly without waiting on the backend

local function on_load()
  millennium.ready()
  log.info("Backend loaded")
end

return {
  on_load = on_load,
  patches = {
    -- Adds the size to the library stats bar, before achievements (the stat passed
    -- `onSeek`), which render late and would otherwise push it along
    {
      file = [[sp\.js]],
      find = [=[className:\w+\(\)\.GameStatsSection,children:\[[^\]]*?\(0,\w+\.jsx\)\(\w+,\{\.\.\.this\.props,onSeek:]=],
      transforms = {
        {
          match = [[\(0,(\w+)\.jsx\)\((\w+),\{\.\.\.this\.props,onSeek:]],
          replace = [[(0,\1.jsx)(#{{self}}?.libraryApp?.SizeOnDisk||(()=>null),{...this.props}),(0,\1.jsx)(\2,{...this.props,onSeek:]],
        },
      },
    },
    -- Adds an Installed Files page to non-Steam apps' properties, after Shortcut
    {
      file = [[sp\.js]],
      find = [[\w+\.push\(\{title:\(0,\w+\.\w+\)\("#AppProperties_ShortcutPage"\),route:[^,]+,link:\w+\.\w+\.AppProperties\.Shortcut\(\w+\),content:\(0,\w+\.jsx\)\(\w+,\{appId:\w+\.unAppID\}\)\}\)]],
      transforms = {
        {
          match = [[((\w+)\.push\(\{title:\(0,\w+\.\w+\)\("#AppProperties_ShortcutPage"\),route:[^,]+,link:\w+\.\w+\.AppProperties\.Shortcut\((\w+)\),content:\(0,\w+\.jsx\)\(\w+,\{appId:\w+\.unAppID\}\)\}\))]],
          replace = [[\1,#{{self}}?.appProperties?.addInstalledFilesPage?.(\2,\3)]],
        },
      },
    },
  },
}
