import type { CpuInfo } from 'os'
import type { GPUInfo } from './index'

type SteamDeckInfo =
  | { isDeck: true; model: string }
  | { isDeck: false; model?: undefined }

function getSteamDeckInfo(cpus: CpuInfo[], gpus: GPUInfo[]): SteamDeckInfo {
  if (cpus[0]?.model !== 'AMD Custom APU 0405') return { isDeck: false }

  const primaryGpu = gpus.at(0)
  if (!primaryGpu || primaryGpu.vendorId !== '1002') return { isDeck: false }

  switch (primaryGpu.deviceId) {
    case '163f':
      return { isDeck: true, model: 'LCD' }
    case '1435':
      return { isDeck: true, model: 'OLED' }
    default:
      return { isDeck: false }
  }
}

export { getSteamDeckInfo }
export type { SteamDeckInfo }
