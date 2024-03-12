import { z } from 'zod'
import type { LegendaryAppName, Path, ValidWinePrefix } from './base'
import type { NonEmptyString } from 'backend/schemas'

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
