import { z } from 'zod'

import type { Path } from 'backend/schemas'
import { genericSpawnWrapper } from '../os/processes'
import type { DiskInfo } from './index'

const Win32_LogicalDisk = z.object({
  Caption: z.string(),
  FreeSpace: z.number().nullable(),
  Size: z.number().nullable()
})
type Win32_LogicalDisk = z.infer<typeof Win32_LogicalDisk>

async function getDiskInfo_windows(path: Path): Promise<DiskInfo> {
  const { stdout } = await genericSpawnWrapper('powershell', [
    'Get-CimInstance',
    '-Class',
    'Win32_LogicalDisk',
    '-Property',
    'Caption,FreeSpace,Size',
    '|',
    'Select-Object',
    'Caption,FreeSpace,Size',
    '|',
    'ConvertTo-Json',
    '-Compress'
  ])

  let parsedDisks: Win32_LogicalDisk[]
  try {
    parsedDisks = Win32_LogicalDisk.array().parse(JSON.parse(stdout))
  } catch {
    parsedDisks = []
  }

  for (const disk of parsedDisks) {
    // Disk drives without media inserted will have "null" as their FreeSpace &
    // Size. We can just skip those
    if (!disk.FreeSpace || !disk.Size) continue

    if (path.startsWith(disk.Caption))
      return { freeSpace: disk.FreeSpace, totalSpace: disk.Size }
  }

  return { freeSpace: 0, totalSpace: 0 }
}

export { getDiskInfo_windows }
