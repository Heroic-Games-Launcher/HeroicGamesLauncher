import { z } from 'zod'
import path from 'path'
import { existsSync } from 'graceful-fs'

import { Path } from 'backend/schemas'
import { hasGame } from '../library'

export const LegendaryAppName = z
  .string()
  .refine((val) => hasGame(val), {
    message: 'AppName was not found on account'
  })
  .brand('LegendaryAppName')
export type LegendaryAppName = z.infer<typeof LegendaryAppName>

export const LegendaryPlatform = z.enum(['Win32', 'Windows', 'Mac'] as const)
export type LegendaryPlatform = z.infer<typeof LegendaryPlatform>

export const NonEmptyString = z.string().min(1).brand('NonEmptyString')
export type NonEmptyString = z.infer<typeof NonEmptyString>

export const PositiveInteger = z
  .number()
  .int()
  .positive()
  .brand('PositiveInteger')
export type PositiveInteger = z.infer<typeof PositiveInteger>

export const URL = z.string().url().brand('URL')
export type URL = z.infer<typeof URL>

// FIXME: This doesn't feel right
export const URI = z.union([Path, URL])
export type URI = z.infer<typeof URI>

export const ValidWinePrefix = Path.refine((potPath) =>
  existsSync(path.join(potPath, 'user.reg'))
).brand('ValidWinePrefix')
export type ValidWinePrefix = z.infer<typeof ValidWinePrefix>
