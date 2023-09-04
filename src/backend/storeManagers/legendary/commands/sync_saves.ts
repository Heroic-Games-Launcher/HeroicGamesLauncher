import { LegendaryAppName, Path } from './base'

interface SyncSavesCommand {
  subcommand: 'sync-saves'
  appName: LegendaryAppName
  '--skip-upload'?: true
  '--skip-download'?: true
  '--force-upload'?: true
  '--force-download'?: true
  '--save-path'?: Path
  '--disable-filters'?: true
  '--accept-path'?: true
}

export default SyncSavesCommand
