import { existsSync, readFileSync, readdirSync } from 'graceful-fs'
import { join } from 'path'

import type { ControllerBattery } from 'common/types'

const POWER_SUPPLY_PATH = '/sys/class/power_supply'

// sysfs has no "this is a gamepad" flag, so filter the peripherals Heroic is
// definitely not going to show a controller battery for
const NON_CONTROLLER_NODE = /headset|headphone|speaker|mouse|keyboard|touchpad/i

const readAttribute = (dir: string, attribute: string) => {
  try {
    return readFileSync(join(dir, attribute), 'utf-8').trim()
  } catch {
    return undefined
  }
}

// "ps-controller-battery-bc:c7:46:42:80:88" -> "ps-controller-battery"
const displayName = (node: string) =>
  node.replace(/(-([0-9a-f]{2}:){5}[0-9a-f]{2})$/i, '')

/**
 * Batteries of connected peripherals, read from sysfs. Linux only: Windows and
 * macOS would need HID/IOKit access that the renderer has no way to reach.
 * Entries with `scope: System` are the laptop battery, not a controller.
 */
export const getControllerBatteries = (): ControllerBattery[] => {
  if (process.platform !== 'linux' || !existsSync(POWER_SUPPLY_PATH)) {
    return []
  }

  const batteries: ControllerBattery[] = []

  for (const node of readdirSync(POWER_SUPPLY_PATH)) {
    if (NON_CONTROLLER_NODE.test(node)) continue
    const dir = join(POWER_SUPPLY_PATH, node)

    if (readAttribute(dir, 'scope') !== 'Device') continue
    if (readAttribute(dir, 'type') !== 'Battery') continue
    if (readAttribute(dir, 'present') === '0') continue

    const capacity = Number(readAttribute(dir, 'capacity'))
    if (!Number.isFinite(capacity)) continue

    batteries.push({
      name: displayName(node),
      capacity,
      status: readAttribute(dir, 'status') ?? 'Unknown'
    })
  }

  return batteries
}
