const { default: axios } = require('axios')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { parseArgs } = require('node:util')
const yaml = require('js-yaml')
const packageInfo = require('../package.json')

function getArchitecture(value = process.arch) {
  switch (value) {
    case 'x64':
    case 'x86_64':
      return {
        flatpak: 'x86_64',
        electron: 'x64',
        appImage: 'x86_64',
        unpackedDirectory: 'linux-unpacked'
      }
    case 'arm64':
    case 'aarch64':
      return {
        flatpak: 'aarch64',
        electron: 'arm64',
        appImage: 'arm64',
        unpackedDirectory: 'linux-arm64-unpacked'
      }
    default:
      throw new Error(
        `Unsupported architecture: ${value}. Use x86_64 or aarch64.`
      )
  }
}

function createLocalSource(architecture, version, root = process.cwd()) {
  const dist = path.resolve(root, 'dist')
  const unpacked = path.join(dist, architecture.unpackedDirectory)
  if (!fs.statSync(unpacked, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(
      `Missing ${unpacked}. Build the Linux ${architecture.electron} application first.`
    )
  }

  const archiveName = `Heroic-${version}-linux-${architecture.electron}.tar`
  const temporaryDirectory = fs.mkdtempSync(
    path.join(dist, '.flatpak-archive-')
  )
  try {
    const temporaryArchive = path.join(temporaryDirectory, archiveName)
    // Directory sources disable Flatpak's build cache. Normalize archive metadata
    // so unchanged application files reuse the cached build across preparations.
    execFileSync('tar', [
      '--sort=name',
      '--mtime=@0',
      '--owner=0',
      '--group=0',
      '--numeric-owner',
      '-C',
      dist,
      '-cf',
      temporaryArchive,
      architecture.unpackedDirectory
    ])
    const sha256 = createHash('sha256')
      .update(fs.readFileSync(temporaryArchive))
      .digest('hex')
    fs.renameSync(temporaryArchive, path.join(dist, archiveName))
    return {
      type: 'archive',
      path: `../dist/${archiveName}`,
      sha256,
      dest: 'squashfs-root'
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

function getReleaseAsset(release, architecture) {
  const version = release.tag_name.replace(/^v/, '')
  const name = `Heroic-${version}-linux-${architecture.appImage}.AppImage`
  const asset = release.assets.find((asset) => asset.name === name)
  if (!asset)
    throw new Error(`Release ${release.tag_name} does not contain ${name}`)
  return asset
}

function createManifest(architecture, source, release = false) {
  const template = fs.readFileSync(
    path.join(__dirname, 'templates/com.heroicgameslauncher.hgl.yml.template'),
    'utf8'
  )
  const manifest = yaml.load(
    template
      .replaceAll('${libdir}', `${architecture.flatpak}-linux-gnu`)
      .replaceAll('${helper-arch}', architecture.electron)
  )
  const heroic = manifest.modules.find((module) => module.name === 'heroic')
  const sourceIndex = heroic.sources.indexOf('${heroic-app-image}')
  if (sourceIndex === -1)
    throw new Error(
      'Heroic source placeholder is missing from the Flatpak template'
    )
  heroic.sources[sourceIndex] = source
  if (release) {
    heroic['build-commands'].unshift(
      'chmod +x Heroic-*.AppImage',
      './Heroic-*.AppImage --appimage-extract'
    )
  }

  if (architecture.flatpak === 'aarch64') {
    // Flatpak cannot select SDK extensions per architecture. Generate an ARM64
    // manifest without the x86 compatibility extensions, retaining others.
    const isX86Extension = (name) =>
      name.includes('.i386') ||
      name === 'org.freedesktop.Sdk.Extension.toolchain-i386' ||
      name === 'org.freedesktop.Platform.GL32'
    manifest['sdk-extensions'] = manifest['sdk-extensions'].filter(
      (name) => !isX86Extension(name)
    )
    if (!manifest['sdk-extensions'].length) delete manifest['sdk-extensions']
    for (const name of Object.keys(manifest['add-extensions'])) {
      if (isX86Extension(name)) delete manifest['add-extensions'][name]
    }
    if (!Object.keys(manifest['add-extensions']).length)
      delete manifest['add-extensions']

    const withoutCompatPaths = (value, separator) =>
      value
        .split(separator)
        .filter(
          (part) =>
            !part.includes('/i386-linux-gnu') && !part.includes('/app/lib32')
        )
        .join(separator)
    manifest['finish-args'] = manifest['finish-args'].map((arg) =>
      arg.startsWith('--env=XDG_CONFIG_DIRS=') ||
      arg.startsWith('--env=GST_PLUGIN_SYSTEM_PATH=')
        ? withoutCompatPaths(arg, ':')
        : arg
    )
    const bootstrap = manifest.modules.find(
      (module) => module.name === 'platform-bootstrap'
    )
    const ldConfig = bootstrap.sources.find(
      (source) => source['dest-filename'] === 'ld.so.conf'
    )
    ldConfig.contents = withoutCompatPaths(ldConfig.contents, '\n')
  }
  return manifest
}

async function main() {
  const { values, positionals } = parseArgs({
    options: { arch: { type: 'string', default: process.arch } },
    allowPositionals: true
  })
  if (
    positionals.length > 1 ||
    (positionals.length && positionals[0] !== 'release')
  ) {
    throw new Error(
      'Usage: node flatpak/prepareFlatpak.js [release] [--arch=x86_64|aarch64]'
    )
  }
  const architecture = getArchitecture(values.arch)
  const release = positionals[0] === 'release'
  let version = packageInfo.version
  let releaseTime = new Date().toISOString().split('T')[0]
  let source
  if (release) {
    const { data } = await axios.get(
      'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest'
    )
    const asset = getReleaseAsset(data, architecture)
    const { data: content } = await axios.get(asset.browser_download_url, {
      responseType: 'arraybuffer'
    })
    source = {
      type: 'file',
      url: asset.browser_download_url,
      sha512: createHash('sha512').update(content).digest('hex')
    }
    version = data.tag_name.replace(/^v/, '')
    releaseTime = data.published_at.split('T')[0]
  } else {
    source = createLocalSource(architecture, version)
  }

  const manifest = createManifest(architecture, source, release)
  fs.mkdirSync('flatpak-build/patches', { recursive: true })
  fs.writeFileSync(
    'flatpak-build/com.heroicgameslauncher.hgl.yml',
    yaml.dump(manifest, { lineWidth: -1, noRefs: true })
  )
  const metainfo = fs
    .readFileSync(
      path.join(
        __dirname,
        'templates/com.heroicgameslauncher.hgl.metainfo.xml.template'
      ),
      'utf8'
    )
    .replace('${heroic-version}', `v${version}`)
    .replace('${heroic-release-date}', releaseTime)
  fs.writeFileSync(
    'flatpak-build/com.heroicgameslauncher.hgl.metainfo.xml',
    metainfo
  )
  const flathub = require('./flathub.json')
  fs.writeFileSync(
    'flatpak-build/flathub.json',
    JSON.stringify(
      {
        ...flathub,
        'only-arches': [architecture.flatpak]
      },
      null,
      4
    ) + '\n'
  )
  for (const filename of [
    'com.heroicgameslauncher.hgl.desktop',
    'com.heroicgameslauncher.hgl.png',
    'patches/0001-timidity-fix-missing-includes.patch'
  ]) {
    fs.copyFileSync(
      path.join(__dirname, filename),
      path.join('flatpak-build', filename)
    )
  }
}

module.exports = {
  getArchitecture,
  createLocalSource,
  getReleaseAsset,
  createManifest
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
