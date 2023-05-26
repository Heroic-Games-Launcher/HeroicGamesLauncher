import { existsSync } from 'graceful-fs'
import { join } from 'path'

function getNvngxPath(): string {
  const paths_to_search = [
    ...(process.env.LD_LIBRARY_PATH ?? '').split(':'),
    '/usr/lib',
    '/usr/lib64',
    '/lib',
    '/lib64'
  ]
  return (
    paths_to_search.find((path) =>
      existsSync(join(path, 'libGLX_nvidia.so.0'))
    ) ?? ''
  )
}

export { getNvngxPath }
