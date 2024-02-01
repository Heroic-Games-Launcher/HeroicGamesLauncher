import { ipcMain } from 'electron'
import { runLegendaryCommandStubFunction } from 'common/types'

export let runLegendaryCommandStub: runLegendaryCommandStubFunction = () => {
  return {
    stdout: '',
    stderr: ''
  }
}

const resetRunLegendaryCommandStub = () => {
  runLegendaryCommandStub = () => {
    return {
      stdout: '',
      stderr: ''
    }
  }
}

const setRunLegendaryCommandStub = (fun: runLegendaryCommandStubFunction) =>
  (runLegendaryCommandStub = fun)

// Add listeners to be called from e2e tests to stub the
// legendary command calls
if (process.env.CI === 'e2e') {
  ipcMain.on('setRunLegendaryCommandStub', (fun) => {
    setRunLegendaryCommandStub(fun)
  })

  ipcMain.on('resetRunLegendaryCommandStub', () =>
    resetRunLegendaryCommandStub()
  )
}
