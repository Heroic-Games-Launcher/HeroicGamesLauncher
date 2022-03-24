import { randomUUID } from 'crypto'
import { join } from 'path'
import { configStore, fixAsarPath } from '../constants'
import { LogPrefix } from '../logger/logger'
import { ProgressStatus } from '../progress'
import {
  RunCommand,
  RunCommandCollector,
  RunCommandExecutor
} from '../shared/command'

export class LegendaryRunCommand extends RunCommand {
  private static executor: RunCommandExecutor

  static getExecutor(): RunCommandExecutor {
    if (LegendaryRunCommand.executor) {
      return LegendaryRunCommand.executor
    } else {
      const settings = configStore.get('settings') as { altLeg: string }
      const executable =
        settings?.altLeg ||
        fixAsarPath(join(__dirname, '..', 'bin', process.platform, 'legendary'))
      const executor = new RunCommandExecutor(
        executable,
        [],
        new LegendaryRunCommand('legendary', LogPrefix.Legendary)
      )
      LegendaryRunCommand.executor = executor
      return executor
    }
  }
}

export class LegendaryProgressCollector extends RunCommandCollector {
  private partial: Pick<
    ProgressStatus,
    | 'timestamp'
    | 'progress'
    | 'runningSeconds'
    | 'etaSeconds'
    | 'completedParts'
    | 'totalParts'
  > | null = null
  private uuid = randomUUID()

  constructor(
    private onProgress: (value: Omit<ProgressStatus, 'action'>) => void,
    private previousProgress: number | undefined
  ) {
    super()
  }

  override err(line: string): Promise<void> | void {
    const progressLine = line.match(
      /Progress: ([0-9.]+)% \(([0-9]+)\/([0-9]+)\), Running for ([0-9]{2,}):([0-9]{2}):([0-9]{2}), ETA: ([0-9]{2,}):([0-9]{2}):([0-9]{2})/
    )
    if (progressLine) {
      const [
        ,
        progress,
        completedParts,
        totalParts,
        runningHours,
        runningMinutes,
        runningSeconds,
        etaHours,
        etaMinutes,
        etaSeconds
      ] = progressLine
      this.partial = {
        timestamp: Date.now(),
        progress: this.getProgress(Number(progress)),
        completedParts: Number(completedParts),
        totalParts: Number(totalParts),
        runningSeconds:
          Number(runningHours) * 3600 +
          Number(runningMinutes) * 60 +
          Number(runningSeconds),
        etaSeconds:
          Number(etaHours) * 3600 + Number(etaMinutes) * 60 + Number(etaSeconds)
      }
      return
    }
    const downloadedLine = line.match(/Downloaded: ([0-9.]+) MiB/)
    if (downloadedLine && this.partial) {
      const [, downloaded] = downloadedLine
      const progress = {
        ...this.partial,
        uuid: this.uuid,
        completedMegabytes: Number(downloaded)
      }
      this.onProgress(progress)
    }
  }

  private getProgress(progress: number) {
    if (this.previousProgress) {
      return (
        this.previousProgress + progress * 0.01 * (100 - this.previousProgress)
      )
    }
    return progress
  }
}
