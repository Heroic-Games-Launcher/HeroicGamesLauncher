import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface MacDisplay {
  name: string
  /** Size of the display's backing store, i.e. what a Retina-aware app renders at */
  pixelWidth: number
  pixelHeight: number
  /** Size of the desktop in points ("Looks like" in System Settings) */
  pointWidth: number
  pointHeight: number
  refreshRate: number
  isMain: boolean
  isVirtual: boolean
}

const VIRTUAL_DISPLAY_PATTERN = /virtual|screen sharing|sidecar|airplay|dummy/i

function parseDimensions(value: unknown): [number, number] | undefined {
  if (typeof value !== 'string') return
  const match = value.match(/(\d+)\s*x\s*(\d+)/)
  if (!match) return
  return [Number(match[1]), Number(match[2])]
}

function parseRefreshRate(value: unknown): number {
  if (typeof value !== 'string') return 0
  const match = value.match(/@\s*([\d.]+)\s*Hz/i)
  return match ? Number(match[1]) : 0
}

/**
 * Extracts the connected displays from `system_profiler SPDisplaysDataType -json`
 */
export function parseDisplays(profilerOutput: unknown): MacDisplay[] {
  const gpus = (profilerOutput as { SPDisplaysDataType?: unknown[] })
    ?.SPDisplaysDataType
  if (!Array.isArray(gpus)) return []

  const displays: MacDisplay[] = []
  for (const gpu of gpus) {
    const connected = (gpu as { spdisplays_ndrvs?: unknown[] })
      ?.spdisplays_ndrvs
    if (!Array.isArray(connected)) continue

    for (const entry of connected) {
      const display = entry as Record<string, unknown>
      const resolutionString =
        display._spdisplays_resolution ?? display.spdisplays_resolution
      const pixels = parseDimensions(display._spdisplays_pixels)
      const points = parseDimensions(resolutionString) ?? pixels
      if (!pixels || !points) continue

      const name =
        typeof display._name === 'string' ? display._name : 'Unknown display'
      displays.push({
        name,
        pixelWidth: pixels[0],
        pixelHeight: pixels[1],
        pointWidth: points[0],
        pointHeight: points[1],
        refreshRate: parseRefreshRate(resolutionString),
        isMain: display.spdisplays_main === 'spdisplays_yes',
        isVirtual:
          VIRTUAL_DISPLAY_PATTERN.test(name) ||
          display.spdisplays_virtualdevice === 'spdisplays_yes'
      })
    }
  }
  return displays
}

let displaysPromise: Promise<MacDisplay[]> | undefined
let displaysTimestamp = 0
const DISPLAY_CACHE_MS = 60_000

/**
 * Lists the displays currently attached to the Mac. Displays can be
 * (dis)connected at any time, so the result is only cached briefly
 */
export async function getMacDisplays(): Promise<MacDisplay[]> {
  if (!displaysPromise || Date.now() - displaysTimestamp > DISPLAY_CACHE_MS) {
    displaysTimestamp = Date.now()
    displaysPromise = execFileAsync(
      'system_profiler',
      ['SPDisplaysDataType', '-json'],
      { maxBuffer: 4 * 1024 * 1024 }
    )
      .then(({ stdout }) => parseDisplays(JSON.parse(stdout)))
      .catch(() => [])
  }
  return displaysPromise
}

function describeDisplay(display: MacDisplay): string {
  const scaled =
    display.pixelWidth !== display.pointWidth
      ? ` (desktop looks like ${display.pointWidth}x${display.pointHeight})`
      : ''
  const refresh = display.refreshRate ? ` @ ${display.refreshRate} Hz` : ''
  return `${display.name}: ${display.pixelWidth}x${display.pixelHeight}${refresh}${scaled}`
}

/**
 * Explains how the attached displays limit what the game can present, so a
 * low FPS reading isn't blamed on the game or the translation layer
 */
export function describeDisplayLimits(
  displays: MacDisplay[],
  retinaMode: boolean
): string[] {
  if (!displays.length) return []

  const lines = displays.map(
    (display) => `Display: ${describeDisplay(display)}`
  )
  const physical = displays.filter((display) => !display.isVirtual)

  if (!physical.length) {
    const refresh = Math.max(...displays.map((display) => display.refreshRate))
    lines.push(
      `Only a virtual display is attached (Screen Sharing/AirPlay/Sidecar). Presented FPS is capped at its ${refresh || 60} Hz refresh rate and streaming adds GPU load, so measure performance on a physical display.`
    )
    return lines
  }

  const fastest = Math.max(...physical.map((display) => display.refreshRate))
  if (fastest > 0 && fastest < 100) {
    lines.push(
      `The fastest attached display refreshes at ${fastest} Hz, so the game cannot present more than ${fastest} FPS with V-Sync on.`
    )
  }

  for (const display of physical) {
    if (display.pixelWidth === display.pointWidth) continue
    lines.push(
      retinaMode
        ? `Retina mode is on: on ${display.name} the game renders up to ${display.pixelWidth}x${display.pixelHeight}, ${Math.round((display.pixelWidth * display.pixelHeight) / (display.pointWidth * display.pointHeight))}x the pixels of its ${display.pointWidth}x${display.pointHeight} desktop.`
        : `Retina mode is off: on ${display.name} the game renders at most ${display.pointWidth}x${display.pointHeight} and macOS scales it to ${display.pixelWidth}x${display.pixelHeight}.`
    )
  }
  return lines
}
