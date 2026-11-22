import { split } from 'shlex'

/** Aurelia's placeholder for the game command. */
export const COMMAND_MARKER = '%command%'

const SAFE_TOKEN = /^[A-Za-z0-9_@%+=:,./-]+$/
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Quote a word for Aurelia's parser. */
export function quoteToken(token: string): string {
  if (token !== '' && SAFE_TOKEN.test(token)) return token
  return `'${token.replaceAll("'", `'\\''`)}'`
}

export interface AureliaLaunchOptionsInput {
  /** Environment variables for the game. */
  env: Record<string, string>
  /** Wrapper command words, outermost first. */
  wrappers: string[]
  /** Heroic's "Game arguments" field. */
  launcherArgs?: string
}

export interface AureliaLaunchOptions {
  /** Line for `config game`; empty: none. */
  line: string
  /** Environment names Aurelia can't accept. */
  skippedEnv: string[]
}

/** Wine's DLL override variable. */
const DLL_OVERRIDES = 'WINEDLLOVERRIDES'

interface SteamLine {
  env: [string, string][]
  wrappers: string[]
  args: string[]
}

/** `NAME=value` with a shell name. */
function envAssignment(token: string): [string, string] | undefined {
  const eq = token.indexOf('=')
  if (eq < 0) return undefined
  const name = token.slice(0, eq)
  return ENV_NAME.test(name) ? [name, token.slice(eq + 1)] : undefined
}

/** Split a line around `%command%`. */
function splitSteamLine(line: string): SteamLine | undefined {
  const at = line.indexOf(COMMAND_MARKER)
  try {
    const before = split(line.slice(0, at))
    const args = split(line.slice(at + COMMAND_MARKER.length))
    const env: [string, string][] = []
    while (before.length) {
      const assignment = envAssignment(before[0])
      if (!assignment) break
      env.push(assignment)
      before.shift()
    }
    return { env, wrappers: before, args }
  } catch {
    return undefined
  }
}

/** Steam-style launch line for Aurelia. */
export function buildAureliaLaunchOptions({
  env,
  wrappers,
  launcherArgs = ''
}: AureliaLaunchOptionsInput): AureliaLaunchOptions {
  const skippedEnv: string[] = []
  const merged = new Map<string, string>()
  for (const [name, value] of Object.entries(env)) {
    if (!ENV_NAME.test(name)) {
      skippedEnv.push(name)
      continue
    }
    merged.set(name, value)
  }

  const args = launcherArgs.trim()
  const user = args.includes(COMMAND_MARKER) ? splitSteamLine(args) : undefined
  if (args.includes(COMMAND_MARKER) && !user) {
    // Unparsable; Aurelia reports it.
    const prefix = [...envWords(merged), ...wrappers.map(quoteToken)]
    return { line: [...prefix, args].join(' '), skippedEnv }
  }

  for (const [name, value] of user?.env ?? []) {
    const heroic = merged.get(name)
    if (name === DLL_OVERRIDES && heroic) {
      // Later entries win per DLL.
      merged.set(name, [heroic, value].filter(Boolean).join(';'))
    } else {
      merged.set(name, value)
    }
  }

  const prefix = [
    ...envWords(merged),
    ...[...wrappers, ...(user?.wrappers ?? [])].map(quoteToken)
  ]
  const argWords = (user ? user.args : args ? split(args) : []).map(quoteToken)
  if (!prefix.length && !user) {
    return { line: argWords.join(' '), skippedEnv }
  }
  const line = [...prefix, COMMAND_MARKER, ...argWords].join(' ')
  return { line, skippedEnv }
}

function envWords(env: Map<string, string>): string[] {
  return [...env].map(([name, value]) => `${name}=${quoteToken(value)}`)
}

/** Aurelia args for a custom prefix. */
export function aureliaPrefixArgs(
  dir: string | undefined,
  home: string
): string[] {
  const trimmed = dir?.trim()
  if (!trimmed) return ['--no-prefix']
  // Expand a leading ~ only.
  return ['--prefix', trimmed.replace(/^~(?=\/|$)/, home)]
}
