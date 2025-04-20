import { z } from 'zod'
import path from 'path'

const Path = z
  .string()
  .refine((val) => path.parse(val).root, 'Path is not valid')
  .brand('Path')
type Path = z.infer<typeof Path>

const Runners = z.enum(['legendary', 'gog', 'nile', 'sideload'])

export { Path, Runners }
