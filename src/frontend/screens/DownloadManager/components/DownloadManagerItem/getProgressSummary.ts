import { InstallProgress } from 'common/types'
import { formatMeasured, MEBIBYTES } from 'common/format'

export function getProgressSummary(progress: InstallProgress): string {
  const percent = `${Math.round(progress.percent ?? 0)}%`

  return progress.bytes === undefined
    ? `(${percent})`
    : `(${formatMeasured(progress.bytes, MEBIBYTES)} · ${percent})`
}
