import { redModDeployFailed } from '../redmod'

describe('redModDeployFailed', () => {
  it('accepts a deploy that exited cleanly', () => {
    expect(
      redModDeployFailed({
        stdout: 'Deploying mods...\nDeploy has succeeded',
        stderr: '',
        code: 0
      })
    ).toBe(false)
    expect(redModDeployFailed({ stdout: '', stderr: '', code: 0 })).toBe(false)
  })

  it('rejects a deploy that exited with an error', () => {
    expect(
      redModDeployFailed({
        stdout: '',
        stderr: 'Error: script compilation failed',
        code: 1
      })
    ).toBe(true)
  })

  it('trusts the success message over an odd exit code from Wine', () => {
    expect(
      redModDeployFailed({
        stdout: '',
        stderr: 'deploy has succeeded',
        code: 1
      })
    ).toBe(false)
  })

  it('accepts a deploy without an exit code', () => {
    expect(redModDeployFailed({ stdout: '', stderr: '' })).toBe(false)
    expect(redModDeployFailed({ stdout: '', stderr: '', code: null })).toBe(
      false
    )
  })
})
