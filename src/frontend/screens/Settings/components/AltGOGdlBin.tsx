import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'

const AltGOGdlBin = () => {
  const { t } = useTranslation()
  const [gogdlVersion, setGogdlVersion] = useState('')
  const [altGogdlBin, setAltGogdlBin] = useSetting('altGogdlBin', '')

  useEffect(() => {
    const getGogdlVersion = async () => {
      const gogdlVersion = await window.api.getGogdlVersion()
      if (gogdlVersion === 'invalid') {
        setGogdlVersion('Invalid')
        setTimeout(() => {
          setAltGogdlBin('')
          return setGogdlVersion('')
        }, 3000)
      }
      return setGogdlVersion(gogdlVersion)
    }

    getGogdlVersion()
  }, [altGogdlBin])

  return (
    <PathSelectionBox
      label={t(
        'setting.alt-gogdl-bin',
        'Choose an Alternative GOGDL Binary to use (needs restart)'
      )}
      htmlId="setting-alt-gogdl"
      type="file"
      onPathChange={setAltGogdlBin}
      path={altGogdlBin}
      placeholder={t(
        'placeholder.alt-gogdl-bin',
        'Using built-in GOGDL binary...'
      )}
      pathDialogTitle={t(
        'box.choose-gogdl-binary',
        'Select GOGDL Binary (needs restart)'
      )}
      afterInput={
        <span className="smallMessage">
          {t('other.gogdl-version', 'GOGDL Version: ')}
          {gogdlVersion}
        </span>
      }
    />
  )
}

export default AltGOGdlBin
