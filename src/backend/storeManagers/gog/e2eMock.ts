import { addTestOnlyListener } from 'backend/ipc'
import { RunnerCommandStub } from 'common/types'

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
    stdout: '0.7.1'
  }
]

let currentStubs = [...defaultStubs]

export const runGogdlCommandStub = async (command: string[]) => {
  const stub = currentStubs.find((stub) =>
    stub.commandParts.every((part) => command.includes(part))
  )

  if (stub?.response) return stub.response

  return Promise.resolve({
    stdout: stub?.stdout || '',
    stderr: stub?.stderr || ''
  })
}

// Add listeners to be called from e2e tests to stub the gogdl command calls
addTestOnlyListener(
  'setGogdlCommandStub',
  (stubs) => (currentStubs = [...stubs])
)
addTestOnlyListener(
  'resetGogdlCommandStub',
  () => (currentStubs = [...defaultStubs])
)
