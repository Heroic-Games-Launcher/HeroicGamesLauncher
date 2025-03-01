import { Component } from 'backend/components/component'
import LogFile from '../LogFile/logfile'

declare module 'backend/components/registry/types' {
  interface ComponentExclusiveProducers {
    'logFileWriter:getAndPrepareLogFile': (name: string) => Promise<LogFile>
  }
}

export default class LogFileWriterComponent extends Component {
  name = 'LogFileWriter'

  // Keep track of which log files were requested already. If they're requested
  // for the first time this launch, clear them first
  private clearedLogFiles: string[] = []

  async init() {
    await this.addExclusiveProducer(
      'logFileWriter:getAndPrepareLogFile',
      async (name) => {
        const logfile = await this.invokeExclusiveProducer(
          'logFile:getLogFile',
          name
        )

        if (!this.clearedLogFiles.includes(name)) {
          await logfile.clear()
          this.clearedLogFiles.push(name)
        }

        return logfile
      }
    )
  }
}
