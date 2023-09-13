import type { GPUInfo } from '../index'
import { populateDeviceAndVendorName } from './pci_ids'

type PartialGpuInfo = Omit<GPUInfo, 'deviceString' | 'vendorString'>

/**
 * Gathers information about the GPUs in the system. See {@link GPUInfo}
 */
async function getGpuInfo(): Promise<GPUInfo[]> {
  let partialGpus: PartialGpuInfo[]
  switch (process.platform) {
    case 'win32': {
      const { getGpuInfo_windows } = await import('./windows')
      partialGpus = await getGpuInfo_windows()
      break
    }
    case 'linux': {
      const { getGpuInfo_linux } = await import('./linux')
      partialGpus = await getGpuInfo_linux()
      break
    }
    case 'darwin':
      // FIXME
      partialGpus = []
      break
    default:
      return []
  }

  return populateDeviceAndVendorName(partialGpus)
}

export { getGpuInfo }
export type { PartialGpuInfo }
