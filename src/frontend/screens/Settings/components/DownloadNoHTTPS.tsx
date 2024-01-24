import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'

const DownloadNoHTTPS = () => {
  const { t } = useTranslation()
  const [downloadNoHttps, setDownloadNoHttps] =
    useGlobalConfig('downloadNoHttps')

  return (
    <ToggleSwitch
      htmlId="downloadNoHttps"
      value={downloadNoHttps}
      handleChange={async () => setDownloadNoHttps(!downloadNoHttps)}
      title={t(
        'setting.download-no-https',
        'Download games without HTTPS (useful for CDNs e.g. LanCache)'
      )}
    />
  )
}

export default DownloadNoHTTPS
