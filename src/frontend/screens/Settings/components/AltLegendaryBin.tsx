import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { Backspace } from '@mui/icons-material'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { TextInputWithIconField } from 'frontend/components/UI'

const AltLegendaryBin = () => {
  const { t } = useTranslation()
  const [legendaryVersion, setLegendaryVersion] = useState('')
  const [altLegendaryBin, setAltLegendaryBin] = useSetting(
    'altLegendaryBin',
    ''
  )

  useEffect(() => {
    const getMoreInfo = async () => {
      const settings = configStore.get('settings') as {
        altLeg: string
        altGogdl: string
      }
      configStore.set('settings', {
        ...settings,
        altLeg: altLegendaryBin
      })

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

  async function handleLegendaryBinary() {
    return window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t(
          'box.choose-legendary-binary',
          'Select Legendary Binary (needs restart)'
        )
      })
      .then((path) => setAltLegendaryBin(path || ''))
  }

  return (
    <TextInputWithIconField
      htmlId="setting-alt-legendary"
      label={t(
        'setting.alt-legendary-bin',
        'Choose an Alternative Legendary Binary  (needs restart)to use'
      )}
      placeholder={t(
        'placeholder.alt-legendary-bin',
        'Using built-in Legendary binary...'
      )}
      value={altLegendaryBin.replaceAll("'", '')}
      onChange={(event) => setAltLegendaryBin(event.target.value)}
      icon={
        !altLegendaryBin.length ? (
          <FontAwesomeIcon
            icon={faFolderOpen}
            data-testid="setLegendaryBinaryButton"
            style={{
              color: altLegendaryBin.length ? 'transparent' : 'currentColor'
            }}
          />
        ) : (
          <Backspace
            data-testid="setLegendaryBinaryBackspace"
            style={{ color: 'currentColor' }}
          />
        )
      }
      onIconClick={
        !altLegendaryBin.length
          ? async () => handleLegendaryBinary()
          : () => setAltLegendaryBin('')
      }
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
