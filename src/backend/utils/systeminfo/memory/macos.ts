import os from 'os'

import { genericSpawnWrapper } from '../../os/processes'

import type { PartialMemoryInfo } from './index'

const DEFAULT_PAGE_SIZE = 4096
async function getPageSize(): Promise<number> {
  const { stdout } = await genericSpawnWrapper('sysctl', ['-n', 'vm.pagesize'])
  const pageSize = Number(stdout.trim())
  return Number.isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize
}

async function getActiveAndWiredPages(): Promise<{
  activePages: number
  wiredPages: number
}> {
  const { stdout } = await genericSpawnWrapper('vm_stat')
  const match = stdout.match(
    /^Pages active:\s*(\d*)[\s\S]*^Pages wired down:\s*(\d*)/m
  )
  const activePagesString = match?.[1]
  const wiredPagesString = match?.[2]
  if (!activePagesString || !wiredPagesString)
    return { activePages: 0, wiredPages: 0 }
  return {
    activePages: Number(activePagesString),
    wiredPages: Number(wiredPagesString)
  }
}

async function getMemoryInfo_macos(): Promise<PartialMemoryInfo> {
  const total = os.totalmem()

  const pageSize = await getPageSize()
  const { activePages, wiredPages } = await getActiveAndWiredPages()
  const used = activePages * pageSize + wiredPages * pageSize

  return { total, used }
}

export { getMemoryInfo_macos }
