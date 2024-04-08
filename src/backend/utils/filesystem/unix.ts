import { genericSpawnWrapper } from '../os/processes'
import { access } from 'fs/promises'
import { join } from 'path'

import type { Path } from 'backend/schemas'
import type { DiskInfo } from './index'

async function getDiskInfo_unix(path: Path): Promise<DiskInfo> {
  const rootPath = await findFirstExistingPath(path)

  const { stdout } = await genericSpawnWrapper('df', ['-P', '-k', rootPath])
  const lineSplit = stdout.split('\n')[1].split(/\s+/)
  const [, totalSpaceKiBStr, , freeSpaceKiBStr] = lineSplit
  return {
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
