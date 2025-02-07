import { join } from 'path'

import { Component } from '../../component'
import { logBasePath } from '../../registry/paths'

import LogFile from './logfile'

declare module 'backend/components/registry/types' {
  interface ComponentExclusiveProducers {
    'logFile:getLogFile': (name: string) => LogFile
  }
}

export default class LogFileComponent extends Component {
  name = 'LogFile'

  async init() {
    await this.addExclusiveProducer('logFile:getLogFile', (name) => {
      const file_path = join(logBasePath, name + '.log')
      return new LogFile(file_path)
    })
  }
}
