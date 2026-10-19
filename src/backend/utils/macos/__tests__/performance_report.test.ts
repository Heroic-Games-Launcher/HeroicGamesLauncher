import {
  classifyBottleneck,
  formatPerformanceReport,
  summarizeOverview
} from '../performance_report'

const stats = (count: number, averageMs: number, maxMs = averageMs * 3) => ({
  Count: count,
  'Average (ms)': averageMs,
  'Total (ms)': count * averageMs,
  'Max (ms)': maxMs
})

// Shaped like `metalperftrace overview --json --json-include-timeline` output
function session(
  process: string,
  layerName: string,
  frames: number,
  frameMs: number,
  gpuMs: number,
  intervalFps: number[] = []
) {
  return {
    Process: process,
    PID: 1,
    'Resource Usage': { 'Metal Device Allocated Size (MiB)': 6144 },
    Layers: [
      {
        'Configuration Timeline': [
          {
            Name: 'Loading screen',
            'Width (pixels)': 1280,
            'Height (pixels)': 720,
            'Duration MCT Seconds': 2
          },
          {
            Name: layerName,
            'Width (pixels)': 5120,
            'Height (pixels)': 1440,
            'Duration MCT Seconds': 600
          }
        ],
        'Total Session Stats': {
          'Time Active (sec)': (frames * frameMs) / 1000,
          'Frame-On-Glass Interval Stats': stats(frames - 1, frameMs),
          'Presented Frame Stats': {
            'Frame Count': frames,
            'On-GPU Walltime Stats': stats(frames, gpuMs),
            'Next Drawable Wait Walltime Stats': stats(frames, 0.03)
          }
        },
        'Stats Timeline': intervalFps.map((fps) => ({
          'Frame-On-Glass Interval Stats': stats(fps, 1000 / fps)
        }))
      }
    ]
  }
}

describe('summarizeOverview', () => {
  const intervals = [...Array<number>(99).fill(60), 20]
  const overview = [
    session('WindowServer', 'Desktop', 100000, 8.3, 1),
    session(
      'wine64-preloader',
      'CAMetalLayer: WineMetalView',
      1000,
      16,
      15,
      intervals
    ),
    session(
      'wine64-preloader',
      'CAMetalLayer: WineMetalView',
      30000,
      25,
      24,
      intervals
    )
  ]

  test('picks the matching layer that presented the most frames', () => {
    const report = summarizeOverview(overview, {
      processNames: ['wine64-preloader'],
      layerName: /WineMetalView/
    })

    expect(report).toMatchObject({
      process: 'wine64-preloader',
      width: 5120,
      height: 1440,
      frames: 30000,
      fps: 40,
      frameTimeAvgMs: 25,
      gpuTimeAvgMs: 24,
      lowestIntervalFps: 20,
      metalMemoryMiB: 6144,
      bottleneck: 'gpu'
    })
  })

  test('matches layers by name when the process name differs', () => {
    expect(
      summarizeOverview(overview, { layerName: /WineMetalView/ })?.frames
    ).toBe(30000)
  })

  test('returns nothing without a match', () => {
    expect(
      summarizeOverview(overview, { processNames: ['Game'] })
    ).toBeUndefined()
    expect(summarizeOverview({ traces: [] }, {})).toBeUndefined()
  })
})

describe('classifyBottleneck', () => {
  test('tells GPU, display and CPU limits apart', () => {
    expect(classifyBottleneck(25, 24, 0.1)).toBe('gpu')
    expect(classifyBottleneck(16.7, 6, 10)).toBe('display')
    expect(classifyBottleneck(25, 8, 0.1)).toBe('cpu')
    expect(classifyBottleneck(0, 0, 0)).toBe('cpu')
  })
})

describe('formatPerformanceReport', () => {
  test('describes the measurement', () => {
    const lines = formatPerformanceReport({
      process: 'wine64-preloader',
      width: 5120,
      height: 1440,
      presentingSeconds: 750,
      frames: 30000,
      fps: 40,
      frameTimeAvgMs: 25,
      frameTimeMaxMs: 75,
      lowestIntervalFps: 20,
      gpuTimeAvgMs: 24,
      drawableWaitAvgMs: 0.03,
      metalMemoryMiB: 6144,
      bottleneck: 'gpu'
    })

    expect(lines[0]).toContain('12.5 minutes of rendering at 5120x1440')
    expect(lines[1]).toContain('40.0 FPS average (25.00 ms per frame')
    expect(lines[1]).toContain('slowest 1% of seconds: 20.0 FPS')
    expect(lines).toContainEqual(expect.stringContaining('about 42 FPS'))
    expect(lines).toContainEqual(expect.stringContaining('GPU-bound'))
    expect(lines).toContainEqual(expect.stringContaining('6.0 GB'))
  })
})
