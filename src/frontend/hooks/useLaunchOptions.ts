import { useCallback, useEffect, useState } from 'react'
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
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Fetch launch options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const options = await window.api.getLaunchOptions(
          appName,
          runner as Runner
        )
        setLaunchOptions(options)

        // Find and set the previously used option
        if (lastUsedOption && options.length > 0) {
          const foundIndex = findLaunchOptionIndex(options, lastUsedOption)
          if (foundIndex !== -1) {
            setSelectedIndex(foundIndex)
          }
        }
      } catch (error) {
        console.error('Error fetching launch options:', error)
      }
    }

    if (appName && runner) {
      void fetchOptions()
    }
  }, [appName, runner, lastUsedOption])

  // Generate label for a launch option
  const labelForLaunchOption = useCallback((option: LaunchOption) => {
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
  }, [])

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
