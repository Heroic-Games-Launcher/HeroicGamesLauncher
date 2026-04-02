import { z } from 'zod'

export const PositiveInteger = z
  .number()
  .int()
  .positive()
  .brand('PositiveInteger')
export type PositiveInteger = z.infer<typeof PositiveInteger>
