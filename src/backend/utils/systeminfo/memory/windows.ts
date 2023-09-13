import process from 'process'

import type { PartialMemoryInfo } from './index'

function getMemoryInfo_windows(): PartialMemoryInfo {
  const { total, free } = process.getSystemMemoryInfo()
  return {
    total: total * 1024,
    used: (total - free) * 1024
  }
}

export { getMemoryInfo_windows }
