const GlobalConfig = (() => {
  const config = {
    darkTrayIcon: false
  }

  const setConfigValue = (key: string, value: unknown) => {
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
