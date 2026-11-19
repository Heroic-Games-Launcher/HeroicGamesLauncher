import { isAbsolute } from 'path'

const ANSI_ESCAPE = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`,
  'g'
)

const isWindowsPath = (value: string) => /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(value)

export const extractWinePath = (
  stdout: string,
  variant: 'win' | 'unix'
): string => {
  const isValid = (value: string) =>
    variant === 'unix' ? isAbsolute(value) : isWindowsPath(value)

  const cleaned = stdout
    .replace(ANSI_ESCAPE, '')
    .replace(/Command exited with status: \d+/g, '')
    .trim()

  if (isValid(cleaned)) {
    return cleaned
  }

  const candidates = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && isValid(line))

  return candidates.length ? candidates[candidates.length - 1] : ''
}
