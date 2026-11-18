import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, SettingRow } from 'frontend/components/UI'
import { detectGamepadLayout } from 'frontend/helpers/gamepad'
import type { GamepadLayout } from 'frontend/helpers/gamepad'
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

const DetectedControllers = () => {
  const { t } = useTranslation()
  const [controllers, setControllers] = useState(readControllers)

  useEffect(() => {
    const refresh = () => setControllers(readControllers())
    window.addEventListener('gamepadconnected', refresh)
    window.addEventListener('gamepaddisconnected', refresh)
    refresh()

    return () => {
      window.removeEventListener('gamepadconnected', refresh)
      window.removeEventListener('gamepaddisconnected', refresh)
    }
  }, [])

  if (!controllers.length) {
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
    const text = controllers
      .map((pad) => {
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
      .join('\n\n')

    void window.api.clipboardWriteText(text)
  }

  return (
    <div className="detectedControllers">
      {controllers.map((pad) => {
        const { vendor, product } = parseVendorProduct(pad.id)
        return (
          <div className="detectedControllers__item" key={pad.index}>
            <SettingRow label={t('settings.gamepad.detected.device', 'Device')}>
              <span>{pad.id.split(' (')[0] || pad.id}</span>
            </SettingRow>
            <SettingRow
              label={t('settings.gamepad.detected.vendor', 'Vendor / product')}
            >
              <span>{vendor ? `${vendor} / ${product}` : '—'}</span>
            </SettingRow>
            <SettingRow
              label={t('settings.gamepad.detected.mapping', 'Browser mapping')}
            >
              <span>
                {pad.mapping || t('settings.gamepad.detected.custom', 'Custom')}
              </span>
            </SettingRow>
            <SettingRow
              label={t('settings.gamepad.detected.layout', 'Heroic layout')}
            >
              <span>{LAYOUT_LABELS[detectGamepadLayout(pad.id)]}</span>
            </SettingRow>
            <SettingRow label={t('settings.gamepad.detected.index', 'Slot')}>
              <span>{pad.index}</span>
            </SettingRow>
            <SettingRow
              label={t('settings.gamepad.detected.id', 'System id')}
              layout="stacked"
            >
              <code className="detectedControllers__id">{pad.id}</code>
            </SettingRow>
          </div>
        )
      })}
      <Button variant="ghost" size="sm" onClick={copyDetails}>
        {t('settings.gamepad.detected.copy', 'Copy details')}
      </Button>
    </div>
  )
}

export default DetectedControllers
