import { GameSettings } from '../../common/types'

const GameConfig = (() => {
  let config = {} as GameSettings

  const set = (value: Partial<GameSettings>) => {
    config = { ...config, ...value }
  }

  return {
    set,
    get: () => {
      return {
        getSettings: () => config
      }
    }
  }
})()

export { GameConfig }
