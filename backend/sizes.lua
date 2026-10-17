--# selene: allow(unused_variable)
local fs = require("fs")
local log = require("log")

---@class FolderMeasurement
---@field total_size integer Sum of every file's size, in bytes
---@field file_count integer Number of files counted
---@field last_write_time integer The folder's last write time when it was measured

---@ffi
---Get a folder's last write time, without walking it.
---
---Cheap, so the frontend calls this to decide whether its cached size is still
---good. Note that nested writes don't touch a folder's own write time, hence
---the "Recalculate" button on the frontend.
---@param path string
---@return integer|nil last_write_time
function get_folder_stat(path)
  if not fs.is_directory(path) then
    log.warn("Not a directory: " .. tostring(path))
    return nil
  end

  return fs.last_write_time(path) or 0
end

---@ffi
---Walk a folder and sum the size of every file in it.
---
---This recurses with fs.list instead of using fs.list_recursive, because
---Millennium's recursive listing never fills in the `size` or `is_symlink`
---fields its own types promise, leaving every file looking 0 bytes long.
---
---Symlinks are skipped so junctions don't get counted twice, and so a link
---pointing back up its own tree can't send this into a loop.
---@param path string
---@return FolderMeasurement|nil
function measure_folder(path)
  local last_write_time = get_folder_stat(path)
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
        -- Symlinks are skipped, see above
        if not entry.is_symlink then
          if entry.is_directory then
            table.insert(pending, entry.path)
          elseif entry.is_file then
            total_size = total_size + (entry.size or 0)
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
