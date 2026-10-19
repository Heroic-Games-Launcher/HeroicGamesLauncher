import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'graceful-fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execFileAsync = promisify(execFile)

/** Ships with macOS 27, which records Metal frame statistics of every app all the time */
const METALPERFTRACE = '/usr/bin/metalperftrace'

type Bottleneck = 'gpu' | 'display' | 'cpu'

interface PerformanceReport {
  process: string
  width: number
  height: number
  presentingSeconds: number
  frames: number
  fps: number
  frameTimeAvgMs: number
  frameTimeMaxMs: number
  /** FPS of the slowest 1% of the roughly one-second intervals metalperftrace records */
  lowestIntervalFps?: number
  gpuTimeAvgMs: number
  drawableWaitAvgMs: number
  metalMemoryMiB?: number
  bottleneck: Bottleneck
}

export interface PerformanceFilter {
  /** Matches the name of the process that presented the frames, case-insensitive */
  processNames?: string[]
  /** Matches the name of the CAMetalLayer, e.g. Wine's `WineMetalView` */
  layerName?: RegExp
}

type Json = Record<string, unknown>

function get(object: unknown, ...path: string[]): unknown {
  let current = object
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Json)[key]
  }
  return current
}

function num(object: unknown, ...path: string[]): number {
  const value = get(object, ...path)
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function str(object: unknown, ...path: string[]): string {
  const value = get(object, ...path)
  return typeof value === 'string' ? value : ''
}

function layerConfiguration(layer: unknown): Json | undefined {
  const timeline = get(layer, 'Configuration Timeline')
  if (Array.isArray(timeline) && timeline.length) {
    // The configuration the layer spent the most time in
    return [...(timeline as unknown[])].sort(
      (a, b) => num(b, 'Duration MCT Seconds') - num(a, 'Duration MCT Seconds')
    )[0] as Json
  }
  const configuration = get(layer, 'Configuration')
  return configuration && typeof configuration === 'object'
    ? (configuration as Json)
    : undefined
}

function lowestIntervalFps(layer: unknown): number | undefined {
  const timeline = get(layer, 'Stats Timeline')
  if (!Array.isArray(timeline)) return
  const rates = timeline
    .map((interval) => {
      const count = num(interval, 'Frame-On-Glass Interval Stats', 'Count')
      const total = num(interval, 'Frame-On-Glass Interval Stats', 'Total (ms)')
      return count >= 2 && total > 0 ? (count * 1000) / total : undefined
    })
    .filter((rate): rate is number => rate !== undefined)
    .sort((a, b) => a - b)
  if (rates.length < 20) return
  return rates[Math.ceil(rates.length * 0.01) - 1]
}

export function classifyBottleneck(
  frameTimeMs: number,
  gpuTimeMs: number,
  drawableWaitMs: number
): Bottleneck {
  if (frameTimeMs <= 0) return 'cpu'
  if (gpuTimeMs >= frameTimeMs * 0.85) return 'gpu'
  if (drawableWaitMs >= frameTimeMs * 0.2) return 'display'
  return 'cpu'
}

/**
 * Picks the layer that presented the most frames among those matching
 * `filter` from the output of `metalperftrace overview --json`
 */
export function summarizeOverview(
  overview: unknown,
  filter: PerformanceFilter
): PerformanceReport | undefined {
  if (!Array.isArray(overview)) return

  const processNames = (filter.processNames ?? []).map((name) =>
    name.toLowerCase()
  )
  let best: { session: unknown; layer: unknown; frames: number } | undefined

  for (const session of overview) {
    const processName = str(session, 'Process')
    const processMatches = processNames.includes(processName.toLowerCase())
    const layers = get(session, 'Layers')
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const layerName = str(layerConfiguration(layer), 'Name')
      if (!processMatches && !(filter.layerName?.test(layerName) ?? false)) {
        continue
      }
      const frames = num(
        layer,
        'Total Session Stats',
        'Presented Frame Stats',
        'Frame Count'
      )
      if (frames > 0 && (!best || frames > best.frames)) {
        best = { session, layer, frames }
      }
    }
  }
  if (!best) return

  const totals = get(best.layer, 'Total Session Stats')
  const glass = get(totals, 'Frame-On-Glass Interval Stats')
  const presented = get(totals, 'Presented Frame Stats')
  const glassCount = num(glass, 'Count')
  const glassTotalMs = num(glass, 'Total (ms)')
  const activeSeconds = num(totals, 'Time Active (sec)')

  const frameTimeAvgMs =
    glassCount > 0 && glassTotalMs > 0
      ? glassTotalMs / glassCount
      : activeSeconds > 0
        ? (activeSeconds * 1000) / best.frames
        : 0
  const gpuTimeAvgMs = num(presented, 'On-GPU Walltime Stats', 'Average (ms)')
  const drawableWaitAvgMs = num(
    presented,
    'Next Drawable Wait Walltime Stats',
    'Average (ms)'
  )
  const configuration = layerConfiguration(best.layer)
  const metalMemoryMiB = num(
    best.session,
    'Resource Usage',
    'Metal Device Allocated Size (MiB)'
  )

  return {
    process: str(best.session, 'Process'),
    width: num(configuration, 'Width (pixels)'),
    height: num(configuration, 'Height (pixels)'),
    presentingSeconds: glassTotalMs > 0 ? glassTotalMs / 1000 : activeSeconds,
    frames: best.frames,
    fps: frameTimeAvgMs > 0 ? 1000 / frameTimeAvgMs : 0,
    frameTimeAvgMs,
    frameTimeMaxMs: num(glass, 'Max (ms)'),
    lowestIntervalFps: lowestIntervalFps(best.layer),
    gpuTimeAvgMs,
    drawableWaitAvgMs,
    metalMemoryMiB: metalMemoryMiB || undefined,
    bottleneck: classifyBottleneck(
      frameTimeAvgMs,
      gpuTimeAvgMs,
      drawableWaitAvgMs
    )
  }
}

