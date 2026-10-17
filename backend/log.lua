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

--- Started over past this, so a Steam that runs for weeks doesn't grow it forever.
local MAX_BYTES = 1024 * 1024

fs.create_directories(DATA)
if (fs.file_size(PATH) or 0) > MAX_BYTES then
  fs.remove(PATH)
end

---@param level string
---@param message string
local function write(level, message)
  utils.append_file(PATH, os.date("%Y-%m-%d %H:%M:%S") .. " " .. level .. " " .. message .. "\n")
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
