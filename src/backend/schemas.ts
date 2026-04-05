import { z } from 'zod'
import path from 'path'

function isValidPath(value: string) {
  return path.posix.isAbsolute(value) || path.win32.isAbsolute(value)
}

const Path = z
  .string()
  .refine((val) => isValidPath(val), 'Path is not valid')
  .brand('Path')
type Path = z.infer<typeof Path>

export { Path }
