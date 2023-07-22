import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'

const AltNileBin = () => {
  const { t } = useTranslation()
  const [nileVersion, setNileVersion] = useState('')
  const [altNileBin, setAltNileBin] = useSetting('altNileBin', '')

  useEffect(() => {
    const getMoreInfo = async () => {
      const nileVer = await window.api.getNileVersion()
      if (nileVer === 'invalid') {
        setNileVersion('Invalid')
        setTimeout(() => {
          setAltNileBin('')
          return setNileVersion('')
        }, 3000)
      }
      return setNileVersion(nileVer)
    }
    getMoreInfo()
  }, [altNileBin])

  return (
    <PathSelectionBox
      htmlId="setting-alt-nile"
      label={t(
        'setting.alt-nile-bin',
        'Choose an Alternative Nile Binary  (needs restart)to use'
      )}
      type="file"
      onPathChange={setAltNileBin}
      path={altNileBin}
      placeholder={t(
        'placeholder.alt-nile-bin',
        'Using built-in Nile binary...'
      )}
      pathDialogTitle={t(
        'box.choose-nile-binary',
        'Select Nile Binary (needs restart)'
      )}
      afterInput={
        <span className="smallMessage">
          {t('other.nile-version', 'Nile Version: ')}
          {nileVersion}
        </span>
      }
    />
  )
}

export default AltNileBin
