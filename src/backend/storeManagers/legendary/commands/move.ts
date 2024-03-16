import type { Path } from 'backend/schemas'
import type { LegendaryAppName } from './base'

interface MoveCommand {
  subcommand: 'move'
  appName: LegendaryAppName
  newBasePath: Path
  '--skip-move'?: true
}

export default MoveCommand
