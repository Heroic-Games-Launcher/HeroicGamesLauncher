import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, SettingRow } from 'frontend/components/UI'
import { detectGamepadLayout } from 'frontend/helpers/gamepad'
import type { GamepadLayout } from 'frontend/helpers/gamepad'
import { useControllerBattery } from 'frontend/hooks/useControllerBattery'
import './DetectedControllers.css'

const readControllers = () =>
  Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => !!pad)

// Chromium reports "... Vendor: 054c Product: 0ce6 ..." on Windows/Linux and
// "054c-0ce6-name" on macOS
const parseVendorProduct = (id: string) => {
  const labelled = id.match(
    /Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i
  )
  if (labelled) {
    return {
      vendor: labelled[1].toLowerCase(),
      product: labelled[2].toLowerCase()
    }
  }

  const dashed = id.match(/^([0-9a-f]{4})-([0-9a-f]{4})/i)
  if (dashed) {
    return { vendor: dashed[1].toLowerCase(), product: dashed[2].toLowerCase() }
  }

  return { vendor: '', product: '' }
}

const LAYOUT_LABELS: Record<GamepadLayout, string> = {
  standard: 'Standard (Xbox / PlayStation)',
  nintendo: 'Nintendo',
  gamecube: 'GameCube',
  'ps3-clone': 'PS3 clone',
  'n64-clone': 'N64 clone',
  genius: 'Genius'
}

const batteryStatusLabel = (
  status: string,
  t: (key: string, fallback: string) => string
) => {
  switch (status) {
    case 'Charging':
      return t('settings.gamepad.detected.charging', 'Charging')
    case 'Discharging':
      return t('settings.gamepad.detected.discharging', 'On battery')
    case 'Full':
      return t('settings.gamepad.detected.full', 'Full')
    default:
      return status
  }
}

const DetectedControllers = () => {
  const { t } = useTranslation()
  const [controllers, setControllers] = useState(readControllers)
  const batteries = useControllerBattery()

  useEffect(() => {
    const refresh = () => setControllers(readControllers())
    window.addEventListener('gamepadconnected', refresh)
    window.addEventListener('gamepaddisconnected', refresh)

    // Chromium keeps every slot as `null` until the pad is used for the first
    // time in this document, and it does not always fire `gamepadconnected`,
    // so poll while the card is open.
    const interval = window.setInterval(refresh, 1000)
    refresh()

    return () => {
      window.removeEventListener('gamepadconnected', refresh)
      window.removeEventListener('gamepaddisconnected', refresh)
      window.clearInterval(interval)
    }
  }, [])

  if (!controllers.length && !batteries.length) {
    return (
      <p className="detectedControllers__empty">
        {t(
          'settings.gamepad.detected.empty',
          'No controller detected. Press a button on it so the system reports it.'
        )}
      </p>
    )
  }

  const copyDetails = () => {
    const controllerLines = controllers.map((pad) => {
      const { vendor, product } = parseVendorProduct(pad.id)
      return [
        `id: ${pad.id}`,
        `index: ${pad.index}`,
        `mapping: ${pad.mapping || 'none'}`,
        `vendor: ${vendor || 'unknown'}`,
        `product: ${product || 'unknown'}`,
        `heroic layout: ${detectGamepadLayout(pad.id)}`
      ].join('\n')
    })

    const batteryLines = batteries.map(
      (battery) =>
        `battery: ${battery.name} ${battery.capacity}% (${battery.status})`
    )

    void window.api.clipboardWriteText(
      [...controllerLines, ...batteryLines].join('\n\n')
    )
  }

  const controllerRows = controllers.flatMap((pad) => {
    const { vendor, product } = parseVendorProduct(pad.id)
    const key = `pad-${pad.index}`

    return [
      <SettingRow
        key={`${key}-device`}
        label={t('settings.gamepad.detected.device', 'Device')}
      >
        <span>{pad.id.split(' (')[0] || pad.id}</span>
      </SettingRow>,
      <SettingRow
        key={`${key}-vendor`}
        label={t('settings.gamepad.detected.vendor', 'Vendor / product')}
      >
        <span>{vendor ? `${vendor} / ${product}` : '—'}</span>
      </SettingRow>,
      <SettingRow
        key={`${key}-mapping`}
        label={t('settings.gamepad.detected.mapping', 'Browser mapping')}
      >
        <span>
          {pad.mapping || t('settings.gamepad.detected.custom', 'Custom')}
        </span>
      </SettingRow>,
      <SettingRow
        key={`${key}-layout`}
        label={t('settings.gamepad.detected.layout', 'Heroic layout')}
      >
        <span>{LAYOUT_LABELS[detectGamepadLayout(pad.id)]}</span>
      </SettingRow>,
      <SettingRow
        key={`${key}-slot`}
        label={t('settings.gamepad.detected.index', 'Slot')}
      >
        <span>{pad.index}</span>
      </SettingRow>,
      <SettingRow
        key={`${key}-id`}
        label={t('settings.gamepad.detected.id', 'System id')}
        layout="stacked"
      >
        <code className="detectedControllers__id">{pad.id}</code>
      </SettingRow>
    ]
  })

  return (
    <>
      {!controllers.length && (
        <p className="detectedControllers__empty">
          {t(
            'settings.gamepad.detected.notReported',
            'The system reports a battery, but the controller is not visible to Heroic yet. Press a button on it.'
          )}
        </p>
      )}
      {controllerRows}
      {batteries.map((battery) => (
        <SettingRow
          key={`battery-${battery.name}`}
          label={t('settings.gamepad.detected.battery', 'Battery')}
          layout="stacked"
        >
          <span>
            {battery.capacity}% · {batteryStatusLabel(battery.status, t)}{' '}
            <span className="detectedControllers__id">{battery.name}</span>
          </span>
        </SettingRow>
      ))}
      <Button variant="ghost" size="sm" onClick={copyDetails}>
        {t('settings.gamepad.detected.copy', 'Copy details')}
      </Button>
    </>
  )
}

export default DetectedControllers
