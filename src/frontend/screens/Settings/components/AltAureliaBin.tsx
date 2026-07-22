import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'

const AltAureliaBin = () => {
  const { t } = useTranslation()
  const [aureliaVersion, setAureliaVersion] = useState('')
  const [altAureliaBin, setAltAureliaBin] = useSetting('altAureliaBin', '')

  useEffect(() => {
    const getMoreInfo = async () => {
      const aureliaVer = await window.api.getAureliaVersion()
      if (aureliaVer === 'invalid') {
        setAureliaVersion('Invalid')
        setTimeout(() => {
          setAltAureliaBin('')
          return setAureliaVersion('')
        }, 3000)
      }
      return setAureliaVersion(aureliaVer)
    }
    void getMoreInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altAureliaBin])

  return (
    <PathSelectionBox
      htmlId="setting-alt-aurelia"
      label={t(
        'setting.alt-aurelia-bin',
        'Choose an Alternative Aurelia Binary'
      )}
      type="file"
      onPathChange={setAltAureliaBin}
      path={altAureliaBin}
      placeholder={t(
        'placeholder.alt-aurelia-bin',
        'Using built-in Aurelia binary...'
      )}
      pathDialogTitle={t('box.choose-aurelia-binary', 'Select Aurelia binary')}
      afterInput={
        <span className="smallMessage">
          {t('other.aurelia-version', 'Aurelia Version: ')}
          {aureliaVersion}
        </span>
      }
    />
  )
}

export default AltAureliaBin
