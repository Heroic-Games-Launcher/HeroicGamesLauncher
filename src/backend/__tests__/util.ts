import { Game } from 'common/types/game_manager'
import type { Runner } from 'common/schemas'

export class FakeGame extends Game {
  readonly id: string
  readonly runner: Runner

  constructor(id: string, runner: Runner) {
    super()
    this.id = id
    this.runner = runner
  }

  toString(): string {
    return `FakeGame(id=${this.id}, runner=${this.runner})`
  }

  getSettings = jest.fn()
  addShortcuts = jest.fn()
  forceUninstall = jest.fn()
  getExtraInfo = jest.fn()
  getGameInfo = jest.fn()
  importGame = jest.fn()
  install = jest.fn()
  isGameAvailable = jest.fn()
  isNative = jest.fn()
  launch = jest.fn()
  moveInstall = jest.fn()
  onInstallOrUpdateOutput = jest.fn()
  removeShortcuts = jest.fn()
  repair = jest.fn()
  stop = jest.fn()
  syncSaves = jest.fn()
  uninstall = jest.fn()
  update = jest.fn()
}
