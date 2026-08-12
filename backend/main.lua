-- Millennium's luavm runs LuaJIT, which compiles hot loops into dynamically
-- generated executable code pages. Anti-cheat / memory-scanning software that
-- injects into every process (e.g. nProtect GameGuard, Windhawk) crashes when it
-- walks those anonymous JIT regions, surfacing as an EXCEPTION_ACCESS_VIOLATION
-- inside the injected module and getting misattributed to this plugin. Forcing
-- the interpreter removes the trigger.
if type(jit) == "table" and type(jit.off) == "function" then
  pcall(jit.off)
  pcall(jit.flush)
end

local logger = require("logger")
local millennium = require("millennium")

RPC = require("rpc").RPC
GetFolderStat = RPC.GetFolderStat
MeasureFolder = RPC.MeasureFolder

-- Measured sizes are cached in the frontend's localStorage rather than here, so
-- a revisited library page can render instantly without waiting on the backend

local function on_load()
  millennium.ready()
  logger:info("Backend loaded, waiting for frontend...")
end

local function on_frontend_loaded()
  logger:info("Frontend has loaded, now ready to measure folders...")
end

return {
  on_load = on_load,
  on_frontend_loaded = on_frontend_loaded,
}
