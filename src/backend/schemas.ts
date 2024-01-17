import { z } from 'zod'
import path from 'path'

const Path = z
  .string()
  .refine((val) => path.parse(val).root, 'Path is not valid')
  .brand('Path')
type Path = z.infer<typeof Path>

const NonEmptyString = z.string().min(1).brand('NonEmptyString')
type NonEmptyString = z.infer<typeof NonEmptyString>

const WineInstallation = z.object({
  bin: z.string(),
  name: z.string(),
  type: z.enum(['wine', 'proton', 'crossover', 'toolkit']),
  lib: z.string().optional(),
  lib32: z.string().optional(),
  wineserver: z.string().optional()
})
type WineInstallation = z.infer<typeof WineInstallation>

const PositiveInteger = z.number().int().positive().brand('PositiveInteger')
type PositiveInteger = z.infer<typeof PositiveInteger>

const KeyValuePair = z.object({ key: z.string(), value: z.string() })
type KeyValuePair = z.infer<typeof KeyValuePair>

export { Path, NonEmptyString, WineInstallation, PositiveInteger, KeyValuePair }
