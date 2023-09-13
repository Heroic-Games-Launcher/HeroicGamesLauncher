import { PositiveInteger } from './base'

import InstallCommand from './install'
import LaunchCommand from './launch'
import ListCommand from './list'
import InfoCommand from './info'
import MoveCommand from './move'
import SyncSavesCommand from './sync_saves'
import StatusCommand from './status'
import EosOverlayCommand from './eos_overlay'
import UninstallCommand from './uninstall'
import ImportCommand from './import'
import CleanupCommand from './cleanup'
import AuthCommand from './auth'
import EglSyncCommand from './egl_sync'

interface BaseLegendaryCommand {
  '-v'?: true
  '--debug'?: true
  '-y'?: true
  '--yes'?: true
  '-V'?: true
  '--version'?: true
  '-J'?: true
  '--pretty-json'?: true
  '-A'?: PositiveInteger
  '--api-timeout'?: PositiveInteger
}

export type LegendaryCommand = BaseLegendaryCommand &
  (
    | { subcommand: undefined }
    | InstallCommand
    | LaunchCommand
    | ListCommand
    | InfoCommand
    | MoveCommand
    | SyncSavesCommand
    | StatusCommand
    | EosOverlayCommand
    | UninstallCommand
    | ImportCommand
    | CleanupCommand
    | AuthCommand
    | EglSyncCommand
  )
