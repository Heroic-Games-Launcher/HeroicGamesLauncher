import { z } from 'zod'
import type { Path } from 'backend/schemas'
import type { LegendaryAppName, NonEmptyString, ValidWinePrefix } from './base'

const EosOverlayAction = z.enum([
  'install',
  'update',
  'remove',
  'enable',
  'disable',
  'info'
] as const)
type EosOverlayAction = z.infer<typeof EosOverlayAction>

interface EosOverlayCommand {
  subcommand: 'eos-overlay'
  action: EosOverlayAction
  '--path'?: Path
  '--prefix'?: ValidWinePrefix
  '--app'?: LegendaryAppName
  '--bottle'?: NonEmptyString
}

export default EosOverlayCommand
