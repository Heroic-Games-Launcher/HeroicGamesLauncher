import fs from 'fs'
import path from 'path'
import os from 'os'
import { readLastBytes } from '../read_last_bytes'
import { logError } from 'backend/logger'

jest.mock('backend/logger', () => ({
  logError: jest.fn()
}))

describe('readLastBytes', () => {
  const testFile = path.join(os.tmpdir(), `heroic_test_log_${Date.now()}.log`)

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

    const buffer = await readLastBytes(testFile, 100)
    expect(buffer.toString()).toBe(content)
  })

  it('reads only the last n bytes if the file is larger than n', async () => {
    const content = '0123456789'
    fs.writeFileSync(testFile, content)

    const buffer = await readLastBytes(testFile, 5)
    expect(buffer.toString()).toBe('56789')
  })

  it('throws error for non-existent files', async () => {
    await expect(readLastBytes('non_existent_file.log', 100)).rejects.toThrow()
    expect(logError).toHaveBeenCalled()
  })
})
