import fs from 'fs'
import * as util_os_processes from '../../os/processes'
import { getDiskInfo_unix } from '../unix'
import type { Path } from 'backend/schemas'

describe('getDiskInfo_unix', () => {
  it('Works with root path', async () => {
    const accessSyp = jest
      .spyOn(fs.promises, 'access')
      .mockImplementation(async () => Promise.resolve())
    const spawnWrapperSpy = jest
      .spyOn(util_os_processes, 'genericSpawnWrapper')
      .mockImplementation(async () => {
        return Promise.resolve({
          stdout:
            'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 100 90 10 90% /',
          stderr: '',
          exitCode: null,
          signalName: null
        })
      })

    const ret = await getDiskInfo_unix('/' as Path)
    expect(ret.totalSpace).toBe(100 * 1024)
    expect(ret.freeSpace).toBe(10 * 1024)
    expect(accessSyp).toHaveBeenCalledTimes(1)
    expect(spawnWrapperSpy).toHaveBeenCalledWith('df', ['-P', '-k', '/'])
    expect(spawnWrapperSpy).toHaveBeenCalledTimes(1)
  })

  it('Works with nested path', async () => {
    const accessSyp = jest
      .spyOn(fs.promises, 'access')
      .mockImplementation(async (path) => {
        if (path === '/foo/bar/baz') {
          return Promise.reject(new Error())
        }
        return Promise.resolve()
      })
    const spawnWrapperSpy = jest
      .spyOn(util_os_processes, 'genericSpawnWrapper')
      .mockImplementation(async () => {
        return Promise.resolve({
          stdout:
            'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 100 90 10 90% /foo/bar',
          stderr: '',
          exitCode: null,
          signalName: null
        })
      })

    const ret = await getDiskInfo_unix('/foo/bar/baz' as Path)
    expect(ret.totalSpace).toBe(100 * 1024)
    expect(ret.freeSpace).toBe(10 * 1024)
    expect(accessSyp).toHaveBeenCalledTimes(2)
    expect(spawnWrapperSpy).toHaveBeenCalledWith('df', ['-P', '-k', '/foo/bar'])
    expect(spawnWrapperSpy).toHaveBeenCalledTimes(1)
  })
})
