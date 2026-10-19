import { execFile, execFileSync } from 'child_process'
import { promisify } from 'util'
import type { GPUInfo } from '../index'

const execFileAsync = promisify(execFile)

export function parseGpuCoreCount(ioregOutput: string): number {
  const match = ioregOutput.match(/"gpu-core-count"\s*=\s*(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

let gpuCoreCount: number | undefined

/**
 * The number of GPU cores of an Apple Silicon Mac, 0 if unknown (Intel Macs)
 */
export function getAppleGpuCoreCount(): number {
  if (gpuCoreCount === undefined) {
    try {
      gpuCoreCount = parseGpuCoreCount(
        execFileSync('/usr/sbin/ioreg', ['-rd1', '-c', 'AGXAccelerator'], {
          encoding: 'utf-8',
          timeout: 5000
        })
      )
    } catch {
      gpuCoreCount = 0
    }
  }
  return gpuCoreCount
}

interface SPDisplaysGpu {
  _name?: string
  sppci_model?: string
  sppci_cores?: string
  spdisplays_vendor?: string
  'spdisplays_vendor-id'?: string
  'spdisplays_device-id'?: string
  spdisplays_mtlgpufamilysupport?: string
}

const KNOWN_VENDORS: Record<string, string> = {
  '106b': 'Apple',
  '1002': 'AMD',
  '8086': 'Intel',
  '10de': 'NVIDIA'
}

const toPciId = (id?: string) => id?.toLowerCase().replace(/^0x/, '') ?? ''

export function parseMacGpus(profilerOutput: string): GPUInfo[] {
  const { SPDisplaysDataType = [] } = JSON.parse(profilerOutput) as {
    SPDisplaysDataType?: SPDisplaysGpu[]
  }
  return SPDisplaysDataType.map((gpu) => {
    const vendorName = gpu.spdisplays_vendor?.replace(/^sppci_vendor_/, '')
    // Apple Silicon GPUs are not PCI devices and report no IDs
    const vendorId =
      toPciId(gpu['spdisplays_vendor-id']) ||
      (vendorName === 'Apple' ? '106b' : '')
    const vendorString = KNOWN_VENDORS[vendorId] ?? vendorName
    // The system info output already puts the vendor in front of the model
    const fullModel = gpu.sppci_model ?? gpu._name ?? 'Unknown GPU'
    const model =
      vendorString && fullModel.startsWith(`${vendorString} `)
        ? fullModel.slice(vendorString.length + 1)
        : fullModel
    const metalFamily = gpu.spdisplays_mtlgpufamilysupport?.match(/metal(\d+)/)

    return {
      deviceId: toPciId(gpu['spdisplays_device-id']),
      vendorId,
      deviceString: gpu.sppci_cores
        ? `${model} (${gpu.sppci_cores}-core GPU)`
        : model,
      vendorString,
      driverVersion: metalFamily ? `Metal ${metalFamily[1]}` : undefined
    }
  })
}

/**
 * Gathers information about GPUs on macOS via system_profiler
 */
export async function getGpuInfo_mac(): Promise<GPUInfo[]> {
  try {
    const { stdout } = await execFileAsync('/usr/sbin/system_profiler', [
      'SPDisplaysDataType',
      '-json'
    ])
    return parseMacGpus(stdout)
  } catch {
    return []
  }
}
