import React, { useState } from 'react'
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter
} from 'frontend/components/UI/Dialog'
import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'
import { LaunchOption, Runner } from 'common/types'
import { useTranslation } from 'react-i18next'
import { FormControlLabel, Radio, RadioGroup } from '@mui/material'
import './index.scss'
import useLaunchOptions from 'frontend/hooks/useLaunchOptions'

interface Props {
  appName: string
  runner: Runner
  onClose: () => void
  onSelect: (launchOption: LaunchOption | undefined) => void
}

const DONT_SHOW_STORAGE_PREFIX = 'heroic_launch_options_dialog_dont_show_'

const LaunchOptionsDialog = ({ appName, runner, onClose, onSelect }: Props) => {
  const { t } = useTranslation('gamepage')
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const {
    launchOptions,
    selectedOption,
    selectedIndex,
    selectOption,
    labelForLaunchOption
  } = useLaunchOptions({
    appName,
    runner
  })

  const handleCancel = () => {
    onClose()
  }

  const handleConfirm = () => {
    // Remember user choice if "don't show again" is checked
    if (dontShowAgain) {
      localStorage.setItem(`${DONT_SHOW_STORAGE_PREFIX}${appName}`, 'true')
    }

    onSelect(selectedOption)
    onClose()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(event.target.value)
    selectOption(index, true)
  }

  const handleDontShowAgainChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDontShowAgain(event.target.checked)
  }

  return (
    <Dialog onClose={onClose} showCloseButton>
      <DialogHeader>
        {t('launch_options_dialog.title', 'Select Launch Option')}
      </DialogHeader>
      <DialogContent>
        <p className="launch-options-description">
          {t(
            'launch_options_dialog.description',
            'Select the launch option to use for this game:'
          )}
        </p>
        <RadioGroup
          value={selectedIndex.toString()}
          onChange={handleChange}
          className="launch-options-list"
        >
          {launchOptions.map((option, index) => (
            <FormControlLabel
              key={index}
              value={index.toString()}
              control={<Radio color="primary" />}
              label={labelForLaunchOption(option)}
              className="launch-option-item"
            />
          ))}
        </RadioGroup>

        <div className="dont-show-again">
          <ToggleSwitch
            htmlId="dont-show-again-checkbox"
            value={dontShowAgain}
            handleChange={handleDontShowAgainChange}
            title={t(
              'launch_options_dialog.dont_show_again',
              "Don't show this dialog again"
            )}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <button onClick={handleCancel} className="button is-secondary outline">
          {t('button.cancelLaunch', 'Cancel')}
        </button>
        <button onClick={handleConfirm} className="button is-secondary">
          {t('button.launch', 'Launch')}
        </button>
      </DialogFooter>
    </Dialog>
  )
}

export default LaunchOptionsDialog
