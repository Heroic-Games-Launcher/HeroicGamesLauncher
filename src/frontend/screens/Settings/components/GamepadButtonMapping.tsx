import { useTranslation } from 'react-i18next'
import { Button, SelectField } from 'frontend/components/UI'
import { updateGamepadActions } from 'frontend/helpers/gamepad'
import useSetting from 'frontend/hooks/useSetting'
import type { RemappableGamepadAction } from 'common/types'
import { MenuItem } from '@mui/material'

const DEFAULT_MAPPING: Record<RemappableGamepadAction, number | null> = {
  mainAction: 0,
  back: 1,
  rightClick: 2,
  altAction: 3,
  prevPage: 4,
  nextPage: 5,
  enter: 10,
  guide: 16
}

const ACTIONS: Array<{
  action: RemappableGamepadAction
  labelKey: string
  fallbackLabel: string
}> = [
  {
    action: 'mainAction',
    labelKey: 'settings.gamepad.button.main',
    fallbackLabel: 'Confirm / select'
  },
  {
    action: 'back',
    labelKey: 'settings.gamepad.button.back',
    fallbackLabel: 'Back'
  },
  {
    action: 'altAction',
    labelKey: 'settings.gamepad.button.alt',
    fallbackLabel: 'Play / install game'
  },
  {
    action: 'rightClick',
    labelKey: 'settings.gamepad.button.context',
    fallbackLabel: 'Options menu'
  },
  {
    action: 'prevPage',
    labelKey: 'settings.gamepad.button.prevPage',
    fallbackLabel: 'Page up'
  },
  {
    action: 'nextPage',
    labelKey: 'settings.gamepad.button.nextPage',
    fallbackLabel: 'Page down'
  },
  {
    action: 'enter',
    labelKey: 'settings.gamepad.button.enter',
    fallbackLabel: 'Submit / open keyboard'
  },
  {
    action: 'guide',
    labelKey: 'settings.gamepad.button.guide',
    fallbackLabel: 'Console mode'
  }
]

const BUTTONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'A / Cross' },
  { value: 1, label: 'B / Circle' },
  { value: 2, label: 'X / Square' },
  { value: 3, label: 'Y / Triangle' },
  { value: 4, label: 'L1 / LB' },
  { value: 5, label: 'R1 / RB' },
  { value: 6, label: 'L2 / LT' },
  { value: 7, label: 'R2 / RT' },
  { value: 8, label: 'View / Share' },
  { value: 9, label: 'Menu / Options' },
  { value: 10, label: 'L3' },
  { value: 11, label: 'R3' },
  { value: 16, label: 'Guide / PS' }
]

const GamepadButtonMapping = () => {
  const { t } = useTranslation()
  const [mapping, setMapping] = useSetting('gamepadButtonMapping', {})

  const resolve = (action: RemappableGamepadAction) =>
    mapping[action] === undefined ? DEFAULT_MAPPING[action] : mapping[action]

  const update = (action: RemappableGamepadAction, value: string) => {
    const button = value === 'none' ? null : Number(value)
    const next: Partial<Record<RemappableGamepadAction, number | null>> = {
      ...mapping,
      [action]: button
    }

    if (button !== null) {
      // a physical button can only drive one action, so free it from the
      // action that was using it
      for (const entry of ACTIONS) {
        if (entry.action !== action && resolve(entry.action) === button) {
          next[entry.action] = null
        }
      }
    }

    setMapping(next)
    updateGamepadActions()
  }

  const reset = () => {
    setMapping({})
    updateGamepadActions()
  }

  return (
    <div className="gamepadButtonMapping">
      {ACTIONS.map(({ action, labelKey, fallbackLabel }) => (
        <SelectField
          key={action}
          htmlId={`gamepad-binding-${action}`}
          label={t(labelKey, fallbackLabel)}
          value={String(resolve(action) ?? 'none')}
          onChange={(event) => update(action, event.target.value)}
        >
          {BUTTONS.map((button) => (
            <MenuItem key={button.value} value={String(button.value)}>
              {button.label}
            </MenuItem>
          ))}
          <MenuItem value="none">
            {t('settings.gamepad.button.unbound', 'Not bound')}
          </MenuItem>
        </SelectField>
      ))}
      <Button variant="ghost" size="sm" onClick={reset}>
        {t('settings.gamepad.button.reset', 'Reset to defaults')}
      </Button>
    </div>
  )
}

export default GamepadButtonMapping
