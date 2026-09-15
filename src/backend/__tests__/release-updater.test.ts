import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript'
import { selectAppImageAsset } from '../../../flathub/release-assets'

const root = join(__dirname, '../../..')
const manifestPath =
  './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.yml'
const metainfoPath =
  './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.metainfo.xml'
const version = 'v2.22.1'
const url = `https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/${version}/Heroic-2.22.1-linux-x86_64.AppImage`
const content = Buffer.from('x86_64 release payload')
const armContent = Buffer.from('ARM64 release payload')
const sourcesPath = './com.heroicgameslauncher.hgl/heroic-sources.json'

async function runUpdater(
  requestedTag?: string,
  options: {
    archiveSources?: boolean
    missingArm64?: boolean
    failArm64Download?: boolean
    onWrite?: (name: string, value: string | Buffer) => void
  } = {}
) {
  const release = {
    tag_name: version,
    published_at: '2026-01-02T03:04:05Z',
    body: '# Release\n* Release-specific change',
    assets: [
      { browser_download_url: url.replace('x86_64', 'arm64') },
      { browser_download_url: url }
    ]
  }
  if (options.archiveSources) {
    release.assets = [
      { browser_download_url: url.replace('x86_64.AppImage', 'x64.tar.xz') },
      ...(!options.missingArm64
        ? [
            {
              browser_download_url: url.replace(
                'x86_64.AppImage',
                'arm64.tar.xz'
              )
            }
          ]
        : [])
    ]
  }
  const files = new Map<string, string | Buffer>([
    [
      manifestPath,
      `url: https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/v1.0.0/Heroic-1.0.0-linux-x86_64.AppImage\nsha512: ${'0'.repeat(128)}\n`
    ],
    [
      metainfoPath,
      readFileSync(
        join(
          root,
          'flatpak/templates/com.heroicgameslauncher.hgl.metainfo.xml.template'
        ),
        'utf8'
      )
        .replace('${heroic-version}', 'v1.0.0')
        .replace('${heroic-release-date}', '2025-01-01')
    ]
  ])
  if (options.archiveSources) {
    files.set(manifestPath, 'sources:\n  - heroic-sources.json\n')
    files.set(sourcesPath, '[]\n')
  }
  const get = jest.fn((target: string) => {
    if (options.failArm64Download && target.endsWith('arm64.tar.xz'))
      return Promise.reject(new Error('ARM64 download failed'))
    return Promise.resolve({
      data: target.startsWith('https://api.github.com/')
        ? release
        : target.endsWith('arm64.tar.xz')
          ? armContent
          : content
    })
  })
  const modules: Record<string, unknown> = {
    fs: {
      readFileSync: (name: string) => {
        const value = files.get(name)
        if (value === undefined)
          throw new Error(`Unexpected file read: ${name}`)
        return Buffer.isBuffer(value) ? value : Buffer.from(value)
      },
      writeFileSync: (name: string, value: string | Buffer) => {
        options.onWrite?.(name, value)
        files.set(name, value)
      }
    },
    crypto: jest.requireActual('node:crypto'),
    axios: { get },
    'fast-xml-parser': jest.requireActual('fast-xml-parser'),
    './release-assets': { selectAppImageAsset }
  }
  const source = readFileSync(join(root, 'flathub/update-flathub.ts'), 'utf8')
  const compiled = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2020,
      esModuleInterop: true
    }
  })
  await runInNewContext(compiled.outputText, {
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected module: ${name}`)
      return modules[name]
    },
    exports: {},
    process: {
      argv: [],
      env: requestedTag ? { RELEASE_VERSION: requestedTag } : {}
    },
    console: { log: jest.fn() }
  })
  return { files, get }
}

test.each([undefined, version])(
  'uses one release for package and metadata when the requested tag is %s',
  async (requestedTag) => {
    const { files, get } = await runUpdater(requestedTag)
    expect(get).toHaveBeenCalledWith(
      requestedTag
        ? `https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tags/${requestedTag}`
        : 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest'
    )
    const manifest = files.get(manifestPath)!.toString()
    expect(manifest).toContain(url)
    expect(manifest).toContain(
      createHash('sha512').update(content).digest('hex')
    )
    const metainfo = files.get(metainfoPath)!.toString()
    expect(metainfo.match(/<release version="[^"]+" date="[^"]+"/)?.[0]).toBe(
      '<release version="v2.22.1" date="2026-01-02"'
    )
    expect(metainfo).toContain('Release-specific change')
  }
)

test('updates both architecture-scoped tarball sources with their own checksums', async () => {
  const { files } = await runUpdater(version, { archiveSources: true })
  expect(JSON.parse(files.get(sourcesPath)!.toString())).toEqual(
    (
      [
        ['x86_64', 'x64', content],
        ['aarch64', 'arm64', armContent]
      ] satisfies [string, string, Buffer][]
    ).map(([flatpakArch, assetArch, payload]) => ({
      type: 'archive',
      url: url.replace('x86_64.AppImage', `${assetArch}.tar.xz`),
      sha512: createHash('sha512').update(payload).digest('hex'),
      dest: 'heroic',
      'only-arches': [flatpakArch]
    }))
  )
  expect(files.get(manifestPath)).toBe('sources:\n  - heroic-sources.json\n')
  expect(files.get(metainfoPath)!.toString()).toContain(
    '<release version="v2.22.1" date="2026-01-02"'
  )
})

test.each(['missingArm64', 'failArm64Download'] as const)(
  'does not update either architecture or metadata on %s',
  async (failure) => {
    const onWrite = jest.fn()
    await expect(
      runUpdater(version, { archiveSources: true, [failure]: true, onWrite })
    ).rejects.toThrow(/ARM64|arm64/)
    expect(onWrite).not.toHaveBeenCalled()
  }
)
