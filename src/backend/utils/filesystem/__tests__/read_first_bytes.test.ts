import fs from 'fs'
import path from 'path'
import os from 'os'
import { readFirstBytes } from '../read_first_bytes'
import { logError } from 'backend/logger'

jest.mock('backend/logger', () => ({
  logError: jest.fn()
}))

describe('readFirstBytes', () => {
  const testFile = path.join(os.tmpdir(), `heroic_test_first_${Date.now()}.bin`)

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      try {
        fs.unlinkSync(testFile)
      } catch {
        // Ignore if file was already removed
      }
    }
    jest.clearAllMocks()
  })

  it('reads the whole file if it is smaller than n', async () => {
    const content = 'Hello World'
    fs.writeFileSync(testFile, content)

    const buffer = await readFirstBytes(testFile, 100)
    expect(buffer.toString()).toBe(content)
  })

  it('reads only the first n bytes if the file is larger than n', async () => {
    const content = '0123456789'
    fs.writeFileSync(testFile, content)

    const buffer = await readFirstBytes(testFile, 5)
    expect(buffer.toString()).toBe('01234')
  })

  it('throws error for non-existent files or directories', async () => {
    await expect(readFirstBytes('non_existent_file.bin', 100)).rejects.toThrow()
    await expect(readFirstBytes(os.tmpdir(), 100)).rejects.toThrow()
    expect(logError).toHaveBeenCalled()
  })
})
