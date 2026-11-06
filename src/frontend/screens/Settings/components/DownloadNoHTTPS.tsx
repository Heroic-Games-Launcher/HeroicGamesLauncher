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
      description={t(
        'setting.download-no-https.description',
        'Skip HTTPS when fetching game files, useful with a local CDN cache'
      )}
      title={t(
        'setting.download-no-https',
        'Download games without HTTPS (useful for CDNs e.g. LanCache)'
      )}
    />
  )
}

export default DownloadNoHTTPS
