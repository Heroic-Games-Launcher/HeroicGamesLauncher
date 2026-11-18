import { findExeInArgs, handleExeFile } from '.'
import { app, type Event } from 'electron'
import { addOneTimeListener } from '../ipc'
import { Path } from '../schemas'

interface Options {
  event?: Event
  workingDirectory?: string
}

let openExeArgument: Path | null = null

function findAndHandle(
  argv: string[],
  { event, workingDirectory }: Options = {}
): void {
  const maybeExePath = findExeInArgs(argv, workingDirectory)
  if (maybeExePath) {
    event?.preventDefault()
    if (!handleExeFile(maybeExePath)) {
      openExeArgument = maybeExePath
    }
  }
}

addOneTimeListener('frontendReady', () => {
  findAndHandle(process.argv)
  if (openExeArgument) {
    handleExeFile(openExeArgument)
    openExeArgument = null
  }
})

app.on('second-instance', (event, argv, workingDirectory) =>
  findAndHandle(argv, { event, workingDirectory })
)
app.on('open-file', (event, rawPath) => findAndHandle([rawPath], { event }))
