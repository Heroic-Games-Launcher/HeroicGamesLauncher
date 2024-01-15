import { genericSpawnWrapper } from '../os/processes'

import type { Path } from 'backend/schemas'
import type { DiskInfo } from './index'

async function getDiskInfo_unix(path: Path): Promise<DiskInfo> {
  const { stdout } = await genericSpawnWrapper('df', ['-P', '-k', path])
  const lineSplit = stdout.split('\n')[1].split(/\s+/)
  const [, totalSpaceKiBStr, , freeSpaceKiBStr] = lineSplit
  return {
    totalSpace: Number(totalSpaceKiBStr ?? 0) * 1024,
    freeSpace: Number(freeSpaceKiBStr ?? 0) * 1024
  }
}

export { getDiskInfo_unix }
