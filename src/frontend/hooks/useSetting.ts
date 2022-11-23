import { useContext } from 'react'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import { AppSettings } from 'common/types'

const useSetting = <T extends keyof AppSettings>(
  key: T,
  fallback: NonNullable<AppSettings[T]>
): [NonNullable<AppSettings[T]>, (newVal: AppSettings[T]) => void] => {
  const { getSetting, setSetting } = useContext(SettingsContext)

  const currentValue = getSetting(key, fallback)

  const setSettingF = (newValue: AppSettings[T]) => {
    setSetting(key, newValue)
  }

  return [currentValue, setSettingF]
}

export default useSetting
