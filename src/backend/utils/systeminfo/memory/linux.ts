import { readFile } from 'fs/promises'
import type { PartialMemoryInfo } from './index'

async function getMemoryInfo_linux(): Promise<PartialMemoryInfo> {
  const meminfo = await readFile('/proc/meminfo', 'utf-8')

  const valueOf = (key: string) =>
    Number(meminfo.match(new RegExp(`^${key}:\\s*(\\d+) kB`, 'm'))?.[1] ?? 0) *
    1024

  const total = valueOf('MemTotal')
  const available = valueOf('MemAvailable')
  return {
    total,
    used: total > 0 ? total - available : 0
  }
}

export { getMemoryInfo_linux }
