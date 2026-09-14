const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const yaml = require('js-yaml')
const {
  getArchitecture,
  createLocalSource,
  getReleaseAsset,
  createManifest
} = require('./prepareFlatpak')

const localSource = {
  type: 'archive',
  path: '../dist/Heroic-1.2.3-linux-arm64.tar',
  dest: 'squashfs-root'
}
const moduleNamed = (manifest, name) =>
  manifest.modules.find((module) => module.name === name)

test('accepts Flatpak and Electron architecture names', () => {
  assert.deepEqual(getArchitecture('x64'), getArchitecture('x86_64'))
  assert.deepEqual(getArchitecture('arm64'), getArchitecture('aarch64'))
  assert.equal(getArchitecture('x64').flatpak, 'x86_64')
  assert.equal(getArchitecture('aarch64').electron, 'arm64')
  assert.throws(() => getArchitecture('arm'), /Unsupported architecture/)
})

test('x86_64 keeps its SDK and runtime compatibility extensions', () => {
  const manifest = createManifest(getArchitecture('x86_64'), localSource)
  assert.deepEqual(manifest['sdk-extensions'], [
    'org.freedesktop.Sdk.Compat.i386',
    'org.freedesktop.Sdk.Extension.toolchain-i386'
  ])
  assert(manifest['add-extensions']['org.freedesktop.Platform.Compat.i386'])
  assert(manifest['add-extensions']['org.freedesktop.Platform.GL32'])
  assert(
    manifest['finish-args'].some((arg) =>
      arg.includes('/usr/lib/x86_64-linux-gnu/GL:/usr/lib/i386-linux-gnu/GL')
    )
  )
  assert(
    manifest['finish-args'].some((arg) => arg.endsWith('/build/bin/x64/linux'))
  )
})

test('aarch64 has native paths without unavailable x86 extensions', () => {
  const manifest = createManifest(getArchitecture('aarch64'), localSource)
  assert(!manifest['sdk-extensions']?.length)
  assert(!Object.keys(manifest['add-extensions'] || {}).length)
  assert(
    manifest['finish-args'].includes(
      '--env=XDG_CONFIG_DIRS=/etc/xdg:/usr/lib/aarch64-linux-gnu/GL'
    )
  )
  assert(
    manifest['finish-args'].some((arg) =>
      arg.endsWith('/build/bin/arm64/linux')
    )
  )
  assert(
    !manifest['finish-args'].some((arg) =>
      /i386|lib32|x86_64-linux-gnu/.test(arg)
    )
  )
  const ldConfig = moduleNamed(manifest, 'platform-bootstrap').sources.find(
    (source) => source['dest-filename'] === 'ld.so.conf'
  )
  assert(!/i386|lib32/.test(ldConfig.contents))
  const commands = moduleNamed(manifest, 'timidity')['post-install'].join('\n')
  assert(commands.includes('/usr/lib/aarch64-linux-gnu/libpulse.so'))
  assert(!commands.includes('/usr/lib/x86_64-linux-gnu'))
})

test('local manifests install the archive without executing an AppImage', () => {
  const manifest = createManifest(getArchitecture('arm64'), localSource)
  const heroic = moduleNamed(manifest, 'heroic')
  assert.deepEqual(heroic.sources.at(-1), localSource)
  assert(
    !heroic['build-commands'].some((command) =>
      command.includes('--appimage-extract')
    )
  )
  assert(heroic['build-commands'].includes('mv squashfs-root /app/bin/heroic'))
  assert.equal(manifest.branch, undefined)
  const serialized = yaml.dump(manifest)
  assert(!serialized.includes('${heroic-app-image}'))
  assert(!serialized.includes('${libdir}'))
  assert(!serialized.includes('${helper-arch}'))
  assert.equal(
    moduleNamed(yaml.load(serialized), '7zip').sources[0].tag,
    '26.01'
  )
})

test('release manifests retain AppImage extraction', () => {
  const source = {
    type: 'file',
    url: 'https://example.invalid/Heroic.AppImage',
    sha512: 'abc'
  }
  const manifest = createManifest(getArchitecture('x64'), source, true)
  const heroic = moduleNamed(manifest, 'heroic')
  assert.deepEqual(heroic.sources.at(-1), source)
  assert.deepEqual(heroic['build-commands'].slice(0, 2), [
    'chmod +x Heroic-*.AppImage',
    './Heroic-*.AppImage --appimage-extract'
  ])
})

test('selects the release asset for the requested architecture', () => {
  const release = {
    tag_name: 'v1.2.3',
    assets: [
      {
        name: 'Heroic-1.2.3-linux-arm64.AppImage',
        browser_download_url: 'https://example.invalid/arm'
      },
      {
        name: 'Heroic-1.2.3-linux-x86_64.AppImage',
        browser_download_url: 'https://example.invalid/x86'
      }
    ]
  }
  assert.equal(
    getReleaseAsset(release, getArchitecture('x64')).browser_download_url,
    'https://example.invalid/x86'
  )
  assert.equal(
    getReleaseAsset(release, getArchitecture('aarch64')).browser_download_url,
    'https://example.invalid/arm'
  )
  assert.throws(
    () =>
      getReleaseAsset(
        { ...release, assets: release.assets.slice(1) },
        getArchitecture('aarch64')
      ),
    /does not contain.*arm64.AppImage/
  )
})

for (const [archName, unpackedDirectory] of [
  ['x86_64', 'linux-unpacked'],
  ['aarch64', 'linux-arm64-unpacked']
]) {
  test(
    `archives the ${archName} payload reproducibly, including paths with spaces`,
    { skip: process.platform !== 'linux' },
    (t) => {
      const root = fs.mkdtempSync(
        path.join(os.tmpdir(), 'heroic flatpak test ')
      )
      t.after(() => fs.rmSync(root, { recursive: true, force: true }))
      const unpacked = path.join(root, 'dist', unpackedDirectory)
      fs.mkdirSync(unpacked, { recursive: true })
      fs.writeFileSync(path.join(unpacked, 'heroic'), 'test payload')
      const source = createLocalSource(getArchitecture(archName), '1.2.3', root)
      const archive = path.resolve(root, 'flatpak-build', source.path)
      const hash = () =>
        createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
      const before = hash()
      const files = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
      assert(files.includes(`${unpackedDirectory}/heroic`))
      fs.utimesSync(path.join(unpacked, 'heroic'), new Date(), new Date())
      assert.deepEqual(
        createLocalSource(getArchitecture(archName), '1.2.3', root),
        source
      )
      assert.equal(hash(), before)
      assert.equal(source.dest, 'squashfs-root')
    }
  )
}

test('a missing local payload fails before creating a source archive', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroic-flatpak-missing-'))
  try {
    assert.throws(
      () => createLocalSource(getArchitecture('aarch64'), '1.2.3', root),
      /linux-arm64-unpacked/
    )
    assert(
      !fs.existsSync(path.join(root, 'dist', 'Heroic-1.2.3-linux-arm64.tar'))
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
