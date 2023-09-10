import { LegendaryAppName } from './base'

interface UninstallCommand {
  subcommand: 'uninstall'
  appName: LegendaryAppName
  '--keep-files'?: true
}

export default UninstallCommand
