import * as util_os_processes from '../../os/processes'
import { getDiskInfo_windows } from '../windows'
import type { Path } from 'backend/schemas'

describe('getDiskInfo_windows', () => {
  it('Works with root path', async () => {
    const spawnWrapperSpy = jest
      .spyOn(util_os_processes, 'genericSpawnWrapper')
      .mockImplementation(async () => {
        return Promise.resolve({
          stdout: JSON.stringify([{ Caption: 'C:', FreeSpace: 10, Size: 100 }]),
          stderr: '',
          exitCode: null,
          signalName: null
        })
      })

    const ret = await getDiskInfo_windows('C:' as Path)
    expect(ret.totalSpace).toBe(100)
    expect(ret.freeSpace).toBe(10)
    expect(spawnWrapperSpy).toHaveBeenCalledWith('powershell', [
      'Get-CimInstance',
      '-Class',
      'Win32_LogicalDisk',
      '-Property',
      'Caption,FreeSpace,Size',
      '|',
      'Select-Object',
      'Caption,FreeSpace,Size',
      '|',
      'ConvertTo-Json',
      '-Compress'
    ])
    expect(spawnWrapperSpy).toHaveBeenCalledTimes(1)
  })

  it('Works with nested path', async () => {
    const spawnWrapperSpy = jest
      .spyOn(util_os_processes, 'genericSpawnWrapper')
      .mockImplementation(async () => {
        return Promise.resolve({
          stdout: JSON.stringify([{ Caption: 'C:', FreeSpace: 10, Size: 100 }]),
          stderr: '',
          exitCode: null,
          signalName: null
        })
      })

    const ret = await getDiskInfo_windows('C:/foo/bar/baz' as Path)
    expect(ret.totalSpace).toBe(100)
    expect(ret.freeSpace).toBe(10)
    expect(spawnWrapperSpy).toHaveBeenCalledWith('powershell', [
      'Get-CimInstance',
      '-Class',
      'Win32_LogicalDisk',
      '-Property',
      'Caption,FreeSpace,Size',
      '|',
      'Select-Object',
      'Caption,FreeSpace,Size',
      '|',
      'ConvertTo-Json',
      '-Compress'
    ])
    expect(spawnWrapperSpy).toHaveBeenCalledTimes(1)
  })
})
