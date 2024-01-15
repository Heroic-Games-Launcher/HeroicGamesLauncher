import { access } from 'fs/promises'

import type { Path } from 'backend/schemas'
import { isFlatpak } from 'backend/constants'

interface DiskInfo {
  freeSpace: number
  totalSpace: number
}

async function getDiskInfo(path: Path): Promise<DiskInfo> {
  switch (process.platform) {
    case 'linux':
    case 'darwin': {
      const { getDiskInfo_unix } = await import('./unix')
      return getDiskInfo_unix(path)
    }
    case 'win32': {
      const { getDiskInfo_windows } = await import('./windows')
      return getDiskInfo_windows(path)
    }
    default:
      return { freeSpace: 0, totalSpace: 0 }
  }
}

async function isWritable(path: Path): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

const isAccessibleWithinFlatpakSandbox = (path: Path): boolean =>
  !isFlatpak || !path.startsWith(process.env.XDG_RUNTIME_DIR || '/run/user/')

export { getDiskInfo, isWritable, isAccessibleWithinFlatpakSandbox }
export type { DiskInfo }
