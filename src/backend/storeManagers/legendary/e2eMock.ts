import { ipcMain } from 'electron'
import { LegendaryStub } from 'common/types'
import { LegendaryCommand } from './commands'

const defaultStubs: LegendaryStub[] = [
  {
    command: '--version',
    stdout: 'legendary version "0.20.33", codename "Undue Alarm"'
  }
]

let currentStubs = [...defaultStubs]

export const runLegendaryCommandStub = (command: LegendaryCommand) => {
  const stub = currentStubs.find((stub) => command[stub.command])

  return {
    stdout: stub?.stdout || '',
    stderr: stub?.stderr || ''
  }
}

const resetRunLegendaryCommandStubs = () => (currentStubs = [...defaultStubs])

const setRunLegendaryCommandStubs = (stubs: LegendaryStub[]) =>
  (currentStubs = [...stubs])

// Add listeners to be called from e2e tests to stub the
// legendary command calls
if (process.env.CI === 'e2e') {
  ipcMain.on('setRunLegendaryCommandStub', (stubs) => {
    setRunLegendaryCommandStubs(stubs)
  })

  ipcMain.on('resetRunLegendaryCommandStub', () =>
    resetRunLegendaryCommandStubs()
  )
}
