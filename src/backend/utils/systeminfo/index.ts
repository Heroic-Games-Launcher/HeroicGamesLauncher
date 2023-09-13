/**
 * @file Figures out system information (CPU, GPU, memory) and software versions (Heroic, Legendary, gogdl, etc.)
 */

import os from 'os'
import process from 'process'
import { filesize } from 'filesize'

import { getGpuInfo } from './gpu'
import { getMemoryInfo } from './memory'
import { getOsInfo } from './osInfo'
import { isSteamDeck } from './steamDeck'
import { getHeroicVersion } from './heroicVersion'
import {
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from '../helperBinaries'

type GPUInfo = {
  // The PCI device ID of the graphics card (hexadecimal)
  deviceId: string
  // The PCI vendor ID of the graphics card (hexadecimal)
  vendorId: string
  // The PCI sub-device ID of the graphics card (hexadecimal)
  subdeviceId?: string
  // The PCI sub-vendor ID of the graphics card (hexadecimal)
  subvendorId?: string
  // If the device has an entry in `pci.ids`, this is its name
  deviceString?: string
  // If the vendor has an entry in `pci.ids`, this is their name
  vendorString?: string
  // On Windows: The version of the GPU driver (formatted as nicely as possible)
  // On Linux:   The driver in use (nvidia/nouveau; amdgpu/radeon/etc.)
  driverVersion?: string
}

interface SystemInformation {
  CPU: {
    model: string
    cores: number
  }
  memory: {
    used: number
    total: number
    usedFormatted: string
    totalFormatted: string
  }
  GPUs: GPUInfo[]
  OS: {
    platform: string
    name: string
    version: string
  }
  isSteamDeck: boolean
  isFlatpak: boolean
  softwareInUse: {
    heroicVersion: string
    legendaryVersion: string
    gogdlVersion: string
    nileVersion: string
  }
}

let cachedSystemInfo: SystemInformation | null = null

/**
 * Gathers information about various system components
 * @param cache Whether cached information should be returned if possible
 */
async function getSystemInfo(cache = true): Promise<SystemInformation> {
  if (cache && cachedSystemInfo) return cachedSystemInfo

  const cpus = os.cpus()
  const memory = await getMemoryInfo()
  const gpus = await getGpuInfo()
  const detailedOsInfo = await getOsInfo()
  const isDeck = isSteamDeck(cpus, gpus)
  const [legendaryVersion, gogdlVersion, nileVersion] = await Promise.all([
    getLegendaryVersion(),
    getGogdlVersion(),
    getNileVersion()
  ])

  const sysinfo: SystemInformation = {
    CPU: {
      model: cpus[0]!.model,
      // FIXME: Technically the user could be on a server with more than one
      //        physical CPU installed, but I'd say that's rather unlikely
      cores: cpus.length
    },
    memory: {
      total: memory.total,
      used: memory.used,
      totalFormatted: filesize(memory.total, { base: 2 }) as string,
      usedFormatted: filesize(memory.used, { base: 2 }) as string
    },
    GPUs: gpus,
    OS: {
      platform: process.platform,
      version: process.getSystemVersion(),
      ...detailedOsInfo
    },
    isSteamDeck: isDeck,
    isFlatpak: !!process.env.FLATPAK_ID,
    softwareInUse: {
      heroicVersion: getHeroicVersion(),
      legendaryVersion: legendaryVersion,
      gogdlVersion: gogdlVersion,
      nileVersion: nileVersion
    }
  }
  cachedSystemInfo = sysinfo
  return sysinfo
}

async function formatSystemInfo(info: SystemInformation): Promise<string> {
  return `CPU: ${info.CPU.cores}x ${info.CPU.model}
Memory: ${filesize(info.memory.total)} (used: ${filesize(info.memory.used)})
GPUs:
${info.GPUs.map(
  (gpu, index) => `  GPU ${index}:
    Name: ${gpu.vendorString} ${gpu.deviceString}
    IDs: D=${gpu.deviceId} V=${gpu.vendorId} SD=${gpu.subdeviceId} SV=${gpu.subvendorId}
    Driver: ${gpu.driverVersion}`
).join('\n')}
OS: ${info.OS.name} ${info.OS.version} (${info.OS.platform})

The current system is${info.isSteamDeck ? '' : ' not'} a Steam Deck
We are${info.isFlatpak ? '' : ' not'} running inside a Flatpak container

Software Versions:
  Heroic: ${info.softwareInUse.heroicVersion}
  Legendary: ${info.softwareInUse.legendaryVersion}
  gogdl: ${info.softwareInUse.gogdlVersion}
  Nile: ${info.softwareInUse.nileVersion}`
}

export { getSystemInfo, formatSystemInfo }
export type { SystemInformation, GPUInfo }
