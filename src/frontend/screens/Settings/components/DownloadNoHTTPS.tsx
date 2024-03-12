import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const DownloadNoHTTPS = () => {
  const { t } = useTranslation()
  const [
    downloadNoHttps,
    setDownloadNoHttps,
    ,
    isSetToDefault,
    resetToDefaultValue
  ] = useGlobalConfig('downloadNoHttps')

  return (
    <ToggleSwitch
      htmlId="downloadNoHttps"
      value={downloadNoHttps}
      handleChange={async () => setDownloadNoHttps(!downloadNoHttps)}
      title={t(
        'setting.download-no-https',
        'Download games without HTTPS (useful for CDNs e.g. LanCache)'
      )}
      inlineElement={
        <ResetToDefaultButton
          resetToDefault={resetToDefaultValue}
          isSetToDefault={isSetToDefault}
        />
      }
    />
  )
}

export default DownloadNoHTTPS
