const GlobalConfig = (() => {
  const config = {
    darkTrayIcon: false
  }

  const setConfigValue = (key: keyof typeof config, value: unknown) => {
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
