const NON_BREAKING_SPACE = '\u00A0'
const UNKNOWN = '—'

export type DisplayUnits = 'mib' | 'mb'

export const MEBIBYTES = 'MiB'
export const MEBIBYTES_PER_SECOND = 'MiB/s'
export const MEGABYTES = 'MB'
export const MEGABYTES_PER_SECOND = 'MB/s'
export const MEGABITS_PER_SECOND = 'Mbit/s'
const MIB_TO_MB = 1.048576

const toDisplayUnits = (value: number, units: DisplayUnits) =>
  units === 'mb' ? value * MIB_TO_MB : value

export const mibPerSecondFromKbit = (kbitPerSecond: number) =>
  kbitPerSecond / 8000 / MIB_TO_MB

export function formatMeasured(
  value: number | null | undefined,
  unit: string
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return UNKNOWN
  }

  return `${Math.round(value * 10) / 10}${NON_BREAKING_SPACE}${unit}`
}

export function formatSpeed(
  mebibytesPerSecond: number | null | undefined,
  units: DisplayUnits
): string {
  const value =
    mebibytesPerSecond === null || mebibytesPerSecond === undefined
      ? mebibytesPerSecond
      : toDisplayUnits(mebibytesPerSecond, units)

  return formatMeasured(
    value,
    units === 'mb' ? MEGABYTES_PER_SECOND : MEBIBYTES_PER_SECOND
  )
}
