import { z } from 'zod'
import path from 'path'

const Path = z
  .string()
  .refine(
    (val) => path.parse(val).root || val.match(/^[A-Z]:(\\|\/)/),
    'Path is not valid'
  )
  .brand('Path')
type Path = z.infer<typeof Path>

export { Path }
