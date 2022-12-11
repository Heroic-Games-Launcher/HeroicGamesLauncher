import React from 'react'

import { SettingsContextType } from 'frontend/types'

const initialContext: SettingsContextType = {
  getSetting: (key, fallback) => fallback,
  setSetting: () => null,
  config: {},
  isDefault: true,
  appName: 'default',
  runner: 'legendary',
  gameInfo: null,
  isMacNative: false,
  isLinuxNative: false
}

export default React.createContext(initialContext)
