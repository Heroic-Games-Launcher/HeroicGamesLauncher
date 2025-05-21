import React, { useState, useEffect } from 'react'
import { LaunchOption, Runner } from 'common/types'
import LaunchOptionsDialog from './index'
import useLaunchOptions from 'frontend/hooks/useLaunchOptions'

interface Props {
  appName: string
  runner: Runner
  onSelect: (launchOption: LaunchOption | undefined) => void
  onCancel: () => void
}

const DONT_SHOW_STORAGE_PREFIX = 'heroic_launch_options_dialog_dont_show_'

export const showLaunchOptionsDialog = ({
  appName,
  runner,
  onSelect,
  onCancel
}: Props): JSX.Element => {
  const [show, setShow] = useState(true)
  const { launchOptions, selectedOption } = useLaunchOptions({
    appName,
    runner
  })

  useEffect(() => {
    // Check if the user has opted to not show this dialog again
    const dontShow =
      localStorage.getItem(`${DONT_SHOW_STORAGE_PREFIX}${appName}`) === 'true'

    // If there's only one option or user chose to hide it, auto-select it
    if (dontShow || launchOptions.length <= 1) {
      onSelect(selectedOption)
      setShow(false)
      return
    }

    // Otherwise show the dialog
  }, [])

  if (!show) {
    return <></>
  }

  const handleClose = () => {
    setShow(false)
    onCancel()
  }

  const handleSelect = (option: LaunchOption | undefined) => {
    onSelect(option)
    setShow(false)
  }

  return (
    <LaunchOptionsDialog
      appName={appName}
      runner={runner}
      onClose={handleClose}
      onSelect={handleSelect}
    />
  )
}

// Helper function to check if we should show the dialog
export const shouldShowLaunchOptionsDialog = async (
  appName: string,
  runner: Runner
): Promise<boolean> => {
  // Check if the user has opted to not show this dialog
  const dontShow =
    localStorage.getItem(`${DONT_SHOW_STORAGE_PREFIX}${appName}`) === 'true'
  if (dontShow) {
    return false
  }

  // Check if there are multiple launch options
  const launchOptions = await window.api.getLaunchOptions(appName, runner)
  return launchOptions.length > 1
}
