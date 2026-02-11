import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LaunchOption, Runner } from 'common/types'

interface UseLaunchOptionsProps {
  appName: string
  runner: Runner | undefined
  lastUsedOption?: LaunchOption
  onSelectionChange?: (option: LaunchOption | undefined, index: number) => void
}

export const useLaunchOptions = ({
  appName,
  runner,
  lastUsedOption,
  onSelectionChange
}: UseLaunchOptionsProps) => {
  const { t } = useTranslation('gamepage')
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Fetch launch options
  useEffect(() => {
    setSelectedIndex(-1)
    const fetchOptions = async () => {
      try {
        const options = await window.api.getLaunchOptions(
          appName,
          runner as Runner
        )
        const hasDefaultOption = options.some(
          (option) =>
            (option.type === undefined || option.type === 'basic') &&
            'parameters' in option &&
            option.parameters === ''
        )
        if (!hasDefaultOption) {
          options.unshift({
            name: 'Default',
            parameters: '',
            type: 'basic'
          })
        }
        setLaunchOptions(options)
      } catch (error) {
        console.error('Error fetching launch options:', error)
      }
    }

    if (appName && runner) {
      void fetchOptions()
    }
  }, [appName, runner])

  // Find and set the previously used option
  useEffect(() => {
    if (lastUsedOption && launchOptions.length > 0) {
      const foundIndex = findLaunchOptionIndex(launchOptions, lastUsedOption)
      if (foundIndex !== -1 && foundIndex !== selectedIndex) {
        setSelectedIndex(foundIndex)
      }
    }
  }, [launchOptions, lastUsedOption, selectedIndex])

  // Generate label for a launch option
  const labelForLaunchOption = useCallback(
    (option: LaunchOption) => {
      if (
        (option.type === undefined || option.type === 'basic') &&
        option.name === 'Default' &&
        option.parameters === ''
      ) {
        return t('launch.default', 'Default')
      }
      switch (option.type) {
        case undefined:
        case 'basic':
          return 'name' in option ? option.name : 'Launch Option'
        case 'dlc':
          return 'dlcTitle' in option ? option.dlcTitle : 'DLC'
        case 'altExe':
          return 'executable' in option
            ? option.executable
            : 'Alternative Executable'
        default:
          return 'Launch Option'
      }
    },
    [t]
  )

  // Handle selection change
  const handleLaunchOptionChange = useCallback(
    (index: number) => {
      setSelectedIndex(index)
      const option = index >= 0 ? launchOptions[index] : undefined
      onSelectionChange?.(option, index)
    },
    [launchOptions, onSelectionChange]
  )

  return {
    launchOptions,
    selectedIndex,
    labelForLaunchOption,
    handleLaunchOptionChange
  }
}

// Helper function to find launch option index by matching properties
const findLaunchOptionIndex = (
  options: LaunchOption[],
  targetOption: LaunchOption
): number => {
  return options.findIndex((option) => {
    if (option.type !== targetOption.type) return false

    if (
      (option.type === undefined || option.type === 'basic') &&
      'name' in option &&
      'name' in targetOption &&
      'parameters' in option &&
      'parameters' in targetOption
    ) {
      return (
        option.name === targetOption.name &&
        option.parameters === targetOption.parameters
      )
    }

    if (
      option.type === 'dlc' &&
      'dlcAppName' in option &&
      'dlcAppName' in targetOption
    ) {
      return option.dlcAppName === targetOption.dlcAppName
    }

    if (
      option.type === 'altExe' &&
      'executable' in option &&
      'executable' in targetOption
    ) {
      return option.executable === targetOption.executable
    }

    return false
  })
}
