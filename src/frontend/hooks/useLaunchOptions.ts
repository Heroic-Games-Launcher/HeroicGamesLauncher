import { useCallback, useEffect, useState } from 'react'
import { LaunchOption, Runner } from 'common/types'

interface UseLaunchOptionsProps {
  appName: string
  runner: Runner
  storageKeyPrefix?: string
}

interface UseLaunchOptionsResult {
  launchOptions: LaunchOption[]
  selectedOption: LaunchOption | undefined
  selectedIndex: number
  selectOption: (index: number, shouldStore?: boolean) => void
  labelForLaunchOption: (option: LaunchOption) => string | undefined
}

export const useLaunchOptions = ({
  appName,
  runner,
  storageKeyPrefix = 'heroic_launch_option_'
}: UseLaunchOptionsProps): UseLaunchOptionsResult => {
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const storageKey = `${storageKeyPrefix}${appName}`

  const selectedOption =
    selectedIndex >= 0 && selectedIndex < launchOptions.length
      ? launchOptions[selectedIndex]
      : undefined

  const selectOption = useCallback(
    (index: number, shouldStore = true) => {
      if (index >= 0 && index < launchOptions.length) {
        setSelectedIndex(index)

        if (shouldStore && appName) {
          localStorage.setItem(storageKey, index.toString())
        }
      } else {
        setSelectedIndex(-1)

        if (shouldStore) {
          localStorage.removeItem(storageKey)
        }
      }
    },
    [appName, launchOptions, storageKey]
  )

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

  useEffect(() => {
    const fetchLaunchOptions = async () => {
      const options = await window.api.getLaunchOptions(appName, runner)
      setLaunchOptions(options)

      if (options.length === 0) return

      const savedOptionIndex = localStorage.getItem(storageKey)
      const savedIndex = savedOptionIndex ? Number(savedOptionIndex) : -1

      if (savedOptionIndex && options[savedIndex]) {
        selectOption(savedIndex, false)
      } else {
        const defaultOption = options.find((option) => option.type === 'basic')
        const defaultIndex = defaultOption ? options.indexOf(defaultOption) : 0
        selectOption(defaultIndex, true)
      }
    }

    void fetchLaunchOptions()
  }, [appName, runner, storageKey, selectOption])

  return {
    launchOptions,
    selectedOption,
    selectedIndex,
    selectOption,
    labelForLaunchOption
  }
}

export default useLaunchOptions
