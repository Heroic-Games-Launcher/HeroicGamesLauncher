import { parseGogdlOutput, parseLegendaryOutput } from '../parse'

describe('parseGogdlOutput', () => {
  test('keeps the timestamp when the sync completed', () => {
    const parsed = parseGogdlOutput(
      '1756310400.123456',
      `[SAVES] INFO: Local files: 3
[SAVES] INFO: Files in cloud: 0
[SAVES] INFO: No files in cloud, uploading
[SAVES] INFO: Uploading files
[SAVES] INFO: Done`
    )

    expect(parsed.state).toBe('ok')
    expect(parsed.action).toBe('upload')
    expect(parsed.timestamp).toBe('1756310400.123456')
    expect(parsed.counts).toEqual({
      local: 3,
      cloud: 0,
      deletedLocal: 0,
      deletedCloud: 0
    })
  })

  test('drops the timestamp on conflicts', () => {
    const parsed = parseGogdlOutput(
      '1756310400.123456',
      `[SAVES] INFO: Local files: 2
[SAVES] INFO: Files in cloud: 3
[SAVES] WARNING: Files in conflict force downloading or uploading of files
[SAVES] INFO: Done`
    )

    expect(parsed.state).toBe('conflicts')
    expect(parsed.reason).toBe('conflict')
    expect(parsed.timestamp).toBeUndefined()
  })

  test('drops the timestamp on refusals and errors', () => {
    const refused = parseGogdlOutput(
      '1756310400.123456',
      '[SAVES] WARNING: Refused to upload files, newer files in the cloud'
    )
    expect(refused.state).toBe('conflicts')
    expect(refused.timestamp).toBeUndefined()

    const failed = parseGogdlOutput(
      '1756310400.123456',
      '[SAVES] ERROR: There was an error uploading a file'
    )
    expect(failed.state).toBe('failed')
    expect(failed.reason).toBe('provider-error')
    expect(failed.timestamp).toBeUndefined()
  })

  test('reports counts for files deleted on both sides', () => {
    const parsed = parseGogdlOutput(
      '1756310400.5',
      `[SAVES] INFO: Uploading files
[SAVES] INFO: DELETING IN CLOUD a.sav
[SAVES] INFO: DELETING LOCALLY /saves/b.sav
[SAVES] INFO: Done`
    )

    expect(parsed.action).toBe('upload')
    expect(parsed.counts?.deletedCloud).toBe(1)
    expect(parsed.counts?.deletedLocal).toBe(1)
  })

  test('reports a no-op run', () => {
    const parsed = parseGogdlOutput(
      '1756310400.5',
      '[SAVES] INFO: Nothing to do'
    )

    expect(parsed.state).toBe('ok')
    expect(parsed.action).toBe('none')
    expect(parsed.timestamp).toBe('1756310400.5')
  })

  test('does not mistake logs for a timestamp', () => {
    const parsed = parseGogdlOutput('', '[SAVES] INFO: Done')

    expect(parsed.timestamp).toBeUndefined()
    expect(parsed.state).toBe('unknown')
  })
})

describe('parseLegendaryOutput', () => {
  test('reads the computed save path', () => {
    const parsed = parseLegendaryOutput(
      '',
      `[cli] INFO: Checking "Game" (abc)
[cli] INFO: Computed save path: "/home/user/.wine/drive_c/users/steamuser/Documents/Game"
[cli] INFO: Save game for "Game" is up to date, skipping...`
    )

    expect(parsed.computedPath).toBe(
      '/home/user/.wine/drive_c/users/steamuser/Documents/Game'
    )
    expect(parsed.state).toBe('ok')
    expect(parsed.action).toBe('none')
  })

  test('reports unresolved template variables as a failure', () => {
    const parsed = parseLegendaryOutput(
      '',
      `[cli] INFO: Computed save path: "/home/user/.wine/drive_c/users/steamuser/{userprofile}/Game"
[cli] WARNING: Path contains unprocessed variables, please enter the correct path manually.`
    )

    expect(parsed.state).toBe('failed')
    expect(parsed.reason).toBe('unresolved-vars')
  })

  test('reports lock and missing save path failures', () => {
    expect(
      parseLegendaryOutput(
        '',
        '[cli] ERROR: Unable to lock install data, cannot modify save path.'
      )
    ).toMatchObject({ state: 'failed', reason: 'lock' })

    expect(
      parseLegendaryOutput(
        '',
        '[cli] INFO: Save path for this title has not been set, skipping due to --yes'
      )
    ).toMatchObject({ state: 'failed', reason: 'no-path' })

    expect(
      parseLegendaryOutput('', '[cli] ERROR: Login failed! Cannot continue')
    ).toMatchObject({ state: 'failed', reason: 'provider-error' })
  })

  test('reads direction and dates for a download', () => {
    const parsed = parseLegendaryOutput(
      '',
      `[cli] INFO: Cloud save for "Game" is newer:
[cli] INFO: - Cloud save date: 2025-09-09 20:10:10
[cli] INFO: - Local save date: N/A
[cli] INFO: Downloading remote savegame...
[Core] INFO: Successfully completed savegame download.`
    )

    expect(parsed.state).toBe('ok')
    expect(parsed.action).toBe('download')
    expect(parsed.remoteDate).toBe('2025-09-09 20:10:10')
    expect(parsed.localDate).toBeUndefined()
  })

  test('reports an upload that had nothing to send as incomplete', () => {
    const parsed = parseLegendaryOutput(
      '',
      `[cli] INFO: Uploading local savegame...
[cli] INFO: No files to upload. If you believe this is incorrect run command with "--disable-filters"`
    )

    expect(parsed.state).toBe('incomplete')
  })

  test('treats a disabled direction as a no-op', () => {
    const parsed = parseLegendaryOutput(
      '',
      `[cli] INFO: Local save for "Game" is newer
[cli] INFO: Save game uploading is disabled, skipping...`
    )

    expect(parsed.state).toBe('ok')
    expect(parsed.action).toBe('none')
  })
})
