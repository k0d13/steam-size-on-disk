local fs     = require("fs")
local logger = require('logger')

---Get a folder's last write time, without walking it.
---
---Cheap, so the frontend calls this to decide whether its cached size is still
---good. Note that nested writes don't touch a folder's own write time, hence
---the "Recalculate" button on the frontend.
---@param path string
---@return integer|nil last_write_time
local function get_folder_stat(path)
  if not fs.is_directory(path) then
    logger:warn("Not a directory: " .. tostring(path))
    return nil
  end

  return fs.last_write_time(path) or 0
end

---Walk a folder and sum the size of every file in it.
---
---This recurses with fs.list instead of using fs.list_recursive, because
---Millennium's recursive listing never fills in the `size` or `is_symlink`
---fields its own types promise, leaving every file looking 0 bytes long.
---
---Symlinks are skipped so junctions don't get counted twice, and so a link
---pointing back up its own tree can't send this into a loop.
---@param path string
---@return { total_size: integer, file_count: integer, last_write_time: integer }|nil
local function measure_folder(path)
  local last_write_time = get_folder_stat(path)
  if not last_write_time then return nil end

  local total_size = 0
  local file_count = 0
  local pending = { path }

  while #pending > 0 do
    local current = table.remove(pending)
    local entries, err = fs.list(current)

    if not entries then
      -- A folder we can't read (permissions, or one that vanished mid-walk)
      -- contributes nothing rather than failing the whole measurement
      logger:warn("Failed to list '" .. current .. "': " .. tostring(err))
    else
      for _, entry in ipairs(entries) do
        if entry.is_symlink then -- luacheck: ignore
          -- Skipped, see above
        elseif entry.is_directory then
          table.insert(pending, entry.path)
        elseif entry.is_file then
          total_size = total_size + (entry.size or 0)
          file_count = file_count + 1
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

return {
  get_folder_stat = get_folder_stat,
  measure_folder = measure_folder,
}
