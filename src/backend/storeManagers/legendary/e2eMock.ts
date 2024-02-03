import { ipcMain } from 'electron'
import { RunnerCommandStub } from 'common/types'
import { LegendaryCommand } from './commands'

/*
 * Multiple parts of a command can be set for the stub to be able to stub
 * similar commands
 *
 * The first stub for which all commandParts are included in the executed
 * command will be selected. The stubs should be declared from more
 * precise to less precise to avoid unreachable stubs.
 *
 * We can stub a Promise<ExecResult> as a response, or stub stdout/stderr
 * values as an alternative to make the stubbing easier
 */
const defaultStubs: RunnerCommandStub[] = [
  {
    commandParts: ['--version'],
    response: Promise.resolve({
      stdout: 'legendary version "0.20.33", codename "Undue Alarm"',
      stderr: ''
    })
  }
]

let currentStubs = [...defaultStubs]

export const runLegendaryCommandStub = async (command: LegendaryCommand) => {
  const stub = currentStubs.find((stub) =>
    stub.commandParts.every((part) => command[part])
  )

  if (stub?.response) return stub.response

  return Promise.resolve({
    stdout: stub?.stdout || '',
    stderr: stub?.stderr || ''
  })
}

// Add listeners to be called from e2e tests to stub the legendary command calls
if (process.env.CI === 'e2e') {
  ipcMain.on('setLegendaryCommandStub', (stubs) => (currentStubs = [...stubs]))
  ipcMain.on(
    'resetLegendaryCommandStub',
    () => (currentStubs = [...defaultStubs])
  )
}
