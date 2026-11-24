import { useEffect, useState } from 'react'
import type { ControllerBattery } from 'common/types'

const POLL_INTERVAL = 60_000

/**
 * Batteries of connected controllers as reported by the system. Empty on
 * platforms where Heroic cannot read them (anything but Linux).
 */
export const useControllerBattery = () => {
  const [batteries, setBatteries] = useState<ControllerBattery[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const list = await window.api.getControllerBatteries()
      if (!cancelled) setBatteries(list)
    }

    void load()
    const interval = window.setInterval(() => void load(), POLL_INTERVAL)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return batteries
}
