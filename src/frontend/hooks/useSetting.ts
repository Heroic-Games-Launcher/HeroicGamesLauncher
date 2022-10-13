import React, { useContext, useEffect, useState } from 'react'
import SettingsContext from '@/frontend/screens/Settings/SettingsContext'

const useSetting = <T>(
  key: string,
  fallback: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const { getSetting, setSetting } = useContext(SettingsContext)

  let initialValue = getSetting(key) as T
  if (initialValue === undefined) {
    initialValue = fallback
  }
  const [value, setValue] = useState<T>(initialValue)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (dirty) {
      setSetting(key, value)
    } else if (value !== initialValue) {
      setDirty(true)
    }
  }, [value, dirty])

  return [value, setValue]
}

export default useSetting
