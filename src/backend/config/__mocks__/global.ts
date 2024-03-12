const original_module = jest.requireActual('../global')

module.exports = {
  ...original_module,
  loadGlobalConfig: () => {},
  setGlobalConfig: (key: string, value: unknown) => {
    original_module.testExports.globalConfig ??= {}
    original_module.testExports.globalConfig[key] = value
  },
  resetGlobalConfigKey: (key: string) => {
    original_module.testExports.globalConfig ??= {}
    delete original_module.testExports.globalConfig[key]
  }
}
export {}
