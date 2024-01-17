const original_module = jest.requireActual('../shared')

module.exports = {
  ...original_module,
  initConfig: jest.fn(),
  availableWineVersions: [
    {
      bin: '/usr/bin/wine',
      name: 'Mocked Wine Version',
      type: 'wine'
    }
  ]
}
export {}
