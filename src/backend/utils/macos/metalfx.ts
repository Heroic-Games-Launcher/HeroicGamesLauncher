import { existsSync } from 'graceful-fs'
import { copyFile, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'

const BACKUP_SUFFIX = '.heroic-backup'
const PREFIX_MANIFEST = '.heroic-metalfx.json'

/** What gets copied into the prefix, and which runner file it comes from */
const PREFIX_DLLS = [
  { name: 'nvngx.dll', sourceName: 'nvngx-on-metalfx.dll' },
  { name: 'nvapi64.dll', sourceName: 'nvapi64.dll' }
]

interface ManifestEntry {
  state: 'backup' | 'none'
  sourceSize: number
  sourceMtimeMs: number
}

type PrefixManifest = Record<string, ManifestEntry>

function system32(prefix: string) {
  return join(prefix, 'drive_c', 'windows', 'system32')
}

function isInstallState(value: unknown): value is 'backup' | 'none' {
  return value === 'backup' || value === 'none'
}

function parseManifest(raw: string): PrefixManifest | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const manifest: PrefixManifest = {}
  for (const [dll, value] of Object.entries(parsed)) {
    // Manifests written before the size/mtime check stored only 'backup' | 'none'
    if (isInstallState(value)) {
      manifest[dll] = { state: value, sourceSize: -1, sourceMtimeMs: -1 }
      continue
    }
    if (!value || typeof value !== 'object' || !('state' in value)) continue
    const entry = value as {
      state?: unknown
      sourceSize?: unknown
      sourceMtimeMs?: unknown
    }
    if (!isInstallState(entry.state)) continue
    manifest[dll] = {
      state: entry.state,
      sourceSize: typeof entry.sourceSize === 'number' ? entry.sourceSize : -1,
      sourceMtimeMs:
        typeof entry.sourceMtimeMs === 'number' ? entry.sourceMtimeMs : -1
    }
  }
  return manifest
}

async function readManifest(prefix: string): Promise<PrefixManifest | null> {
  try {
    return parseManifest(await readFile(join(prefix, PREFIX_MANIFEST), 'utf-8'))
  } catch {
    return null
  }
}

/** Copies onto `target` by writing a temp file and renaming it into place */
async function copyAtomic(source: string, target: string) {
  const temporary = `${target}.heroic-tmp`
  await copyFile(source, temporary)
  await rename(temporary, target)
}

interface MetalFXInstall {
  /** False when this runner has no MetalFX NGX (`nvngx-on-metalfx.dll`) */
  available: boolean
  copied: string[]
}

/**
 * Copies the runner's MetalFX `nvngx` and `nvapi64.dll` into the prefix's
 * system32. The runner itself is left untouched, including system Game
 * Porting Toolkit and Whisky installs Heroic does not own. Files that were
 * already in system32 are kept as `*.heroic-backup`.
 *
 * A launch skips the copy when the source file's size and mtime match the
 * last copy recorded in the manifest.
 *
 * @returns `available: false` when the runner has no MetalFX NGX
 */
export async function installMetalFXIntoPrefix(
  prefix: string,
  windowsDllDir: string
): Promise<MetalFXInstall> {
  const ngxSource = join(windowsDllDir, 'nvngx-on-metalfx.dll')
  if (!existsSync(ngxSource)) return { available: false, copied: [] }

  const targetDir = system32(prefix)
  if (!existsSync(targetDir)) return { available: true, copied: [] }

  const manifest: PrefixManifest = (await readManifest(prefix)) ?? {}
  const copied: string[] = []

  for (const dll of PREFIX_DLLS) {
    const source = join(windowsDllDir, dll.sourceName)
    const target = join(targetDir, dll.name)
    if (!existsSync(source)) continue

    const sourceStat = await stat(source)
    const recorded = manifest[dll.name]
    if (
      recorded &&
      recorded.sourceSize === sourceStat.size &&
      recorded.sourceMtimeMs === sourceStat.mtimeMs &&
      existsSync(target)
    ) {
      continue
    }

    if (!recorded) {
      if (existsSync(target)) {
        await copyAtomic(target, target + BACKUP_SUFFIX)
        manifest[dll.name] = {
          state: 'backup',
          sourceSize: sourceStat.size,
          sourceMtimeMs: sourceStat.mtimeMs
        }
      } else {
        manifest[dll.name] = {
          state: 'none',
          sourceSize: sourceStat.size,
          sourceMtimeMs: sourceStat.mtimeMs
        }
      }
    } else {
      recorded.sourceSize = sourceStat.size
      recorded.sourceMtimeMs = sourceStat.mtimeMs
    }
    await copyAtomic(source, target)
    copied.push(dll.name)
  }

  if (Object.keys(manifest).length) {
    await writeFile(join(prefix, PREFIX_MANIFEST), JSON.stringify(manifest))
  }
  return { available: true, copied }
}

/**
 * Undoes {@link installMetalFXIntoPrefix}
 *
 * @returns The DLLs that were restored or removed
 */
export async function removeMetalFXFromPrefix(
  prefix: string
): Promise<string[]> {
  const manifest = await readManifest(prefix)
  if (!manifest) return []

  const targetDir = system32(prefix)
  const restored: string[] = []
  for (const [dll, entry] of Object.entries(manifest)) {
    const target = join(targetDir, dll)
    if (entry.state === 'backup' && existsSync(target + BACKUP_SUFFIX)) {
      await rename(target + BACKUP_SUFFIX, target)
    } else if (entry.state === 'none') {
      await rm(target, { force: true })
    }
    restored.push(dll)
  }
  await rm(join(prefix, PREFIX_MANIFEST), { force: true })
  return restored
}
