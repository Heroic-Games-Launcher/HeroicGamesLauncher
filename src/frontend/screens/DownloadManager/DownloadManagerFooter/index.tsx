import { ToggleSwitch } from 'frontend/components/UI'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function DownloadManagerFooter() {
  const { t } = useTranslation()
  const [autoShutdown, setAutoShutdown] = useState(false)
  useEffect(() => {
    window.api.getAutoShutdownValue().then((value) => {
      setAutoShutdown(value)
    })
  }, [])

  const handleAutoShutdown = () => {
    setAutoShutdown((prev) => {
      window.api.setAutoShutdown(!prev)
      return !prev
    })
  }
  return (
    <div className="autoShutdown">
      <ToggleSwitch
        handleChange={handleAutoShutdown}
        value={autoShutdown}
        title={t(
          'download-manager.auto-shutdown.label',
          'Automatically shutdown machine when all downloads are finished'
        )}
        description={t(
          'download-manager.auto-shutdown.description',
          'This will shutdown the machine when all downloads are successfully finished.'
        )}
        htmlId="autoshutdowntoggle"
      />
    </div>
  )
}
