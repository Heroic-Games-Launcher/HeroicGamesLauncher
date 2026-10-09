import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ReleasesInfo, Repositorys, WineVersionInfo } from 'common/types'
import { getAvailableVersions } from '../downloader/main'
import {
  updateWineListsIfOutdated,
  updateWineVersionInfos,
  wineDownloaderInfoStore
} from '../utils'

jest.mock('backend/logger')
jest.mock('backend/ipc')
jest.mock('../downloader/main', () => ({
  getAvailableVersions: jest.fn(),
  installVersion: jest.fn()
}))

const originalArch = Object.getOwnPropertyDescriptor(process, 'arch')!
const entry = (arch: string): WineVersionInfo => ({
  version: 'cachyos-11.0-20260703-slr',
  type: 'Proton-CachyOS',
  date: '2026-09-01',
  download: `https://example.invalid/proton-cachyos-${arch}.tar.xz`,
  checksum: `https://example.invalid/proton-cachyos-${arch}.sha512sum`,
  downsize: 123,
  disksize: 0,
  release_notes_link: 'https://example.invalid/release',
  installDir: '',
  isInstalled: false,
  hasUpdate: false
})

beforeEach(() => {
  Object.defineProperty(process, 'arch', { value: 'arm64' })
  wineDownloaderInfoStore.clear()
})

afterEach(() => {
  Object.defineProperty(process, 'arch', originalArch)
  wineDownloaderInfoStore.clear()
})

test('refresh replaces stale versioned download URLs', async () => {
  wineDownloaderInfoStore.set('wine-releases', [entry('x86_64')])
  jest.mocked(getAvailableVersions).mockResolvedValue([entry('arm64')])
  await updateWineVersionInfos(true, [Repositorys.PROTONCACHYOS])
  expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([
    entry('arm64')
  ])
})

test('refresh preserves installed state and marks changed artifacts for update', async () => {
  const installDir = mkdtempSync(join(tmpdir(), 'heroic-compat-test-'))
  try {
    wineDownloaderInfoStore.set('wine-releases', [
      {
        ...entry('x86_64'),
        installDir,
        isInstalled: true,
        disksize: 456
      }
    ])
    jest.mocked(getAvailableVersions).mockResolvedValue([entry('arm64')])
    await updateWineVersionInfos(true, [Repositorys.PROTONCACHYOS])
    expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([
      {
        ...entry('arm64'),
        installDir,
        isInstalled: true,
        disksize: 456,
        hasUpdate: true
      }
    ])
  } finally {
    rmSync(installDir, { recursive: true, force: true })
  }
})

test('an empty fetch preserves compatible cache entries and unrelated providers', async () => {
  const unrelated = {
    ...entry('arm64'),
    version: 'other',
    type: 'Wine-Crossover' as const
  }
  wineDownloaderInfoStore.set('wine-releases', [entry('arm64'), unrelated])
  jest.mocked(getAvailableVersions).mockResolvedValue([])
  await updateWineVersionInfos(true, [Repositorys.PROTONCACHYOS])
  expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([
    entry('arm64'),
    unrelated
  ])
})

test('an installed artifact without a checksum is marked for update when its URL changes', async () => {
  const installDir = mkdtempSync(join(tmpdir(), 'heroic-compat-test-'))
  try {
    wineDownloaderInfoStore.set('wine-releases', [
      {
        ...entry('x86_64'),
        checksum: '',
        installDir,
        isInstalled: true
      }
    ])
    jest
      .mocked(getAvailableVersions)
      .mockResolvedValue([{ ...entry('arm64'), checksum: '' }])
    await updateWineVersionInfos(true, [Repositorys.PROTONCACHYOS])
    expect(wineDownloaderInfoStore.get('wine-releases', [])[0]).toMatchObject({
      download: entry('arm64').download,
      installDir,
      isInstalled: true,
      hasUpdate: true
    })
  } finally {
    rmSync(installDir, { recursive: true, force: true })
  }
})

test('refresh does not replace another provider with the same version label', async () => {
  const unrelated = { ...entry('arm64'), type: 'Wine-Crossover' as const }
  wineDownloaderInfoStore.set('wine-releases', [unrelated])
  jest.mocked(getAvailableVersions).mockResolvedValue([entry('arm64')])
  await updateWineVersionInfos(true, [Repositorys.PROTONCACHYOS])
  expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([
    unrelated,
    entry('arm64')
  ])
})

test('cached reads omit incompatible uninstalled downloads', async () => {
  wineDownloaderInfoStore.set('wine-releases', [entry('x86_64')])
  await expect(updateWineVersionInfos()).resolves.toEqual([])
  expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([])
})

const currentReleases = {
  'ge-proton': { tag: 'GE-Proton11-6', published_at: '2026-09-01T00:00:00Z' },
  'proton-cachyos': {
    tag: 'cachyos-11.0-20260703-slr',
    published_at: '2026-09-01T00:00:00Z'
  }
} as ReleasesInfo

test.each([
  ['arm64', 'x86_64', 'arm64'],
  ['x64', 'arm64', 'x86_64']
])(
  'startup refreshes incompatible cached URLs on %s without a newer release',
  async (hostArch, oldArch, newArch) => {
    Object.defineProperty(process, 'arch', { value: hostArch })
    const latest = (arch: string) => ({
      ...entry(arch),
      version: 'Proton-CachyOS-latest'
    })
    wineDownloaderInfoStore.set('wine-releases', [latest(oldArch)])
    jest.mocked(getAvailableVersions).mockResolvedValue([latest(newArch)])

    await updateWineListsIfOutdated(currentReleases)

    expect(getAvailableVersions).toHaveBeenCalledWith({
      repositorys: [Repositorys.PROTONCACHYOS],
      count: 50
    })
    expect(wineDownloaderInfoStore.get('wine-releases', [])).toEqual([
      latest(newArch)
    ])
  }
)

test('startup does not refetch a current compatible catalog', async () => {
  wineDownloaderInfoStore.set('wine-releases', [
    { ...entry('arm64'), version: 'Proton-CachyOS-latest' }
  ])
  await updateWineListsIfOutdated(currentReleases)
  expect(getAvailableVersions).not.toHaveBeenCalled()
})

test('startup still refreshes a compatible catalog when a newer release exists', async () => {
  wineDownloaderInfoStore.set('wine-releases', [
    {
      ...entry('arm64'),
      version: 'Proton-CachyOS-latest',
      date: '2026-08-01'
    }
  ])
  jest.mocked(getAvailableVersions).mockResolvedValue([entry('arm64')])
  await updateWineListsIfOutdated(currentReleases)
  expect(getAvailableVersions).toHaveBeenCalledWith({
    repositorys: [Repositorys.PROTONCACHYOS],
    count: 50
  })
})

test('startup leaves a missing catalog lazy', async () => {
  await updateWineListsIfOutdated(currentReleases)
  expect(getAvailableVersions).not.toHaveBeenCalled()
})
