import { genericSpawnWrapper } from '../os/processes'
import { access } from 'fs/promises'
import { join } from 'path'
import z from 'zod'

import type { Path } from 'backend/schemas'
import type { DiskInfo } from './index'

const LsblkOut = z.object({
  blockdevices: z.array(
    z.object({
      label: z.string().nullable()
    })
  )
})

async function getDiskInfo_unix(path: Path): Promise<DiskInfo> {
  const rootPath = await findFirstExistingPath(path)

  const { stdout } = await genericSpawnWrapper('df', ['-P', '-k', rootPath])
  const lineSplit = stdout.split('\n')[1].split(/\s+/)
  const [filesystem, totalSpaceKiBStr, , freeSpaceKiBStr, , mountPoint] =
    lineSplit

  let label
  // TODO: macOS version of this, potentially using the `diskutil list` command
  if (process.platform === 'linux') {
    const { stdout: lsblkOut } = await genericSpawnWrapper('lsblk', [
      '--output',
      'label',
      '--json',
      filesystem
    ])
    try {
      const labelFromLsblk = LsblkOut.parse(JSON.parse(lsblkOut))
        .blockdevices[0].label
      if (labelFromLsblk) label = labelFromLsblk
    } catch {
      // We can safely ignore this error as `label` is an optional property
    }
  }

  return {
    mountPoint,
    label,
    totalSpace: Number(totalSpaceKiBStr ?? 0) * 1024,
    freeSpace: Number(freeSpaceKiBStr ?? 0) * 1024
  }
}

/**
 * Finds the first existing path in the path's hierarchy
 * @example
 * findFirstExistingPath('/foo/bar/baz')
 * // => '/foo/bar/baz' if it exists, otherwise '/foo/bar', otherwise '/foo', otherwise '/'
 */
async function findFirstExistingPath(path: Path): Promise<Path> {
  let maybeExistingPath = path
  while (!(await isWritable_unix(maybeExistingPath))) {
    maybeExistingPath = join(maybeExistingPath, '..') as Path
  }
  return maybeExistingPath
}

async function isWritable_unix(path: Path): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

export { getDiskInfo_unix, isWritable_unix }
