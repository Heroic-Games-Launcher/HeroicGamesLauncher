import type { AppSettings } from 'common/types'

const GlobalConfig = (() => {
  const config: Partial<AppSettings> = {
    darkTrayIcon: false
  }

  const setConfigValue = (key: keyof AppSettings, value: unknown) => {
    config[key] = value as never
  }

  return {
    setConfigValue,
    get: () => {
      return {
        getSettings: () => config
      }
    }
  }
})()

export { GlobalConfig }
