import { LegendaryAppName, LegendaryPlatform, Path } from './base'

interface ImportCommand {
  subcommand: 'import'
  appName: LegendaryAppName
  installationDirectory: Path
  '--disable-check'?: true
  '--with-dlcs'?: true
  '--platform'?: LegendaryPlatform
}

export default ImportCommand
