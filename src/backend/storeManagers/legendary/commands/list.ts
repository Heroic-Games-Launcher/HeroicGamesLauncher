import { LegendaryPlatform } from './base'

interface ListCommand {
  subcommand: 'list'
  '--platform'?: LegendaryPlatform
  '--include-ue'?: true
  '-T'?: true
  '--third-party'?: true
  '--include-non-installable'?: true
  '--csv'?: true
  '--tsv'?: true
  '--json'?: true
  '--force-refresh'?: true
}

export default ListCommand
