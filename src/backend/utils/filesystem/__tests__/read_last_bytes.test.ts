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
      } catch (e) {
        // Ignore if file was already removed
      }
    }
    jest.clearAllMocks()
  })

  it('reads the whole file if it is smaller than n', async () => {
    const content = 'Hello World'
    fs.writeFileSync(testFile, content)

    const result = await readLastBytes(testFile, 100)
    expect(result).toBe(content)
  })

  it('reads only the last n bytes if the file is larger than n', async () => {
    const content = '0123456789'
    fs.writeFileSync(testFile, content)

    const result = await readLastBytes(testFile, 5)
    expect(result).toBe('56789')
  })

  it('skips UTF-8 continuation bytes at the start', async () => {
    // '🚀' is 4 bytes: 0xF0 0x9F 0x9A 0x80
    const emoji = '🚀'
    const abc = 'abc'
    const content = Buffer.concat([Buffer.from(abc), Buffer.from(emoji), Buffer.from(abc)])
    fs.writeFileSync(testFile, content)

    let result = await readLastBytes(testFile, 6)
    expect(result).toBe('abc')

    result = await readLastBytes(testFile, 7)
    expect(result).toBe('🚀abc')
  })

  it('handles non-existent files gracefully', async () => {
    const result = await readLastBytes('non_existent_file.log', 100)
    expect(result).toBe('')
    expect(logError).toHaveBeenCalled()
  })
})
