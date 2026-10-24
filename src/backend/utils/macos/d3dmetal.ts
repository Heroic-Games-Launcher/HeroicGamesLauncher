import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync } from 'graceful-fs'
import { dirname, join, resolve } from 'path'
import type { WineInstallation } from 'common/types'

const execFileAsync = promisify(execFile)

export interface D3DMetalRuntime {
  version: string
  major: number
  frameworkPath: string
  /** Folder holding the PE builtins (`nvngx.dll`, `nvapi64.dll`, ...) of this Wine build */
  windowsDllDir?: string
}

const FRAMEWORK = 'D3DMetal.framework'

/** Where Gcenx's GPTK, Whisky, Apple's GPTK and CrossOver keep D3DMetal, relative to a Wine `lib` folder */
const KNOWN_LOCATIONS = [
  ['external'],
  ['apple_gptk', 'external'],
  ['wine', 'apple_gptk', 'external']
]

function candidateLibRoots(wine: WineInstallation): string[] {
  const binDir = dirname(wine.bin)
  const roots = [
    wine.lib,
    wine.lib32,
    resolve(binDir, '..', 'lib'),
    resolve(binDir, '..', 'lib64')
  ].filter((root): root is string => !!root && existsSync(root))
  return [...new Set(roots.map((root) => resolve(root)))]
}

function searchFramework(dir: string, depth: number): string | undefined {
  if (depth < 0) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  if (entries.includes(FRAMEWORK)) return join(dir, FRAMEWORK)
  for (const entry of entries) {
    if (entry.startsWith('.') || entry.endsWith('.framework')) continue
    const found = searchFramework(join(dir, entry), depth - 1)
    if (found) return found
  }
  return
}

export function findD3DMetalFramework(
  wine: WineInstallation
): { frameworkPath: string; libRoot: string } | undefined {
  const roots = candidateLibRoots(wine)
  for (const libRoot of roots) {
    for (const location of KNOWN_LOCATIONS) {
      const frameworkPath = join(libRoot, ...location, FRAMEWORK)
      if (existsSync(frameworkPath)) return { frameworkPath, libRoot }
    }
  }
  for (const libRoot of roots) {
    const frameworkPath = searchFramework(libRoot, 2)
    if (frameworkPath) return { frameworkPath, libRoot }
  }
  return
}

export function parseMajorVersion(version: string): number {
  const major = parseInt(version.split('.')[0] ?? '', 10)
  return Number.isNaN(major) ? 0 : major
}

async function readBundleVersion(frameworkPath: string): Promise<string> {
  const plists = [
    join(frameworkPath, 'Resources', 'Info.plist'),
    join(frameworkPath, 'Versions', 'A', 'Resources', 'Info.plist'),
    join(frameworkPath, 'Resources', 'version.plist')
  ]
  for (const plist of plists) {
    if (!existsSync(plist)) continue
    try {
      // These plists are binary, which the `plist` package can't read
      const { stdout } = await execFileAsync('/usr/bin/plutil', [
        '-extract',
        'CFBundleShortVersionString',
        'raw',
        '-o',
        '-',
        plist
      ])
      const version = stdout.trim()
      if (version) return version
    } catch {
      // try the next plist
    }
  }
  return ''
}

/**
 * Finds the D3DMetal framework a Wine build ships and reads its version.
 * D3DMetal 3.0 (GPTK 3) is the first release that translates DLSS to MetalFX
 */
export async function detectD3DMetal(
  wine: WineInstallation
): Promise<D3DMetalRuntime | undefined> {
  if (!wine?.bin) return
  const found = findD3DMetalFramework(wine)
  if (!found) return

  const version = await readBundleVersion(found.frameworkPath)
  const windowsDllDir = join(found.libRoot, 'wine', 'x86_64-windows')
  return {
    version: version || 'unknown',
    major: parseMajorVersion(version),
    frameworkPath: found.frameworkPath,
    windowsDllDir: existsSync(windowsDllDir) ? windowsDllDir : undefined
  }
}
