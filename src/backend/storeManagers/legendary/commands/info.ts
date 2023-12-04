import { LegendaryAppName, LegendaryPlatform } from './base'

interface InfoCommand {
  subcommand: 'info'
  appName: LegendaryAppName
  '--offline'?: true
  '--json'?: true
  '--platform'?: LegendaryPlatform
}

export default InfoCommand
