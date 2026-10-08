// One slot per second, so the speed graph shows the last three minutes
export const TIMELINE_SLOTS = 180

export interface InstallProgressPoint {
  download: number
  disk: number
  timestamp: number
}

export interface TimelineSlot {
  slot: number
  download: number | null
  disk: number | null
  timestamp: number | null
}

/**
 * Adds a progress sample to a per-second timeline. Samples landing in the
 * same second update that slot, and seconds the downloader skipped are filled
 * with the previous values so the graph keeps a steady pace.
 */
export function addSample(
  points: InstallProgressPoint[],
  sample: { download?: number; disk?: number },
  now: number
): InstallProgressPoint[] {
  const timestamp = Math.floor(now / 1000) * 1000
  const previous = points.at(-1)
  const point: InstallProgressPoint = {
    download: sample.download ?? previous?.download ?? 0,
    disk: sample.disk ?? 0,
    timestamp
  }

  if (!previous) return [point]
  if (previous.timestamp === timestamp) return [...points.slice(0, -1), point]

  const skipped = Math.min(
    (timestamp - previous.timestamp) / 1000 - 1,
    TIMELINE_SLOTS - 1
  )
  const filler = Array.from({ length: skipped }, (_, i) => ({
    ...previous,
    timestamp: timestamp - (skipped - i) * 1000
  }))

  return [...points, ...filler, point].slice(-TIMELINE_SLOTS)
}

/**
 * Right-aligns a timeline into a fixed number of slots, so new samples enter
 * from the right and the left stays empty until the window fills up.
 */
export function padTimeline(points: InstallProgressPoint[]): TimelineSlot[] {
  const empty = TIMELINE_SLOTS - points.length
  return Array.from({ length: TIMELINE_SLOTS }, (_, slot) =>
    slot < empty
      ? { slot, download: null, disk: null, timestamp: null }
      : { slot, ...points[slot - empty] }
  )
}
