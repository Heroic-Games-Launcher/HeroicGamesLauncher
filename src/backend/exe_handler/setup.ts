import { findExeInArgs, handleExeFile } from '.'
import { app, type Event } from 'electron'

interface Options {
  event?: Event
  workingDirectory?: string
}

function findAndHandle(
  argv: string[],
  { event, workingDirectory }: Options
): void {
  const maybeExePath = findExeInArgs(argv, workingDirectory)
  if (maybeExePath) {
    event?.preventDefault()
    handleExeFile(maybeExePath)
  }
}

findAndHandle(process.argv, {})

app.on('second-instance', (event, argv, workingDirectory) =>
  findAndHandle(argv, { event, workingDirectory })
)
app.on('open-file', (event, rawPath) => findAndHandle([rawPath], { event }))
