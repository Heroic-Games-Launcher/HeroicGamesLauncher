import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { Backspace } from '@mui/icons-material'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { TextInputWithIconField } from 'frontend/components/UI'
import { Path } from 'frontend/types'

const AltGOGdlBin = () => {
  const { t } = useTranslation()
  const [gogdlVersion, setGogdlVersion] = useState('')
  const [altGogdlBin, setAltGogdlBin] = useSetting('altGogdlBin', '')

  useEffect(() => {
    const getGogdlVersion = async () => {
      const settings = configStore.get('settings') as {
        altLeg: string
        altGogdl: string
      }
      configStore.set('settings', {
        ...settings,
        altGogdl: altGogdlBin
      })
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

  async function handleGogdlBinary() {
    return window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t(
          'box.choose-gogdl-binary',
          'Select GOGDL Binary (needs restart)'
        )
      })
      .then(({ path }: Path) => setAltGogdlBin(path ? path : ''))
  }

  return (
    <TextInputWithIconField
      label={t(
        'setting.alt-gogdl-bin',
        'Choose an Alternative GOGDL Binary to use (needs restart)'
      )}
      htmlId="setting-alt-gogdl"
      placeholder={t(
        'placeholder.alt-gogdl-bin',
        'Using built-in GOGDL binary...'
      )}
      value={altGogdlBin.replaceAll("'", '')}
      onChange={(event) => setAltGogdlBin(event.target.value)}
      icon={
        !altGogdlBin.length ? (
          <FontAwesomeIcon
            icon={faFolderOpen}
            data-testid="setGogdlBinaryButton"
            style={{
              color: altGogdlBin.length ? 'transparent' : 'currentColor'
            }}
          />
        ) : (
          <Backspace
            data-testid="setGogdlBinaryBackspace"
            style={{ color: '#currentColor' }}
          />
        )
      }
      onIconClick={
        !altGogdlBin.length
          ? async () => handleGogdlBinary()
          : () => setAltGogdlBin('')
      }
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
