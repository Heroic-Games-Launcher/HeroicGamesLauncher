import { LegendaryAppName, Path } from './base'

interface MoveCommand {
  subcommand: 'move'
  appName: LegendaryAppName
  newBasePath: Path
  '--skip-move'?: true
}

export default MoveCommand
