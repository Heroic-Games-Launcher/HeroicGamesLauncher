/**
 * Steam Controller (2026, "Triton") without Steam, Windows only.
 *
 * Chromium never exposes Valve's vendor HID interface as a gamepad, so Steam
 * Input is normally required. This module reads the raw state report over
 * WebHID and presents it as a standard-mapping Gamepad through getGamepads().
 *
 * Modes, mirroring what Steam does on the desktop and in Big Picture:
 * - outside Console Mode the firmware stays in lizard mode (keyboard and
 *   trackpad mouse emulation) and the raw pad only serves the View+R2 combo
 * - inside Console Mode with Heroic focused, lizard mode is switched off the
 *   way SDL's Triton driver does it (setting 9, resent every 3 s) and the raw
 *   pad drives navigation
 */

// Minimal WebHID surface, lib.dom does not ship these types
interface HIDReportInfo {
  reportId: number
}
interface HIDCollectionInfo {
  usagePage: number
  usage: number
  inputReports: HIDReportInfo[]
}
interface HIDInputReportEvent extends Event {
  reportId: number
  data: DataView
}
interface HIDDevice extends EventTarget {
  vendorId: number
  productId: number
  productName: string
  opened: boolean
  collections: HIDCollectionInfo[]
  open(): Promise<void>
  close(): Promise<void>
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>
}
interface HIDConnectionEvent extends Event {
  device: HIDDevice
}
interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>
}
declare global {
  interface Navigator {
    hid?: HID
  }
}

const VALVE_VID = 0x28de
const VENDOR_USAGE_PAGE = 0xff00
const STATE_REPORTS = [0x42, 0x45]
const FEATURE_REPORT = 0x01
// SDL_hidapi_steam_triton.c resends the setting every 3 s as a watchdog
const WATCHDOG_MS = 3000

const CMD_SET_SETTINGS = 0x87
const SETTING_LIZARD_MODE = 9
const LIZARD_MODE_OFF = 0
const LIZARD_MODE_ON = 1

export const STEAM_CONTROLLER_INDEX = 8

type MutableButton = { pressed: boolean; touched: boolean; value: number }
type SyntheticGamepad = {
  id: string
  index: number
  mapping: GamepadMappingType
  connected: boolean
  timestamp: number
  axes: number[]
  buttons: MutableButton[]
  vibrationActuator: null
}

const pad: SyntheticGamepad = {
  id: 'Steam Controller (Vendor: 28de raw HID)',
  index: STEAM_CONTROLLER_INDEX,
  mapping: 'standard',
  connected: false,
  timestamp: 0,
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({
    pressed: false,
    touched: false,
    value: 0
  })),
  vibrationActuator: null
}

let liveDevice: HIDDevice | null = null
let watchdog = 0
let rawMode = false
// Games launched by Heroic get the controller as a gamepad, not as keyboard
const runningGames = new Set<string>()
// Holding Start for 1 s flips the mode by hand until the next automatic switch
const START_HOLD_MS = 1000
const BTN_START = 9
let manualOverride: boolean | null = null
let lastAuto = false
let startHeldSince: number | null = null
let startHoldFired = false

const isConsoleRoute = () => window.location.hash.startsWith('#/console')

/**
 * Native pads plus the synthetic one. In lizard mode the synthetic pad is
 * hidden so buttons do not act twice (keyboard emulation plus gamepad), unless
 * the caller asks for it, which the View+R2 combo listeners do.
 */
export function getGamepads(includeLizard = false): (Gamepad | null)[] {
  const list = Array.from(navigator.getGamepads())
  if (pad.connected && (rawMode || includeLizard)) {
    while (list.length <= STEAM_CONTROLLER_INDEX) list.push(null)
    list[STEAM_CONTROLLER_INDEX] = pad as unknown as Gamepad
  }
  return list
}

function emit(type: 'gamepadconnected' | 'gamepaddisconnected') {
  const event = new Event(type) as Event & { gamepad: Gamepad }
  event.gamepad = pad as unknown as Gamepad
  window.dispatchEvent(event)
}

function setButton(i: number, pressed: boolean, value = pressed ? 1 : 0) {
  const b = pad.buttons[i]
  b.pressed = pressed
  b.touched = pressed
  b.value = value
}

// Report 0x42/0x45 without the id byte, layout per SDL's Triton driver
function parseState(data: DataView) {
  const b = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  const i16 = (o: number) => data.getInt16(o, true)
  const b0 = b[1]
  const b1 = b[2]
  const b2 = b[3]
  const lt = Math.max(0, i16(5)) / 0x7fff
  const rt = Math.max(0, i16(7)) / 0x7fff
  // Hysteresis so a half-pulled trigger does not flicker the combos
  const triggerHeld = (i: number, value: number) =>
    pad.buttons[i].pressed ? value > 0.4 : value > 0.6
  setButton(0, !!(b0 & 0x01))
  setButton(1, !!(b0 & 0x02))
  setButton(2, !!(b0 & 0x04))
  setButton(3, !!(b0 & 0x08))
  setButton(4, !!(b2 & 0x08))
  setButton(5, !!(b1 & 0x02))
  setButton(6, triggerHeld(6, lt), lt)
  setButton(7, triggerHeld(7, rt) || !!(b2 & 0x80), rt)
  setButton(8, !!(b1 & 0x40))
  setButton(9, !!(b0 & 0x40))
  setButton(10, !!(b1 & 0x80))
  setButton(11, !!(b0 & 0x20))
  setButton(12, !!(b1 & 0x20))
  setButton(13, !!(b1 & 0x04))
  setButton(14, !!(b1 & 0x10))
  setButton(15, !!(b1 & 0x08))
  setButton(16, !!(b2 & 0x01))
  pad.axes = [
    i16(9) / 0x7fff,
    -i16(11) / 0x7fff,
    i16(13) / 0x7fff,
    -i16(15) / 0x7fff
  ]
  pad.timestamp = performance.now()
}

