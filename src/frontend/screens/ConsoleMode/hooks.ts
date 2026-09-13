import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject
} from 'react'

import { isControllerNavDisabled } from 'frontend/helpers/gamepad'
import { getGamepads } from 'frontend/helpers/steamController'
import { detectControllerLayout, type ControllerLayout } from './controller'

function isPressed(btn: GamepadButton | undefined) {
  return !!btn && (btn.pressed || btn.value > 0.5)
}

// Timers survive occlusion, rAF does not
const POLL_MS = 16
function pollGamepads(tick: () => void) {
  const id = window.setInterval(tick, POLL_MS)
  return () => window.clearInterval(id)
}

export function useGamepadButtonPress(
  buttonIndex: number,
  onPress: () => void,
  enabled = true
) {
  const handlerRef = useRef(onPress)
  handlerRef.current = onPress

  useEffect(() => {
    if (!enabled) return
    // All pads count as one so Steam's virtual pad and the raw Steam
    // Controller do not fire twice for the same physical press
    const anyPressed = () =>
      Array.from(getGamepads()).some(
        (gp) => gp && isPressed(gp.buttons[buttonIndex])
      )
    // Seed with current state so a button still held from the press that
    // mounted this hook (e.g. the A press that opened an overlay) does not
    // immediately fire the new handler — only real press-down edges should.
    let prev = anyPressed()
    const tick = () => {
      // Live check honours disable setting
      const pressed = anyPressed()
      if (pressed && !prev && !isControllerNavDisabled()) handlerRef.current()
      prev = pressed
    }
    return pollGamepads(tick)
  }, [buttonIndex, enabled])
}

export function useGamepadButtonHold(
  buttonIndex: number,
  onChange: (held: boolean) => void,
  enabled = true
) {
  const handlerRef = useRef(onChange)
  handlerRef.current = onChange

  useEffect(() => {
    if (!enabled) return
    let held = Array.from(getGamepads()).some(
      (gp) => gp && isPressed(gp.buttons[buttonIndex])
    )
    const tick = () => {
      // Disabled controllers report nothing held
      let anyHeld = false
      if (!isControllerNavDisabled()) {
        for (const gp of getGamepads()) {
          if (gp && isPressed(gp.buttons[buttonIndex])) {
            anyHeld = true
            break
          }
        }
      }
      if (anyHeld !== held) {
        held = anyHeld
        handlerRef.current(anyHeld)
      }
    }
    return pollGamepads(tick)
  }, [buttonIndex, enabled])
}

export function useGamepadComboHold(
  buttonIndices: number[],
  onChange: (held: boolean) => void,
  enabled = true
) {
  const handlerRef = useRef(onChange)
  handlerRef.current = onChange

  // Stable key avoids re-running on rerenders
  const comboKey = buttonIndices.join(',')

  useEffect(() => {
    if (!enabled) return
    const indices = comboKey.split(',').map(Number)
    const comboPressed = (gp: Gamepad) =>
      indices.every((i) => isPressed(gp.buttons[i]))
    const anyComboHeld = () =>
      // Combos also work in lizard mode (View+R2 outside Console Mode)
      Array.from(getGamepads(true)).some((gp) => gp && comboPressed(gp))
    let held = anyComboHeld()
    const tick = () => {
      const anyHeld = anyComboHeld()
      if (anyHeld !== held) {
        held = anyHeld
        handlerRef.current(anyHeld)
      }
    }
    return pollGamepads(tick)
  }, [comboKey, enabled])
}

// One-off check outside hook ticks
export function isGamepadButtonHeld(buttonIndex: number) {
  return Array.from(getGamepads()).some(
    (gp) => gp && isPressed(gp.buttons[buttonIndex])
  )
}

export function useGamepadInfo() {
  const [connected, setConnected] = useState(false)
  const [layout, setLayout] = useState<ControllerLayout>('xbox')

  useEffect(() => {
    const refresh = () => {
      const first = Array.from(getGamepads(true)).find(
        (gp): gp is Gamepad => !!gp
      )
      setConnected(!!first)
      if (first) setLayout(detectControllerLayout(first.id))
    }
    refresh()
    window.addEventListener('gamepadconnected', refresh)
    window.addEventListener('gamepaddisconnected', refresh)
    return () => {
      window.removeEventListener('gamepadconnected', refresh)
      window.removeEventListener('gamepaddisconnected', refresh)
    }
  }, [])

  return { connected, layout }
}

export function useColumnCount(
  cardRefs: RefObject<Array<HTMLElement | null>>,
  cardsLength: number
) {
  const [columns, setColumns] = useState(1)

  useLayoutEffect(() => {
    const compute = () => {
      const cards = (cardRefs.current ?? []).filter(
        (el): el is HTMLElement => !!el
      )

      if (cards.length < 2) {
        setColumns(1)
        return
      }
      const firstTop = cards[0].offsetTop

      let count = 1
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].offsetTop !== firstTop) break
        count++
      }
      setColumns(Math.max(1, count))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [cardRefs, cardsLength])

  return columns
}

export function useCancelOnHold({
  active,
  holdMs,
  onCancel
}: {
  active: boolean
  holdMs: number
  onCancel: () => void
}) {
  const [holdStart, setHoldStart] = useState<number | null>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  const startHold = useCallback(() => {
    setHoldStart((v) => v ?? Date.now())
  }, [])
  const stopHold = useCallback(() => setHoldStart(null), [])

  useEffect(() => {
    if (!active) setHoldStart(null)
  }, [active])

  useEffect(() => {
    if (holdStart == null || !active) return
    const t = window.setTimeout(() => {
      onCancelRef.current()
      setHoldStart(null)
    }, holdMs)
    return () => window.clearTimeout(t)
  }, [holdStart, active, holdMs])

  return { holdStart, startHold, stopHold }
}

// Distinguishes a short combo tap from the hold that drives the timers
export function useComboShortPress(onShort: () => void, shortMs = 800) {
  const start = useRef<number | null>(null)
  const onShortRef = useRef(onShort)
  onShortRef.current = onShort
  return {
    down: () => {
      start.current = performance.now()
    },
    up: () => {
      const s = start.current
      start.current = null
      if (s != null && performance.now() - s < shortMs) onShortRef.current()
    }
  }
}
