import { z } from 'zod'
import path from 'path'
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

export const Path = z
  .string()
  .refine((val) => path.parse(val).root, 'Path is not valid')
  .brand('Path')
export type Path = z.infer<typeof Path>

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
