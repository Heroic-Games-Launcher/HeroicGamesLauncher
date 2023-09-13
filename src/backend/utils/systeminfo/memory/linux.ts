import type { PartialMemoryInfo } from './index'
import { genericSpawnWrapper } from '../../os/processes'

async function getMemoryInfo_linux(): Promise<PartialMemoryInfo> {
  const { stdout } = await genericSpawnWrapper('free', ['-b'])
  const match = stdout.match(/^\w*:\s*(\d*)\s*(\d*)/m)
  const totalString = match?.[1]
  const usedString = match?.[2]
  return {
    total: Number(totalString),
    used: Number(usedString)
  }
}

export { getMemoryInfo_linux }
