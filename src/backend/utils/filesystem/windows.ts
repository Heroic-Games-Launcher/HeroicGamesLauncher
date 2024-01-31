import { z } from 'zod'
import { userInfo } from 'os'

import type { Path } from 'backend/schemas'
import { genericSpawnWrapper } from '../os/processes'
import type { DiskInfo } from './index'

const Win32_LogicalDisk = z.object({
  Caption: z.string(),
  FreeSpace: z.number().nullable(),
  Size: z.number().nullable()
})
type Win32_LogicalDisk = z.infer<typeof Win32_LogicalDisk>

const AccessControlEntry = z.object({
  FileSystemRights: z.number(),
  IdentityReference: z
    .object({ Value: z.string() })
    .transform((obj) => obj.Value)
})
type AccessControlEntry = z.infer<typeof AccessControlEntry>
// Taken from https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights
const FileSystemRightModify = 197055

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

async function isWritable_windows(path: Path): Promise<boolean> {
  const { stdout } = await genericSpawnWrapper('powershell', [
    '(Get-Acl',
    `${path}).Access`,
    '|',
    'Select-Object',
    'FileSystemRights,IdentityReference',
    '|',
    'ConvertTo-Json',
    '-Compress'
  ])

  let parsedAccess: AccessControlEntry[]
  try {
    parsedAccess = AccessControlEntry.array().parse(JSON.parse(stdout))
  } catch {
    return false
  }

  const userName = userInfo().username
  const userAccess = parsedAccess.find((entry) =>
    entry.IdentityReference.endsWith(userName)
  )
  if (!userAccess) return false

  // "Modify" should include everything we need
  return (
    (userAccess.FileSystemRights & FileSystemRightModify) ===
    FileSystemRightModify
  )
}

export { getDiskInfo_windows, isWritable_windows }
