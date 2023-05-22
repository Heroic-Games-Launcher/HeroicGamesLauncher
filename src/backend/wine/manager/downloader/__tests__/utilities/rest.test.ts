import { existsSync, writeFileSync } from 'graceful-fs'
import { getFolderSize, unlinkFile } from '../../utilities'
import { testSkipOnWindows } from 'backend/__tests__/skip'

jest.mock('backend/logger/logger')

const workDir = process.cwd()

// run test
describe('Utilities - Rest', () => {
  testSkipOnWindows('get folder size successful', () => {
    const size = getFolderSize('.')
    expect(typeof size).toBe('number')
    expect(size).not.toBeNaN()
    expect(size).not.toBeNull()
    expect(size).toBeGreaterThan(0)
  })

  testSkipOnWindows(
    'get folder size of non existing folder returns NaN',
    () => {
      const size = getFolderSize('./not_existing')
      expect(typeof size).toBe('number')
      expect(size).toBeNaN()
    }
  )

  test('unlink of folder fails', async () => {
    expect(() => {
      unlinkFile(__dirname)
    }).toThrowError(
      `Couldn't remove ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities!`
    )
  })

  test('unlink files succeeds', () => {
    writeFileSync('newFile.txt', 'Hello new file!')

    expect(() => {
      unlinkFile('newFile.txt')
    }).not.toThrow()
    expect(existsSync('newFile.txt')).toBeFalsy()
  })
})
