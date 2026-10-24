import { isAbsolute, join } from 'path'

const CPU_ABI64 = 0x01000000
const CPU_X86_64 = CPU_ABI64 | 7
const CPU_ARM64 = CPU_ABI64 | 12

function architectureName(cputype: number): 'x86_64' | 'arm64' | undefined {
  const type = cputype >>> 0
  if (type === CPU_X86_64) return 'x86_64'
  if (type === CPU_ARM64) return 'arm64'
  return undefined
}

export function machArchitectures(buffer: Buffer): Array<'x86_64' | 'arm64'> {
  if (buffer.length < 8) return []
  const magic = buffer.readUInt32BE(0)
  const fat = magic === 0xcafebabe || magic === 0xbebafeca
  if (fat) {
    const little = magic === 0xbebafeca
    const read = (offset: number) =>
      little ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)
    const count = read(4)
    const found: Array<'x86_64' | 'arm64'> = []
    for (let index = 0; index < count; index++) {
      const offset = 8 + index * 20
      if (offset + 4 > buffer.length) break
      const name = architectureName(read(offset))
      if (name && !found.includes(name)) found.push(name)
    }
    return found
  }

  const littleMagic = buffer.readUInt32LE(0)
  if (littleMagic !== 0xfeedfacf && littleMagic !== 0xcffaedfe) return []
  const cputype =
    littleMagic === 0xfeedfacf ? buffer.readUInt32LE(4) : buffer.readUInt32BE(4)
  const name = architectureName(cputype)
  return name ? [name] : []
}

export function shouldLaunchWithRosetta(
  executable: Buffer | undefined,
  requested: boolean,
  appleSilicon: boolean
): boolean {
  if (!appleSilicon) return false
  if (requested) return true
  if (!executable) return false
  const architectures = machArchitectures(executable)
  return architectures.includes('x86_64') && !architectures.includes('arm64')
}

export function macGameBinary(
  installPath: string | undefined,
  executable: string | undefined,
  bundleExecutable: (app: string) => string | undefined
): string | undefined {
  const candidates: string[] = []
  if (executable) {
    candidates.push(
      isAbsolute(executable)
        ? executable
        : installPath
          ? join(installPath, executable)
          : executable
    )
  }
  if (installPath) candidates.push(installPath)

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/\/+$/, '')
    if (!cleaned) continue
    if (!cleaned.toLowerCase().endsWith('.app')) return cleaned
    const name = bundleExecutable(cleaned)
    if (name) return join(cleaned, 'Contents', 'MacOS', name)
  }
  return undefined
}
