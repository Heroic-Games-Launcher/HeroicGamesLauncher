import { GlobalConfig } from 'backend/config'
import {
  configPath,
  gamesConfigPath,
  setPlatformConstants
} from 'backend/constants'
import { GameConfig } from 'backend/game_config'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { join } from 'path'

describe('GameSettings', () => {
  describe('getSettings', () => {
    describe('returns defaults if no settings yet', () => {
      const getSettings = async () => {
        const appName = 'some-app-name'

        // create config dir if needed
        if (!existsSync(gamesConfigPath))
          mkdirSync(gamesConfigPath, { recursive: true })

        // delete game config if present config
        const path = join(gamesConfigPath, appName + '.json')
        if (existsSync(path)) rmSync(path)

        // reset global config singleton so we can test different platforms
        GlobalConfig['globalInstance'] = null as any
        if (existsSync(configPath)) rmSync(configPath)

        const config = GameConfig.get(appName)
        return await config.getSettings()
      }

      it('linux defaults', async () => {
        setPlatformConstants('linux')
        const settings = await getSettings()
        expect(settings.disableUMU).toBe(false)
      })
    })
  })
})
