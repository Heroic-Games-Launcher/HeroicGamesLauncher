import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'

type CfgFile = Map<string, Map<string, string>>

function splitComments(lines: string[]): { comments: string[], dataLines: string[] } {
  const comments: string[] = []
  const dataLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
      comments.push(line)
    } else {
      dataLines.push(line)
    }
  }

  return { comments, dataLines }
}

function parseCfg(content: string): CfgFile {
  const result: CfgFile = new Map()
  let section = ''

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      section = trimmed.slice(1, -1).trim()
      if (!result.has(section)) result.set(section, new Map())
      continue
    }

    const eq = trimmed.indexOf('=')
    if (eq !== -1 && section) {
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      result.get(section)!.set(key, val)
    }
  }

  return result
}

function serializeCfg(cfg: CfgFile): string {
  const parts: string[] = []
  for (const [section, keys] of cfg) {
    if (keys.size === 0) continue
    parts.push(`[${section}]`)
    for (const [k, v] of keys) parts.push(`${k}=${v}`)
    parts.push('')
  }
  return parts.join('\n').trimEnd()
}

const DEPTH_PREPASS_KEYS: Record<string, string> = {
  'quality/depth_prepass/disable_for_vendors': '""',
  'quality/depth_prepass/enable': 'true'
}

export function applyDepthPrepassFix(installPath: string, enable: boolean) {
  const filePath = join(installPath, 'override.cfg')
  const raw = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : ''

  const { comments, dataLines } = splitComments(raw.split(/\r?\n/))
  const cfg = parseCfg(dataLines.join('\n'))

  const rendering = cfg.get('rendering') ?? new Map<string, string>()

  for (const key of Object.keys(DEPTH_PREPASS_KEYS)) {
    rendering.delete(key)
  }

  if (enable) {
    for (const [k, v] of Object.entries(DEPTH_PREPASS_KEYS)) {
      rendering.set(k, v)
    }
    cfg.set('rendering', rendering)
  } else if (rendering.size === 0) {
    cfg.delete('rendering')
  } else {
    cfg.set('rendering', rendering)
  }

  const data = serializeCfg(cfg)
  const output = comments.length > 0 ? `${data}\n\n${comments.join('\n')}` : data

  if (!output.trim()) {
    if (existsSync(filePath)) unlinkSync(filePath)
  } else {
    writeFileSync(filePath, output, 'utf-8')
  }
}
