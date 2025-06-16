import type { Path } from 'backend/schemas'
import type {
  LegendaryAppName,
  LegendaryPlatform,
  NonEmptyString
} from './base'

interface ImportCommand {
  subcommand: 'import'
  appName: LegendaryAppName
  installationDirectory: Path
  sdlList?: NonEmptyString[]
  '--disable-check'?: true
  '--with-dlcs'?: true
  '--platform'?: LegendaryPlatform
}

export default ImportCommand