const BOTTLENECK_ADVICE: Record<Bottleneck, string> = {
  gpu: 'GPU-bound: lowering the render resolution (DLSS/MetalFX, FSR or XeSS upscaling) or GPU-heavy settings raises FPS',
  display:
    'display-bound: frames wait for the display, so FPS is held at its refresh rate (V-Sync or frame limiter)',
  cpu: 'CPU/translation-bound: the GPU is idle part of every frame, so lowering resolution will not help; CPU-heavy settings (crowds, view distance, physics) will'
}

export function formatPerformanceReport(report: PerformanceReport): string[] {
  const minutes = report.presentingSeconds / 60
  const lines = [
    `Performance measured by macOS (metalperftrace) over ${minutes.toFixed(1)} minutes of rendering at ${report.width}x${report.height}, ${report.frames} frames presented by ${report.process}:`,
    `  ${report.fps.toFixed(1)} FPS average (${report.frameTimeAvgMs.toFixed(2)} ms per frame, longest frame ${report.frameTimeMaxMs.toFixed(0)} ms)` +
      (report.lowestIntervalFps !== undefined
        ? `, slowest 1% of seconds: ${report.lowestIntervalFps.toFixed(1)} FPS`
        : '')
  ]
  if (report.gpuTimeAvgMs > 0) {
    lines.push(
      `  GPU time ${report.gpuTimeAvgMs.toFixed(2)} ms per frame: the GPU alone could sustain about ${(1000 / report.gpuTimeAvgMs).toFixed(0)} FPS`
    )
  }
  lines.push(`  ${BOTTLENECK_ADVICE[report.bottleneck]}`)
  if (report.metalMemoryMiB) {
    lines.push(
      `  Metal memory in use: ${(report.metalMemoryMiB / 1024).toFixed(1)} GB`
    )
  }
  return lines
}

/**
 * Collects the Metal statistics macOS recorded between `start` and `end`
 * and summarizes the layer matching `filter` that presented the most frames
 */
export async function captureMetalPerformance(
  start: Date,
  end: Date,
  filter: PerformanceFilter
): Promise<PerformanceReport | undefined> {
  if (!existsSync(METALPERFTRACE)) return

  const directory = await mkdtemp(join(tmpdir(), 'heroic-metalperftrace-'))
  try {
    const { stdout } = await execFileAsync(
      METALPERFTRACE,
      [
        'collect',
        '--start',
        `@${Math.floor(start.getTime() / 1000)}`,
        '--end',
        // metalperftrace rejects end dates in the future, even by a fraction of a second
        `@${Math.floor(end.getTime() / 1000)}`,
        '--json',
        directory
      ],
      { timeout: 120_000 }
    )
    const traces = get(JSON.parse(stdout), 'traces')
    if (!Array.isArray(traces)) return

    let best: PerformanceReport | undefined
    for (const trace of traces) {
      const overview = await execFileAsync(
        METALPERFTRACE,
        ['overview', '--json', '--json-include-timeline', String(trace)],
        { timeout: 300_000, maxBuffer: 1024 * 1024 * 1024 }
      )
        .then(({ stdout: json }) => JSON.parse(json) as unknown)
        .catch(() => undefined)
      const report = summarizeOverview(overview, filter)
      if (report && (!best || report.frames > best.frames)) best = report
    }
    return best
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
