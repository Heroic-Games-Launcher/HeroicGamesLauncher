import React from 'react'

import { SettingsContextType } from 'frontend/types'

const initialContext: SettingsContextType = {
  isDefault: true,
  appName: 'default',
  runner: 'legendary',
  gameInfo: null,
  isMacNative: false,
  isLinuxNative: false
}

export default React.createContext(initialContext)
