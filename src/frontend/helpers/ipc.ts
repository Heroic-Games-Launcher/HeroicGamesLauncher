import type { Runner } from 'common/schemas'
import type { GameInfo } from 'common/types'

export class GameHandle {
  readonly _brand = 'GameHandle'

  /**
   * Note: This does not produce a unique ID. Use `${id}_${runner}` instead
   */
  readonly id: string
  readonly runner: Runner

  constructor(id: string, runner: Runner) {
    this.id = id
    this.runner = runner
  }

  // NOTE: This class cannot have methods or complex member variables, as it
  //       is sent across the process boundary (Backend -> Frontend)

  /**
   * Create a {@link GameHandle} from a {@link GameInfo}. Note that you should
   * usually not use this, instead getting the handle from the Backend
   */
  public static fromGameInfo(gameInfo: GameInfo) {
    return new GameHandle(gameInfo.app_name, gameInfo.runner)
  }
}
