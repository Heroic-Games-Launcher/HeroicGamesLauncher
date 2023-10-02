import type { PartialMemoryInfo } from './index'
import { genericSpawnWrapper } from '../../os/processes'

async function getMemoryInfo_linux(): Promise<PartialMemoryInfo> {
  const { stdout } = await genericSpawnWrapper('free', ['-b'], {
    env: { ...process.env, LANG: 'C' }
  })
  const match = stdout.match(/^\S*:\s*(\d*)\s*(\d*)/m)
  const totalString = match?.[1]
  const usedString = match?.[2]
  return {
    total: totalString ? Number(totalString) : 0,
    used: usedString ? Number(usedString) : 0
  }
}

export { getMemoryInfo_linux }
