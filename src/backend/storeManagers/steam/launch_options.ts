import shlex from 'shlex'

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

/** Steam-style launch line for Aurelia. */
export function buildAureliaLaunchOptions({
  env,
  wrappers,
  launcherArgs = ''
}: AureliaLaunchOptionsInput): AureliaLaunchOptions {
  const skippedEnv: string[] = []
  const envWords: string[] = []
  for (const [name, value] of Object.entries(env)) {
    if (!ENV_NAME.test(name)) {
      skippedEnv.push(name)
      continue
    }
    envWords.push(`${name}=${quoteToken(value)}`)
  }
  const prefix = [...envWords, ...wrappers.map(quoteToken)]

  const args = launcherArgs.trim()
  if (args.includes(COMMAND_MARKER)) {
    const line = [...prefix, args].join(' ')
    return { line, skippedEnv }
  }

  const argWords = args ? shlex.split(args).map(quoteToken) : []
  if (!prefix.length) {
    return { line: argWords.join(' '), skippedEnv }
  }
  const line = [...prefix, COMMAND_MARKER, ...argWords].join(' ')
  return { line, skippedEnv }
}
