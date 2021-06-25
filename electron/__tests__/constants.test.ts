import { fixAsarPath, getShell } from '../constants';

describe('Constants - fixAsarPath', () => {
  test('need to fix path and replace correctly', () => {
    const fixed_path = fixAsarPath('path/app.asar/bin');
    expect(fixed_path).toBe('path/app.asar.unpacked/bin');
  })

  test(' no need to fix path and replace is skipped', () => {
    const fixed_path = fixAsarPath('fixed/path/app.asar.unpacked/bin');
    expect(fixed_path).toBe('fixed/path/app.asar.unpacked/bin');
  })
})

describe('Constants - getShell', () => {

  function overrideProcessPlatform(os: string): string
  {
    const original_os = process.platform;

    // override process.platform
    Object.defineProperty(process, 'platform', {
      value: os
    });

    return original_os;
  }

  test('get enviroment SHELL for unix os', () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('linux');

    // store original shell
    const stored_shell = process.env.SHELL;

    process.env.SHELL = 'path/to/bash';
    const shell = getShell();
    expect(shell).toBe('path/to/bash');

    // get back to original shell
    process.env.SHELL = stored_shell;

    // get back to original platform
    overrideProcessPlatform(originalPlatform);
  })

  test('get default shell for unix os', () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('linux');

    // store original shell
    const stored_shell = process.env.SHELL;

    delete process.env.SHELL;
    const shell = getShell();
    expect(shell).toBe('/usr/bin/bash');

    // get back to original shell
    process.env.SHELL = stored_shell;

    // get back to original platform
    overrideProcessPlatform(originalPlatform);
  })

  test('get powershell windows', () => {
    // override platform
    const originalPlatform = overrideProcessPlatform('win32');

    const shell = getShell();
    expect(shell).toBe('powershell.exe');

    // get back to original platform
    overrideProcessPlatform(originalPlatform);
  })
})
