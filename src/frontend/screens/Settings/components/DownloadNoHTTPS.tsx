import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const DownloadNoHTTPS = () => {
  const { t } = useTranslation()
  const [downloadNoHttps, setDownloadNoHttps] = useSetting(
    'downloadNoHttps',
    false
  )

  return (
    <ToggleSwitch
      htmlId="downloadNoHttps"
      value={downloadNoHttps}
      handleChange={() => setDownloadNoHttps(!downloadNoHttps)}
      title={t(
        'setting.download-no-https',
        'Download games without HTTPS (useful for CDNs e.g. LanCache)'
      )}
    />
  )
}

export default DownloadNoHTTPS
