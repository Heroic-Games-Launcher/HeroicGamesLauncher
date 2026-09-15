import { axiosClient } from 'backend/utils'
import { Type, WineVersionInfo } from 'common/types'
import { fetchReleases } from '../../utilities'
import { installVersion } from '../../main'

jest.mock('backend/logger')

const originalArch = Object.getOwnPropertyDescriptor(process, 'arch')!
const useArch = (value: string) =>
  Object.defineProperty(process, 'arch', { value })
const asset = (name: string) => ({
  name,
  browser_download_url: `https://example.invalid/${name}`,
  size: 123
})
const release = (tag: string, names: string[]) => ({
  tag_name: tag,
  published_at: '2026-09-01T00:00:00Z',
  html_url: `https://example.invalid/releases/${tag}`,
  assets: names.map(asset)
})
const fetch = (type: Type) =>
  fetchReleases({ url: 'https://example.invalid/releases', type, count: 50 })

afterEach(() => {
  Object.defineProperty(process, 'arch', originalArch)
  jest.restoreAllMocks()
})

test.each(['arm64', 'x64'])(
  'CachyOS selects a matching archive and checksum on %s',
  async (arch) => {
    useArch(arch)
    const stem = 'proton-cachyos-11.0-20260703-slr'
    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: [
        release(stem, [
          `${stem}-arm64.tar.xz`,
          `${stem}-arm64.sha512sum`,
          `${stem}-x86_64_v3.tar.xz`,
          `${stem}-x86_64_v3.sha512sum`,
          `${stem}-x86_64.tar.xz`,
          `${stem}-x86_64.sha512sum`
        ])
      ]
    })
    const suffix = arch === 'arm64' ? 'arm64' : 'x86_64'
    const releases = await fetch('Proton-CachyOS')
    expect(releases).toHaveLength(2)
    for (const entry of releases) {
      expect(entry.download).toBe(
        `https://example.invalid/${stem}-${suffix}.tar.xz`
      )
      expect(entry.checksum).toBe(
        `https://example.invalid/${stem}-${suffix}.sha512sum`
      )
    }
  }
)

test.each(['arm64', 'x64'])(
  'GE selects a matching archive and checksum on %s',
  async (arch) => {
    useArch(arch)
    const stem = 'GE-Proton11-6'
    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: [
        release(stem, [
          `${stem}-x86_64.tar.gz`,
          `${stem}-aarch64.sha512sum`,
          `${stem}-aarch64.tar.gz`,
          `${stem}-x86_64.sha512sum`
        ])
      ]
    })
    const suffix = arch === 'arm64' ? 'aarch64' : 'x86_64'
    const releases = await fetch('GE-Proton')
    expect(releases).toHaveLength(2)
    for (const entry of releases) {
      expect(entry.download).toBe(
        `https://example.invalid/${stem}-${suffix}.tar.gz`
      )
      expect(entry.checksum).toBe(
        `https://example.invalid/${stem}-${suffix}.sha512sum`
      )
    }
  }
)

test('x64 still accepts older GE archives without an architecture suffix', async () => {
  useArch('x64')
  jest.spyOn(axiosClient, 'get').mockResolvedValue({
    data: [
      release('GE-Proton9-1', ['GE-Proton9-1.tar.gz', 'GE-Proton9-1.sha512sum'])
    ]
  })
  expect((await fetch('GE-Proton'))[0].download).toBe(
    'https://example.invalid/GE-Proton9-1.tar.gz'
  )
})

test.each(['GE-Proton', 'Proton-CachyOS'] as const)(
  'ARM64 omits %s releases without native assets',
  async (type) => {
    useArch('arm64')
    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: [
        release('1.0', [
          'tool-x86_64.tar.gz',
          'tool-x86_64.tar.xz',
          'tool-x86_64.sha512sum'
        ])
      ]
    })
    await expect(fetch(type)).resolves.toEqual([])
  }
)

test('an empty release response produces an empty catalog', async () => {
  jest.spyOn(axiosClient, 'get').mockResolvedValue({ data: [] })
  await expect(fetch('GE-Proton')).resolves.toEqual([])
})

test('the latest alias skips newer releases without an ARM64 artifact', async () => {
  useArch('arm64')
  jest.spyOn(axiosClient, 'get').mockResolvedValue({
    data: [
      release('GE-Proton11-7', ['GE-Proton11-7-x86_64.tar.gz']),
      release('GE-Proton11-6', ['GE-Proton11-6-aarch64.tar.gz'])
    ]
  })
  const releases = await fetch('GE-Proton')
  expect(releases.map((entry) => entry.version)).toEqual([
    'GE-Proton-latest',
    'GE-Proton11-6'
  ])
  expect(releases[0].download).toBe(releases[1].download)
})

test('missing download metadata is rejected before checksum retrieval', async () => {
  const get = jest
    .spyOn(axiosClient, 'get')
    .mockRejectedValue(new Error('unexpected request'))
  await expect(
    installVersion({
      versionInfo: {
        version: 'example',
        checksum: 'https://example.invalid/checksum'
      } as WineVersionInfo,
      installDir: '/nonexistent/compatibility-test'
    })
  ).rejects.toThrow('No download link provided for example')
  expect(get).not.toHaveBeenCalled()
})

test('ARM64 rejects an incompatible cached download before doing any I/O', async () => {
  useArch('arm64')
  const get = jest
    .spyOn(axiosClient, 'get')
    .mockRejectedValue(new Error('unexpected request'))
  await expect(
    installVersion({
      versionInfo: {
        type: 'Proton-CachyOS',
        version: 'example',
        download: 'https://example.invalid/tool-x86_64.tar.xz',
        checksum: 'https://example.invalid/checksum'
      } as WineVersionInfo,
      installDir: '/nonexistent/compatibility-test'
    })
  ).rejects.toThrow('not compatible with arm64')
  expect(get).not.toHaveBeenCalled()
})
