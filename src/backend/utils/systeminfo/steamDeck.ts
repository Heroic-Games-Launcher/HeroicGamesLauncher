import type { CpuInfo } from 'os'
import type { GPUInfo } from './index'

const isSteamDeck = (cpus: CpuInfo[], gpus: GPUInfo[]): boolean =>
  cpus[0]?.model === 'AMD Custom APU 0405' &&
  gpus[0]?.deviceId === '163f' &&
  gpus[0]?.vendorId === '1002'

export { isSteamDeck }
