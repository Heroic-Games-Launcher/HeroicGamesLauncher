import type { CpuInfo } from 'os'
import type { GPUInfo } from './index'
import { isSteamDeckGameMode } from 'backend/constants'

type SteamDeckInfo =
  | { isDeck: true; model: string; mode: 'game' | 'desktop' }
  | { isDeck: false; model?: undefined }

function getSteamDeckInfo(cpus: CpuInfo[], gpus: GPUInfo[]): SteamDeckInfo {
  if (
    cpus[0]?.model !== 'AMD Custom APU 0405' &&
    cpus[0]?.model !== 'AMD Custom APU 0932'
  )
    return { isDeck: false }

  const primaryGpu = gpus.at(0)
  if (!primaryGpu || primaryGpu.vendorId !== '1002') return { isDeck: false }

  const mode = isSteamDeckGameMode ? 'game' : 'desktop'
  switch (primaryGpu.deviceId) {
    case '163f':
      return { isDeck: true, model: 'LCD', mode }
    case '1435':
      return { isDeck: true, model: 'OLED', mode }
    default:
      return { isDeck: false }
  }
}

export { getSteamDeckInfo }
export type { SteamDeckInfo }
