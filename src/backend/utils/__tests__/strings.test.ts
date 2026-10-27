import { decodeUTF8 } from '../strings'

jest.mock('backend/logger', () => ({
  logError: jest.fn()
}))

describe('decodeUTF8', () => {
  it('decodes a simple string', () => {
    const buffer = Buffer.from('Hello World')
    expect(decodeUTF8(buffer)).toBe('Hello World')
  })

  it('skips leading continuation bytes', () => {
    // '🚀' is 4 bytes: 0xF0 0x9F 0x9A 0x80
    // Test broken rocket + 'a'
    const buffer = Buffer.from([0x9f, 0x9a, 0x80, 0x61])
    expect(decodeUTF8(buffer)).toBe('a')
  })

  it('does not skip if first byte is not a continuation byte', () => {
    const buffer = Buffer.from([0x61, 0x80, 0x80])
    expect(decodeUTF8(buffer)).toBe(buffer.toString('utf-8'))
  })

  it('translates empty buffer to empty string', () => {
    const buffer = Buffer.alloc(0)
    expect(decodeUTF8(buffer)).toBe('')
  })
})
