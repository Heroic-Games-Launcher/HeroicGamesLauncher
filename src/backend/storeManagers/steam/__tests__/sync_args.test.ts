import { syncDirectionFromArg } from '../sync_args'

describe('syncDirectionFromArg', () => {
  it('maps Heroic sync commands to the right direction', () => {
    expect(syncDirectionFromArg('--skip-upload')).toBe('down')
    expect(syncDirectionFromArg('--force-download')).toBe('down')
    expect(syncDirectionFromArg('--skip-download')).toBe('up')
    expect(syncDirectionFromArg('--force-upload')).toBe('up')
  })

  it('keeps plain directions and both-ways syncs', () => {
    expect(syncDirectionFromArg('download')).toBe('down')
    expect(syncDirectionFromArg('upload')).toBe('up')
    expect(syncDirectionFromArg('')).toBeUndefined()
  })
})
