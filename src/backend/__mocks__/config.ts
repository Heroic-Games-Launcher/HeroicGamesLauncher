import type { AppSettings } from 'common/types'

const GlobalConfig = (() => {
  const config: Partial<AppSettings> = {
    darkTrayIcon: false
  }

  function setConfigValue<Key extends keyof AppSettings>(
    key: Key,
    value: AppSettings[Key]
  ) {
    config[key] = value
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
