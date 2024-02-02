import { ipcMain } from 'electron'
import { RunnerCommandStub } from 'common/types'

/*
 * Multiple parts of a command can be set for the stub to be able to stub
 * similar commands
 *
 * The first stub for which all commandParts are included in the executed
 * command will be selected. The stubs should be declared from more
 * precise to less precise to avoid unreachable stubs.
 */
const defaultStubs: RunnerCommandStub[] = [
  {
    commandParts: ['--version'],
    stdout: '0.7.1'
  }
]

let currentStubs = [...defaultStubs]

export const runGogdlCommandStub = (command: string[]) => {
  const stub = currentStubs.find((stub) =>
    stub.commandParts.every((part) => command.includes(part))
  )

  return {
    stdout: stub?.stdout || '',
    stderr: stub?.stderr || ''
  }
}

// Add listeners to be called from e2e tests to stub the gogdl command calls
if (process.env.CI === 'e2e') {
  ipcMain.on('setGogdlCommandStub', (stubs) => (currentStubs = [...stubs]))
  ipcMain.on('resetGogdlCommandStub', () => (currentStubs = [...defaultStubs]))
}
