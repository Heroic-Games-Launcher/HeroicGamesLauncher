import { LegendaryAppName } from './base'

interface AchievementsCommand {
  subcommand: 'achievements'
  appName: LegendaryAppName
  '--hidden'?: true
  '--json'?: true
}

export default AchievementsCommand
