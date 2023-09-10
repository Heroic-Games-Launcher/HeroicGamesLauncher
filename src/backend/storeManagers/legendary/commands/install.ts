import {
  PositiveInteger,
  LegendaryAppName,
  NonEmptyString,
  Path,
  URL,
  URI,
  LegendaryPlatform
} from './base'

interface InstallCommand {
  subcommand: 'install' | 'download' | 'update' | 'repair'
  appName: LegendaryAppName
  sdlList?: NonEmptyString[]
  '--base-path'?: Path
  '--game-folder'?: NonEmptyString
  '--max-shared-memory'?: PositiveInteger
  '--max-workers'?: PositiveInteger
  '--manifest'?: URI
  '--old-manifest'?: URI
  '--delta-manifest'?: URI
  '--base-url'?: URL
  '--force'?: true
  '--disable-patching'?: true
  '--download-only'?: true
  '--no-install'?: true
  '--update-only'?: true
  '--dlm-debug'?: true
  '--platform'?: LegendaryPlatform
  '--prefix'?: NonEmptyString
  '--exclude'?: NonEmptyString
  '--enable-reordering'?: true
  '--dl-timeout'?: PositiveInteger
  '--save-path'?: Path
  '--repair'?: true
  '--repair-and-update'?: true
  '--ignore-free-space'?: true
  '--disable-delta-manifests'?: true
  '--reset-sdl'?: true
  '--skip-sdl'?: true
  '--disable-sdl'?: true
  '--preferred-cdn'?: NonEmptyString
  '--no-https'?: true
  '--with-dlcs'?: true
  '--skip-dlcs'?: true
}

export default InstallCommand
