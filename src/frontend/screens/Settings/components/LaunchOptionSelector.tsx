import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import SettingsContext from '../SettingsContext'
import { LaunchOption } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'

const LaunchOptionSelector = () => {
  const { t } = useTranslation()
  const { isDefault, appName, gameInfo } = useContext(SettingsContext)
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const defaultLaunchOption: LaunchOption = {
    type: 'basic',
    name: '',
    parameters: ''
  }

  const [lastUsedLaunchOption, setLastUsedLaunchOption] = useSetting(
    'lastUsedLaunchOption',
    defaultLaunchOption
  )

  useEffect(() => {
    if (isDefault || !appName || !gameInfo) {
      return
    }

    const getLaunchOptions = async () => {
      try {
        const options = await window.api.getLaunchOptions(
          appName,
          gameInfo.runner
        )
        setLaunchOptions(options)

        if (lastUsedLaunchOption && options.length > 0) {
          const foundIndex = options.findIndex((option) => {
            if (option.type !== lastUsedLaunchOption.type) return false

            if (
              (option.type === undefined || option.type === 'basic') &&
              'name' in option &&
              'name' in lastUsedLaunchOption &&
              'parameters' in option &&
              'parameters' in lastUsedLaunchOption
            ) {
              return (
                option.name === lastUsedLaunchOption.name &&
                option.parameters === lastUsedLaunchOption.parameters
              )
            }

            if (
              option.type === 'dlc' &&
              'dlcAppName' in option &&
              'dlcAppName' in lastUsedLaunchOption
            ) {
              return option.dlcAppName === lastUsedLaunchOption.dlcAppName
            }

            if (
              option.type === 'altExe' &&
              'executable' in option &&
              'executable' in lastUsedLaunchOption
            ) {
              return option.executable === lastUsedLaunchOption.executable
            }

            return false
          })

          if (foundIndex !== -1) {
            setSelectedIndex(foundIndex)
          }
        }
      } catch (error) {
        console.error('Error fetching launch options:', error)
      }
    }

    void getLaunchOptions()
  }, [appName, gameInfo, isDefault, lastUsedLaunchOption])

  const labelForLaunchOption = useCallback((option: LaunchOption) => {
    switch (option.type) {
      case undefined:
      case 'basic':
        return option.name
      case 'dlc':
        return option.dlcTitle
      case 'altExe':
        return option.executable
    }
  }, [])

  const handleLaunchOptionChange = (event: SelectChangeEvent) => {
    const value = event.target.value

    if (value === '-1') {
      setSelectedIndex(-1)
      setLastUsedLaunchOption(undefined)
    } else {
      const index = Number(value)
      setSelectedIndex(index)
      const option = launchOptions[index]
      setLastUsedLaunchOption(option)
    }
  }

  if (isDefault || launchOptions.length <= 1) {
    return null
  }

  return (
    <div className="Field">
      <label>{t('settings.launchOptions', 'Launch Options')}</label>
      <div className="SettingsField">
        <SelectField
          htmlId="launch_options_settings"
          onChange={handleLaunchOptionChange}
          value={selectedIndex.toString()}
        >
          <MenuItem value="-1">
            {t('settings.noLaunchOption', 'No Launch Option')}
          </MenuItem>
          {launchOptions.map((option, index) => (
            <MenuItem key={index} value={index.toString()}>
              {labelForLaunchOption(option)}
            </MenuItem>
          ))}
        </SelectField>
      </div>
    </div>
  )
}

export default LaunchOptionSelector
