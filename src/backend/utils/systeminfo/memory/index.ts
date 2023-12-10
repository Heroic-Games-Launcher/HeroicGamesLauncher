import type { SystemInformation } from '../index'

type PartialMemoryInfo = Omit<
  SystemInformation['memory'],
  'totalFormatted' | 'usedFormatted'
>

async function getMemoryInfo(): Promise<PartialMemoryInfo> {
  switch (process.platform) {
    case 'linux': {
      const { getMemoryInfo_linux } = await import('./linux')
      return getMemoryInfo_linux()
    }
    case 'win32': {
      const { getMemoryInfo_windows } = await import('./windows')
      return getMemoryInfo_windows()
    }
    case 'darwin': {
      const { getMemoryInfo_macos } = await import('./macos')
      return getMemoryInfo_macos()
    }
    default:
      return { total: 0, used: 0 }
  }
}

export { getMemoryInfo }
export type { PartialMemoryInfo }
