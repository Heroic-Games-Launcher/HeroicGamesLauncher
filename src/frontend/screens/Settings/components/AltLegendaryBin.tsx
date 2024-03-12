import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalConfig } from 'frontend/hooks/config'
import { PathSelectionBox } from 'frontend/components/UI'

const AltLegendaryBin = () => {
  const { t } = useTranslation()
  const [legendaryVersion, setLegendaryVersion] = useState('')
  const [altLegendaryBin, setAltLegendaryBin] = useGlobalConfig(
    'alternativeLegendaryBinary'
  )

  useEffect(() => {
    const getMoreInfo = async () => {
      const legendaryVer = await window.api.getLegendaryVersion()
      if (legendaryVer === 'invalid') {
        setLegendaryVersion('Invalid')
        setTimeout(() => {
          setAltLegendaryBin('')
          return setLegendaryVersion('')
        }, 3000)
      }
      return setLegendaryVersion(legendaryVer)
    }
    getMoreInfo()
  }, [altLegendaryBin])

  return (
    <PathSelectionBox
      htmlId="setting-alt-legendary"
      label={t(
        'setting.alt-legendary-bin',
        'Choose an Alternative Legendary Binary  (needs restart)to use'
      )}
      type="file"
      onPathChange={setAltLegendaryBin}
      path={altLegendaryBin ?? ''}
      placeholder={t(
        'placeholder.alt-legendary-bin',
        'Using built-in Legendary binary...'
      )}
      pathDialogTitle={t(
        'box.choose-legendary-binary',
        'Select Legendary Binary (needs restart)'
      )}
      afterInput={
        <span className="smallMessage">
          {t('other.legendary-version', 'Legendary Version: ')}
          {legendaryVersion}
        </span>
      }
    />
  )
}

export default AltLegendaryBin
