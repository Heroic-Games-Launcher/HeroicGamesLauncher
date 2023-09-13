import {
  createAbortController,
  deleteAbortController
} from '../aborthandler/aborthandler'
import { runRunnerCommand as runLegendaryCommand } from '../../storeManagers/legendary/library'
import { runRunnerCommand as runGogdlCommand } from '../../storeManagers/gog/library'
import { runRunnerCommand as runNileCommand } from '../../storeManagers/nile/library'

async function getLegendaryVersion(): Promise<string> {
  const abortID = 'legendary-version'
  const { stdout, error, abort } = await runLegendaryCommand(
    { subcommand: undefined, '--version': true },
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (error ?? abort) return 'invalid'

  // Sample output:
  // legendary version "0.20.33", codename "Undue Alarm"
  // 1st capturing group matches the version, 2nd the codename
  const matches = stdout.match(/"([\d.]*)".*"(.*)"$/m)
  const version = matches?.[1]
  const codename = matches?.[2]
  if (!version || !codename) return 'invalid'
  return `${version} ${codename}`
}

async function getGogdlVersion(): Promise<string> {
  const abortID = 'gogdl-version'
  const { stdout, error } = await runGogdlCommand(
    ['--version'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (error) return 'invalid'

  return stdout
}

async function getNileVersion(): Promise<string> {
  const abortID = 'nile-version'
  const { stdout, error } = await runNileCommand(
    ['--version'],
    createAbortController(abortID)
  )
  deleteAbortController(abortID)

  if (error) return 'invalid'

  return stdout
}

export { getLegendaryVersion, getGogdlVersion, getNileVersion }
