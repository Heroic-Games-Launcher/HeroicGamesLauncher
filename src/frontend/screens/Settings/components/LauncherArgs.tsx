import React, { ChangeEvent, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const LauncherArgs = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [launcherArgs, setLauncherArgs] = useSetting('launcherArgs', '')

  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)

  if (isDefault) {
    return <></>
  }

  const launcherArgsInfo = (
    <InfoBox text="infobox.help">
      <span>
        {t('help.other.part4')}
        <strong>{t('help.other.part5')}</strong>
        {t('help.other.part6')}
        <strong>{` -nolauncher `}</strong>
        {t('help.other.part7')}
      </span>
    </InfoBox>
  )

  return (
    <TextInputField
      label={t('options.gameargs.title')}
      htmlId="launcherArgs"
      placeholder={t('options.gameargs.placeholder')}
      value={launcherArgs}
      onChange={handleLauncherArgs}
      afterInput={launcherArgsInfo}
    />
  )
}

export default LauncherArgs
