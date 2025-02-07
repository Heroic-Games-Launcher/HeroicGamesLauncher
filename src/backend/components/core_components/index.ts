import * as Registry from '../registry'

import LogFileComponent from './LogFile'
import LogFileWriterComponent from './LogFileWriter'
import LoggerComponent from './Logger'

async function registerCoreComponents() {
  await Registry.registerComponent(new LogFileComponent())
  await Registry.registerComponent(new LogFileWriterComponent())
  await Registry.registerComponent(new LoggerComponent())
}

export { registerCoreComponents }
