import { findExeInArgs, handleExeFile, launchExe } from '.'
import { app, type Event } from 'electron'
import { addHandler, addOneTimeListener } from '../ipc'

interface Options {
  event?: Event
  workingDirectory?: string
}

function findAndHandle(
  argv: string[],
  { event, workingDirectory }: Options = {}
): void {
  const maybeExePath = findExeInArgs(argv, workingDirectory)
  if (maybeExePath) {
    event?.preventDefault()
    handleExeFile(maybeExePath)
  }
}

addHandler('exe_handler.launchWithExeFile', (_e, exePath, appName, runner) =>
  launchExe(exePath, appName, runner)
)

addOneTimeListener('frontendReady', () => findAndHandle(process.argv))

app.on('second-instance', (event, argv, workingDirectory) =>
  findAndHandle(argv, { event, workingDirectory })
)
app.on('open-file', (event, rawPath) => findAndHandle([rawPath], { event }))
