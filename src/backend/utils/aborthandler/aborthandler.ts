import { LogPrefix, logError } from './../../logger/logger'

const abortControllers = new Map<string, AbortController>()

function createAbortController(id: string): AbortController {
  const abortController = new AbortController()
  // add or update map entry
  abortControllers.set(id, abortController)
  return abortController
}

function callAbortController(id: string) {
  if (abortControllers.has(id)) {
    const abortController = abortControllers.get(id)!
    if (abortController && !abortController.signal.aborted) {
      return abortController.abort()
    }
  }

  logError(
    [
      'Aborting not possible. Could not find a matching abort controller for',
      id
    ],
    { prefix: LogPrefix.Backend }
  )
}

function callAllAbortControllers() {
  for (const key in abortControllers.keys()) {
    callAbortController(key)
  }
}

function deleteAbortController(id: string) {
  abortControllers.delete(id)
}

export {
  createAbortController,
  callAbortController,
  callAllAbortControllers,
  deleteAbortController
}
