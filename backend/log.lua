local fs = require("fs")
local millennium = require("millennium")
local utils = require("utils")

-- Millennium 3.5 drops the reply to any call that writes through its `logger`,
-- so the backend logs to its own file.

local log = {}

-- Millennium's data folder for the plugin. Not `utils.get_backend_path()`, which
-- comes back empty under `starlight watch`.
local DATA = millennium.steam_path() .. "/millennium/data/size-on-disk"

local PATH = DATA .. "/plugin.log"

--- Only the latest lines are kept, so the log stays small however long Steam runs.
local MAX_LINES = 500

fs.create_directories(DATA)

-- The log's lines are held in memory, so dropping the oldest doesn't mean reading it back
local lines = {}
for line in (utils.read_file(PATH) or ""):gmatch("[^\n]+") do
  table.insert(lines, line)
end
while #lines > MAX_LINES do
  table.remove(lines, 1)
end

---@param level string
---@param message string
local function write(level, message)
  local line = os.date("%Y-%m-%d %H:%M:%S") .. " " .. level .. " " .. message
  table.insert(lines, line)

  if #lines > MAX_LINES then
    table.remove(lines, 1)
    utils.write_file(PATH, table.concat(lines, "\n") .. "\n")
  else
    utils.append_file(PATH, line .. "\n")
  end
end

---@param message string
function log.info(message)
  write("INFO", message)
end

---@param message string
function log.warn(message)
  write("WARN", message)
end

return log
