import type { Runner } from 'common/types'
import type { LogPrefix } from './constants'

type RunnerOrComet = Runner | 'comet'

interface FullLogOptions {
  prefix?: LogPrefix
  forceLog?: boolean
}
type LogOptions = FullLogOptions | LogPrefix

export type { RunnerOrComet, LogOptions }
