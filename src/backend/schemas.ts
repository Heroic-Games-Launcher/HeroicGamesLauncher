import { z } from 'zod'
import path from 'path'

const Path = z
  .string()
  .refine((val) => path.parse(val).root, 'Path is not valid')
  .brand('Path')
type Path = z.infer<typeof Path>

const NonEmptyString = z.string().min(1).brand('NonEmptyString')
type NonEmptyString = z.infer<typeof NonEmptyString>

const PositiveInteger = z.number().int().positive().brand('PositiveInteger')
type PositiveInteger = z.infer<typeof PositiveInteger>

export { Path, NonEmptyString, PositiveInteger }
