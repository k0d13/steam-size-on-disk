--# selene: allow(unused_variable)
local fs = require("fs")
local log = require("log")

---@class FolderMeasurement
---@field total_size integer Sum of every file's size, in bytes
---@field file_count integer
---@field last_write_time integer The folder's last write time when it was measured

---@ffi
---Get a folder's last write time, without walking it.
---Cheap, so the frontend can tell whether its cached size is still good.
---@param path string
---@return integer|nil last_write_time
function GetFolderStat(path)
  if not fs.is_directory(path) then
    log.warn("Not a directory: " .. tostring(path))
    return nil
  end

  return fs.last_write_time(path) or 0
end

local TWO_POW_32 = 4294967296

---Get a file's size, past the 32-bit limit of fs.list and fs.file_size.
---Steam is a 32-bit process, so Millennium's lua_pushinteger wraps any size over 2 GiB;
---LuaJIT's file:seek uses 64-bit offsets and returns a double, so it doesn't.
---@param path string
---@param listed_size integer|nil The size fs.list gave for the file
---@return number size
local function file_size(path, listed_size)
  local file = io.open(path, "rb")
  if file then
    local size = file:seek("end")
    file:close()
    if size then
      return size
    end
  end

  -- Opening can fail on a locked file, so fall back to fs.list's size,
  -- which is right below 4 GiB once its sign is undone
  local size = listed_size or 0
  if size < 0 then
    size = size + TWO_POW_32
  end
  return size
end

---@ffi
---Walk a folder and sum the size of every file in it.
---Recurses with fs.list, since fs.list_recursive leaves `size` and `is_symlink` unset.
---Symlinks are skipped so nothing is counted twice or loops back up its own tree.
---@param path string
---@return FolderMeasurement|nil
function MeasureFolder(path)
  local last_write_time = GetFolderStat(path)
  if not last_write_time then
    return nil
  end

  local total_size = 0
  local file_count = 0
  local pending = { path }

  while #pending > 0 do
    local current = table.remove(pending)
    local entries, err = fs.list(current)

    if not entries then
      -- A folder we can't read (permissions, or one that vanished mid-walk)
      -- contributes nothing rather than failing the whole measurement
      log.warn("Failed to list '" .. current .. "': " .. tostring(err))
    else
      for _, entry in ipairs(entries) do
        if not entry.is_symlink then
          if entry.is_directory then
            table.insert(pending, entry.path)
          elseif entry.is_file then
            total_size = total_size + file_size(entry.path, entry.size)
            file_count = file_count + 1
          end
        end
      end
    end
  end

  return {
    total_size = total_size,
    file_count = file_count,
    last_write_time = last_write_time,
  }
end
