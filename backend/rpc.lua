local sizes = require("sizes")
local json = require("json")

---@return fun(payload: string): string
local function rpcmethod(func)
  return function(payload)
    local data = json.decode(payload)
    local result = func(data)
    if result then
      return json.encode(result)
    else
      -- Cannot nothing or return nil alone because millennium tries to stoi it?
      return 'null'
    end
  end
end

---@class RPC
local RPC = {}

function RPC.new()
  local self = setmetatable({}, { __index = RPC })
  return self
end

---@param payload string
---@return string|nil
function RPC.GetFolderStat(payload)
  local wrapped_func = rpcmethod(function(data)
    local last_write_time = sizes.get_folder_stat(data.path)
    if not last_write_time then return nil end
    return { last_write_time = last_write_time }
  end)
  return wrapped_func(payload)
end

---@param payload string
---@return string|nil
function RPC.MeasureFolder(payload)
  local wrapped_func = rpcmethod(function(data)
    return sizes.measure_folder(data.path)
  end)
  return wrapped_func(payload)
end

return {
  RPC = RPC,
  rpc = RPC.new()
}
