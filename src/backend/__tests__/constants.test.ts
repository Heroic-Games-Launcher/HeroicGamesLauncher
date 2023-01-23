import { fixAsarPath } from '../constants'

jest.mock('../logger/logfile')

describe('Constants - fixAsarPath', () => {
  test('need to fix path and replace correctly', () => {
    const fixed_path = fixAsarPath('path/app.asar/bin')
    expect(fixed_path).toBe('path/app.asar.unpacked/bin')
  })

  test(' no need to fix path and replace is skipped', () => {
    const fixed_path = fixAsarPath('fixed/path/app.asar.unpacked/bin')
    expect(fixed_path).toBe('fixed/path/app.asar.unpacked/bin')
  })
})

describe('Constants - getShell', () => {
  function overrideProcessPlatform(os: string): string {
    const original_os = process.platform

    // override process.platform
    Object.defineProperty(process, 'platform', {
      value: os
    })

    return original_os
  }

  async function getShell(): Promise<string> {
    jest.resetModules()
    return await import('../constants').then((module) => {
      return module.execOptions.shell
    })
  }

  test('get shell for linux', async () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('linux')

    const shell = await getShell()
    expect(shell).toBe('/bin/bash')

    // get back to original platform
    overrideProcessPlatform(originalPlatform)
  })

  test('get shell for windows', async () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('win32')

    const shell = await getShell()
    expect(shell).toBe('powershell.exe')

    // get back to original platform
    overrideProcessPlatform(originalPlatform)
  })

  test('get shell for mac', async () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('darwin')

    const shell = await getShell()
    expect(shell).toBe('/bin/zsh')

    // get back to original platform
    overrideProcessPlatform(originalPlatform)
  })

  test('get default shell for unix os', async () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('linux')

    const shell = await getShell()
    expect(shell).toBe('/bin/bash')

    // get back to original platform
    overrideProcessPlatform(originalPlatform)
  })
})
