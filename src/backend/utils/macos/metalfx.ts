import { createHash } from 'crypto'
import { existsSync, realpathSync } from 'graceful-fs'
import { copyFile, readFile, rename, rm, writeFile } from 'fs/promises'
import { join } from 'path'

const STOCK_SUFFIX = '.heroic-stock'
const BACKUP_SUFFIX = '.heroic-backup'
const PREFIX_MANIFEST = '.heroic-metalfx.json'
const PREFIX_DLLS = ['nvngx.dll', 'nvapi64.dll']

async function sha256(path: string): Promise<string | undefined> {
  try {
    return createHash('sha256')
      .update(await readFile(path))
      .digest('hex')
  } catch {
    return undefined
  }
}

async function sameContent(a: string, b: string): Promise<boolean> {
  if (!existsSync(a) || !existsSync(b)) return false
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)])
  return !!hashA && hashA === hashB
}

function sameTarget(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch {
    return false
  }
}

async function swapIn(source: string, target: string): Promise<boolean> {
  if (!existsSync(source)) return false
  if (sameTarget(source, target) || (await sameContent(source, target))) {
    return true
  }
  if (existsSync(target) && !existsSync(target + STOCK_SUFFIX)) {
    await rename(target, target + STOCK_SUFFIX)
  }
  await copyFile(source, target)
  return true
}

/**
 * GPTK 3 ships two NGX implementations: the default `nvngx` reports DLSS as
 * unsupported, `nvngx-on-metalfx` implements it with MetalFX. Apple's
 * instructions are to replace the former with the latter; the original stays
 * next to it as `*.heroic-stock`. D3DMetal only exposes DLSS when
 * `D3DM_ENABLE_METALFX=1`, so games launched without it are unaffected.
 *
 * @param windowsDllDir The runner's `lib/wine/x86_64-windows` folder
 * @returns false if this runner has no MetalFX-backed NGX
 */
export async function enableMetalFXInRunner(
  windowsDllDir: string
): Promise<boolean> {
  const dllReady = await swapIn(
    join(windowsDllDir, 'nvngx-on-metalfx.dll'),
    join(windowsDllDir, 'nvngx.dll')
  )
  if (!dllReady) return false

  // In Gcenx's builds both .so files are symlinks to libd3dshared.dylib, making this a no-op
  const unixDir = join(windowsDllDir, '..', 'x86_64-unix')
  await swapIn(join(unixDir, 'nvngx-on-metalfx.so'), join(unixDir, 'nvngx.so'))
  return true
}

type PrefixManifest = Record<string, 'backup' | 'none'>

async function readManifest(prefix: string): Promise<PrefixManifest | null> {
  try {
    const manifest = await readFile(join(prefix, PREFIX_MANIFEST), 'utf-8')
    return JSON.parse(manifest) as PrefixManifest
  } catch {
    return null
  }
}

function system32(prefix: string) {
  return join(prefix, 'drive_c', 'windows', 'system32')
}

/**
 * Copies the runner's `nvngx.dll` and `nvapi64.dll` into the prefix's
 * system32, where games and NGX look for them. Files that were already there
 * are kept as `*.heroic-backup` and a manifest records what to undo
 *
 * @returns The DLLs that were copied (empty if everything was up to date)
 */
export async function installMetalFXIntoPrefix(
  prefix: string,
  windowsDllDir: string
): Promise<string[]> {
  const targetDir = system32(prefix)
  if (!existsSync(targetDir)) return []

  const manifest: PrefixManifest = (await readManifest(prefix)) ?? {}
  const copied: string[] = []

  for (const dll of PREFIX_DLLS) {
    const source = join(windowsDllDir, dll)
    const target = join(targetDir, dll)
    if (!existsSync(source) || (await sameContent(source, target))) continue

    if (!manifest[dll]) {
      if (existsSync(target)) {
        await rename(target, target + BACKUP_SUFFIX)
        manifest[dll] = 'backup'
      } else {
        manifest[dll] = 'none'
      }
    }
    await copyFile(source, target)
    copied.push(dll)
  }

  if (Object.keys(manifest).length) {
    await writeFile(join(prefix, PREFIX_MANIFEST), JSON.stringify(manifest))
  }
  return copied
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
  for (const [dll, state] of Object.entries(manifest)) {
    const target = join(targetDir, dll)
    if (state === 'backup' && existsSync(target + BACKUP_SUFFIX)) {
      await rename(target + BACKUP_SUFFIX, target)
      restored.push(dll)
    } else if (state === 'none') {
      await rm(target, { force: true })
      restored.push(dll)
    }
  }
  await rm(join(prefix, PREFIX_MANIFEST), { force: true })
  return restored
}
