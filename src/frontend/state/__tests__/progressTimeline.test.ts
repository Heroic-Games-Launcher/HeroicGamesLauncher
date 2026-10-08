import {
  addSample,
  padTimeline,
  TIMELINE_SLOTS
} from 'frontend/state/progressTimeline'
import type { InstallProgressPoint } from 'frontend/state/progressTimeline'

const second = (n: number) => n * 1000

describe('addSample', () => {
  it('starts a timeline with one point aligned to the second', () => {
    const points = addSample([], { download: 5, disk: 2 }, second(10) + 250)

    expect(points).toEqual([{ download: 5, disk: 2, timestamp: second(10) }])
  })

  it('merges samples from the same second into one slot', () => {
    let points = addSample([], { download: 5, disk: 2 }, second(10) + 100)
    points = addSample(points, { download: 8, disk: 3 }, second(10) + 900)

    expect(points).toEqual([{ download: 8, disk: 3, timestamp: second(10) }])
  })

  it('keeps the previous download speed when a sample has none', () => {
    let points = addSample([], { download: 5, disk: 2 }, second(10))
    points = addSample(points, { disk: 4 }, second(11))

    expect(points.at(-1)).toEqual({
      download: 5,
      disk: 4,
      timestamp: second(11)
    })
  })

  it('fills skipped seconds with the previous values', () => {
    let points = addSample([], { download: 5, disk: 2 }, second(10))
    points = addSample(points, { download: 9, disk: 6 }, second(13))

    expect(points).toEqual([
      { download: 5, disk: 2, timestamp: second(10) },
      { download: 5, disk: 2, timestamp: second(11) },
      { download: 5, disk: 2, timestamp: second(12) },
      { download: 9, disk: 6, timestamp: second(13) }
    ])
  })

  it('drops the oldest slots once the window is full', () => {
    let points: InstallProgressPoint[] = []
    for (let i = 0; i < TIMELINE_SLOTS + 5; i++) {
      points = addSample(points, { download: i, disk: 0 }, second(i))
    }

    expect(points).toHaveLength(TIMELINE_SLOTS)
    expect(points[0]).toEqual({ download: 5, disk: 0, timestamp: second(5) })
    expect(points.at(-1)?.timestamp).toBe(second(TIMELINE_SLOTS + 4))
  })

  it('stays within the window after a very long gap', () => {
    let points = addSample([], { download: 5, disk: 2 }, second(0))
    points = addSample(points, { download: 9, disk: 6 }, second(10_000))

    expect(points).toHaveLength(TIMELINE_SLOTS)
    expect(points.at(-1)).toEqual({
      download: 9,
      disk: 6,
      timestamp: second(10_000)
    })
    expect(points[0].timestamp).toBe(second(10_000 - TIMELINE_SLOTS + 1))
  })
})

describe('padTimeline', () => {
  it('right-aligns a partial timeline with empty slots on the left', () => {
    const points = [
      { download: 5, disk: 2, timestamp: second(10) },
      { download: 7, disk: 3, timestamp: second(11) }
    ]

    const slots = padTimeline(points)

    expect(slots).toHaveLength(TIMELINE_SLOTS)
    expect(slots[0]).toEqual({
      slot: 0,
      download: null,
      disk: null,
      timestamp: null
    })
    expect(slots.slice(-2)).toEqual([
      { slot: TIMELINE_SLOTS - 2, ...points[0] },
      { slot: TIMELINE_SLOTS - 1, ...points[1] }
    ])
  })

  it('returns only empty slots for an empty timeline', () => {
    const slots = padTimeline([])

    expect(slots).toHaveLength(TIMELINE_SLOTS)
    expect(slots.every((s) => s.download === null)).toBe(true)
  })
})
