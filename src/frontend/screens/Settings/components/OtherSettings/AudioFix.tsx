import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '/src/frontend/components/UI'
import useSetting from '/src/frontend/hooks/useSetting'
import ContextProvider from '/src/frontend/state/ContextProvider'

const AudioFix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [audioFix, setAudioFix] = useSetting<boolean>('audioFix', false)

  if (!isLinux) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="audiofix"
      value={audioFix}
      handleChange={() => setAudioFix(!audioFix)}
      title={t('setting.audiofix')}
    />
  )
}

export default AudioFix
