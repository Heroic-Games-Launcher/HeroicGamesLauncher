/**
 * REDmod doesn't document its messages, so only a non-zero exit code without
 * its success message counts as a failed deploy
 */
export function redModDeployFailed({
  stdout,
  stderr,
  code
}: {
  stdout: string
  stderr: string
  code?: number | null
}): boolean {
  if (typeof code !== 'number' || code === 0) return false
  return !`${stdout}\n${stderr}`.toLowerCase().includes('deploy has succeeded')
}
