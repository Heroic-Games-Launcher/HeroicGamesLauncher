import { randomUUID } from 'crypto'
import { join } from 'path'
import { configStore, fixAsarPath } from '../constants'
import { LogPrefix } from '../logger/logger';
import { ProgressStatus } from '../progress'
import {
  RunCommand,
  RunCommandCollector,
  RunCommandExecutor
} from '../shared/command'

export class GogRunCommand extends RunCommand {
  private static executor: RunCommandExecutor

  static getExecutor(): RunCommandExecutor {
    if (GogRunCommand.executor) {
      return GogRunCommand.executor
    } else {
      const settings = configStore.get('settings') as { altGogdl: string }
      const executable =
        settings?.altGogdl ||
        fixAsarPath(join(__dirname, '..', 'bin', process.platform, 'gogdl'))
      const executor = new RunCommandExecutor(
        executable,
        [],
        new GogRunCommand('GOGDL', LogPrefix.Gog)
      )
      GogRunCommand.executor = executor
      return executor
    }
  }
}

export class GogProgressCollector extends RunCommandCollector {
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
    private onProgress: (value: Omit<ProgressStatus, 'action'>) => void
  ) {
    super()
  }

  override err(line: string): Promise<void> | void {
    const progressLine = line.match(
      /Progress: ([0-9.]+) ([0-9]+)\/([0-9]+), Running for: ([0-9]{2,}):([0-9]{2}):([0-9]{2}), ETA: ([0-9]{2,}):([0-9]{2}):([0-9]{2})/
    )
    if (progressLine) {
      const [
        ,
        progress,
        completedParts,
        totalParts,
        runningHours,
        runningMinutes,
        runningSeconds
        // etaHours,
        // etaMinutes,
        // etaSeconds
      ] = progressLine
      this.partial = {
        timestamp: Date.now(),
        progress: Number(progress),
        completedParts: Number(completedParts),
        totalParts: Number(totalParts),
        runningSeconds:
          Number(runningHours) * 3600 +
          Number(runningMinutes) * 60 +
          Number(runningSeconds)
        /* ETA returned by GOGDL is garbage */
        // etaSeconds:
        //   Number(etaHours) * 3600 + Number(etaMinutes) * 60 + Number(etaSeconds)
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
}
