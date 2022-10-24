import { useContext } from 'react'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const useSetting = <T>(key: string, fallback: T): [T, (newVal: T) => void] => {
  const { getSetting, setSetting } = useContext(SettingsContext)

  let currentValue = getSetting(key) as T
  if (currentValue === undefined) {
    currentValue = fallback
  }

  const setSettingF = (newValue: T) => {
    setSetting(key, newValue)
  }

  return [currentValue, setSettingF]
}

export default useSetting
