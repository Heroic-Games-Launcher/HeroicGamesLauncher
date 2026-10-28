import React from 'react'

import { SettingsContextType } from 'frontend/types'

const initialContext: SettingsContextType = {
  getSetting: (key, fallback) => fallback,
  setSetting: () => null,
  config: {},
  game: null,
  isDefault: true,
  gameInfo: null,
  isMacNative: false,
  isLinuxNative: false
}

export default React.createContext<SettingsContextType>(initialContext)
