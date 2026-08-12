import { Millennium } from "@steambrew/client";

async function call<R>(route: `RPC.${string}`, payload: object): Promise<R> {
  return Millennium.callServerMethod(route.slice(4), {
    payload: JSON.stringify(payload),
  }).then((r) => JSON.parse(r));
}

export class RPC {
  /** Get a folder's last write time, without walking it. Cheap. */
  async GetFolderStat(path: string) {
    const raw = await call<{ last_write_time: number } | null>("RPC.GetFolderStat", { path });
    return raw ? { lastWriteTime: raw.last_write_time } : undefined;
  }

  /** Walk a folder and sum every file in it. Slow on large folders. */
  async MeasureFolder(path: string) {
    const raw = await call<{
      total_size: number;
      file_count: number;
      last_write_time: number;
    } | null>("RPC.MeasureFolder", { path });

    if (!raw) return undefined;
    return {
      totalSize: raw.total_size,
      fileCount: raw.file_count,
      lastWriteTime: raw.last_write_time,
    };
  }
}

export default new RPC();
