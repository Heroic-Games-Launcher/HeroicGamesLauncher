import { existsSync, writeFileSync } from 'graceful-fs'
import { getFolderSize, unlinkFile } from '../../utils'

jest.mock('../../../logger/logfile')

const workDir = process.cwd()

// run test
describe('Utilities - Rest', () => {
  test('get folder size successful', () => {
    const size = getFolderSize('.')
    expect(typeof size).toBe('number')
    expect(size).not.toBeNaN()
    expect(size).not.toBeNull()
    expect(size).toBeGreaterThan(0)
  })

  test('get folder size of non existing folder returns NaN', () => {
    const size = getFolderSize('./not_existing')
    expect(typeof size).toBe('number')
    expect(size).toBeNaN()
  })

  test('unlink of folder fails', () => {
    try {
      unlinkFile(__dirname)
      throw Error('No error should be thrown!')
    } catch (error) {
      expect(String(error)).toBe(
        `Error: Couldn't remove ${workDir}/src/backend/toolmanager/__test__/utils!`
      )
    }
  })

  test('unlink files succeeds', () => {
    writeFileSync('newFile.txt', 'Hello new file!')
    try {
      unlinkFile('newFile.txt')
      expect(existsSync('newFile.txt')).toBeFalsy()
    } catch {
      throw Error('No error should be thrown!')
    }
  })
})
