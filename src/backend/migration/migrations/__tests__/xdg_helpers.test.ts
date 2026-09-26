import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  moveIfDestinationMissing,
  moveSyncIfDestinationMissing
} from '../xdg_helpers'

describe('XDG migration helpers', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-xdg-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  test('moves a path only when the destination is missing', async () => {
    const source = join(root, 'old', 'value')
    const destination = join(root, 'new', 'value')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'file'), 'old')

    expect(await moveIfDestinationMissing(source, destination)).toBe(true)
    expect(existsSync(source)).toBe(false)
    expect(readFileSync(join(destination, 'file'), 'utf8')).toBe('old')
  })

  test('does not overwrite an existing destination', () => {
    const source = join(root, 'old', 'file')
    const destination = join(root, 'new', 'file')
    mkdirSync(join(root, 'old'), { recursive: true })
    mkdirSync(join(root, 'new'), { recursive: true })
    writeFileSync(source, 'old')
    writeFileSync(destination, 'new')

    expect(moveSyncIfDestinationMissing(source, destination)).toBe(false)
    expect(readFileSync(source, 'utf8')).toBe('old')
    expect(readFileSync(destination, 'utf8')).toBe('new')
  })
})
