import {
  DisplayUnits,
  MEGABITS_PER_SECOND,
  formatMeasured,
  formatSpeed,
  mibPerSecondFromKbit
} from 'common/format'

export const PRESETS_KBIT = [
  10000, 25000, 50000, 100000, 250000, 500000, 1000000
]

export const rateText = (kbit: number) =>
  formatMeasured(kbit / 1000, MEGABITS_PER_SECOND)

export const equivalentText = (kbit: number, units: DisplayUnits) =>
  formatSpeed(mibPerSecondFromKbit(kbit), units)