// Feature report 0x01: [cmd, payloadLength, payload...] padded to 63 bytes
async function command(device: HIDDevice, cmd: number, payload: number[] = []) {
  const data = new Uint8Array(63)
  data[0] = cmd
  data[1] = payload.length
  data.set(payload, 2)
  try {
    await device.sendFeatureReport(FEATURE_REPORT, data)
    return true
  } catch (error) {
    console.warn('Steam Controller command failed', cmd, error)
    return false
  }
}

const setLizardMode = (device: HIDDevice, on: boolean) =>
  command(device, CMD_SET_SETTINGS, [
    SETTING_LIZARD_MODE,
    on ? LIZARD_MODE_ON : LIZARD_MODE_OFF,
    0
  ])

// Raw pad while a game runs, or in Console Mode with Heroic focused
function applyMode() {
  const auto =
    runningGames.size > 0 || (document.hasFocus() && isConsoleRoute())
  if (auto !== lastAuto) {
    lastAuto = auto
    manualOverride = null
  }
  const wanted = manualOverride ?? auto
  if (wanted === rawMode) return
  rawMode = wanted
  // Lets the UI show a Steam-style toast for the mode change
  if (pad.connected) {
    window.dispatchEvent(
      new CustomEvent('steamcontroller-mode', {
        detail: { raw: rawMode, manual: manualOverride !== null }
      })
    )
  }
  window.clearInterval(watchdog)
  watchdog = 0
  if (!liveDevice) return
  void setLizardMode(liveDevice, !rawMode)
  if (rawMode) {
    const device = liveDevice
    watchdog = window.setInterval(() => {
      void setLizardMode(device, false)
    }, WATCHDOG_MS)
  }
}

async function toggleModeByHand() {
  // Steam Input owns the mode while Steam runs
  if (await window.api.isSteamRunning().catch(() => false)) return
  manualOverride = !rawMode
  applyMode()
}

function watchStartHold() {
  if (!pad.buttons[BTN_START].pressed) {
    startHeldSince = null
    startHoldFired = false
    return
  }
  const now = performance.now()
  if (startHeldSince === null) startHeldSince = now
  if (!startHoldFired && now - startHeldSince >= START_HOLD_MS) {
    startHoldFired = true
    void toggleModeByHand()
  }
}

function onInputReport(device: HIDDevice, event: HIDInputReportEvent) {
  if (!STATE_REPORTS.includes(event.reportId) || event.data.byteLength < 29) {
    return
  }
  parseState(event.data)
  watchStartHold()
  if (liveDevice === device) return
  // The puck exposes idle slot interfaces, only the reporting one is real
  liveDevice = device
  pad.connected = true
  emit('gamepadconnected')
  rawMode = false
  applyMode()
}

function isValveVendorInterface(device: HIDDevice) {
  return (
    device.vendorId === VALVE_VID &&
    device.collections.some((c) => c.usagePage === VENDOR_USAGE_PAGE)
  )
}

async function attach(device: HIDDevice) {
  if (!isValveVendorInterface(device)) return
  try {
    if (!device.opened) await device.open()
  } catch {
    // Another driver holds the interface exclusively
    return
  }
  device.addEventListener('inputreport', (e) =>
    onInputReport(device, e as HIDInputReportEvent)
  )
}

function detach(device: HIDDevice) {
  if (liveDevice !== device) return
  window.clearInterval(watchdog)
  watchdog = 0
  rawMode = false
  liveDevice = null
  pad.connected = false
  emit('gamepaddisconnected')
}

async function scan() {
  const devices = await navigator.hid!.getDevices()
  for (const device of devices) await attach(device)
}

export async function initSteamController() {
  if (window.platform !== 'win32' || !navigator.hid) return

  window.api.handleGameStatus((_e, { appName, status }) => {
    if (status === 'playing') runningGames.add(appName)
    else runningGames.delete(appName)
    applyMode()
  })
  window.addEventListener('focus', applyMode)
  window.addEventListener('blur', applyMode)
  window.addEventListener('hashchange', applyMode)
  window.addEventListener('beforeunload', () => {
    if (liveDevice && rawMode) void setLizardMode(liveDevice, true)
  })
  navigator.hid.addEventListener('connect', (e) => {
    void attach((e as HIDConnectionEvent).device)
  })
  navigator.hid.addEventListener('disconnect', (e) => {
    detach((e as HIDConnectionEvent).device)
  })
  await scan()
}
