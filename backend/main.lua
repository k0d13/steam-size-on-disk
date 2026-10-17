local log = require("log")
local millennium = require("millennium")

-- Loaded for the `---@ffi` functions it defines, which is all the frontend calls.
require("sizes")

-- Measured sizes are cached in the frontend's localStorage rather than here, so
-- a revisited library page can render instantly without waiting on the backend

local function on_load()
  millennium.ready()
  log.info("Backend loaded, waiting for frontend...")
end

local function on_frontend_loaded()
  log.info("Frontend has loaded, now ready to measure folders...")
end

return {
  on_load = on_load,
  on_frontend_loaded = on_frontend_loaded,
}
