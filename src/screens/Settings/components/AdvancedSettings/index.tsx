import {
  CreateNewFolder,
  Backspace,
  CleaningServicesOutlined,
  ContentCopyOutlined,
  DeleteOutline
} from '@mui/icons-material'
import classNames from 'classnames'
import { IpcRenderer, Clipboard } from 'electron'
import { useTranslation } from 'react-i18next'
import React, { useContext, useEffect, useState } from 'react'
import { SvgButton } from 'src/components/UI'
import ContextProvider from 'src/state/ContextProvider'
import { AppSettings, Path } from 'src/types'
import { configStore } from 'src/helpers/electronStores'

interface ElectronProps {
  ipcRenderer: IpcRenderer
  clipboard: Clipboard
}

const { ipcRenderer, clipboard } = window.require('electron') as ElectronProps

interface Props {
  altLegendaryBin: string
  altGogdlBin: string
  setAltLegendaryBin: (value: string) => void
  setAltGogdlBin: (value: string) => void
  settingsToSave: AppSettings
}

export const AdvancedSettings = ({
  altLegendaryBin,
  altGogdlBin,
  setAltLegendaryBin,
  setAltGogdlBin,
  settingsToSave
}: Props) => {
  const [legendaryVersion, setLegendaryVersion] = useState('')
  const [gogdlVersion, setGogdlVersion] = useState('')
  const [isCopiedToClipboard, setCopiedToClipboard] = useState(false)
  const { t } = useTranslation()

  const { isRTL } = useContext(ContextProvider)

  const settings = configStore.get('settings') as {
    altLeg: string
    altGogdl: string
  }

  useEffect(() => {
    // set copied to clipboard status to true if it's not already set to true
    // used for changing text and color
    if (!isCopiedToClipboard) return

    const timer = setTimeout(() => {
      setCopiedToClipboard(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isCopiedToClipboard])

  useEffect(() => {
    const getMoreInfo = async () => {
      configStore.set('settings', {
        ...settings,
        altLeg: altLegendaryBin
      })

      const legendaryVer = await ipcRenderer.invoke('getLegendaryVersion')
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

  useEffect(() => {
    const getGogdlVersion = async () => {
      configStore.set('settings', {
        ...settings,
        altGogdl: altGogdlBin
      })
      const gogdlVersion = await ipcRenderer.invoke('getGogdlVersion')
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

  async function handleLegendaryBinary() {
    return ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t(
          'box.choose-legendary-binary',
          'Select Legendary Binary (needs restart)'
        )
      })
      .then(({ path }: Path) => setAltLegendaryBin(path ? path : ''))
  }

  async function handleGogdlBinary() {
    return ipcRenderer
      .invoke('openDialog', {
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
    <div>
      <span className="setting">
        <span className={classNames('settingText', { isRTL: isRTL })}>
          {t(
            'setting.alt-legendary-bin',
            'Choose an Alternative Legendary Binary  (needs restart)to use'
          )}
        </span>
        <span>
          <input
            data-testid="setting-alt-legendary"
            type="text"
            placeholder={t(
              'placeholder.alt-legendary-bin',
              'Using built-in Legendary binary...'
            )}
            className="settingSelect"
            value={altLegendaryBin.replaceAll("'", '')}
            onChange={(event) => setAltLegendaryBin(event.target.value)}
          />
          {!altLegendaryBin.length ? (
            <SvgButton
              onClick={async () => handleLegendaryBinary()}
              className="material-icons settings folder"
            >
              <CreateNewFolder
                data-testid="setLegendaryBinaryButton"
                style={{
                  color: altLegendaryBin.length ? 'transparent' : '#B0ABB6'
                }}
              />
            </SvgButton>
          ) : (
            <SvgButton
              className="material-icons settings folder"
              onClick={() => setAltLegendaryBin('')}
            >
              <Backspace
                data-testid="setLegendaryBinaryBackspace"
                style={{ color: '#B0ABB6' }}
              />
            </SvgButton>
          )}
        </span>
        <span className="smallMessage">
          {t('other.legendary-version', 'Legendary Version: ')}
          {legendaryVersion}
        </span>
      </span>
      <span className="setting">
        <span className={classNames('settingText', { isRTL: isRTL })}>
          {t(
            'setting.alt-gogdl-bin',
            'Choose an Alternative GOGDL Binary to use (needs restart)'
          )}
        </span>
        <span>
          <input
            data-testid="setting-alt-gogdl"
            type="text"
            placeholder={t(
              'placeholder.alt-gogdl-bin',
              'Using built-in GOGDL binary...'
            )}
            className="settingSelect"
            value={altGogdlBin.replaceAll("'", '')}
            onChange={(event) => setAltGogdlBin(event.target.value)}
          />
          {!altGogdlBin.length ? (
            <SvgButton
              onClick={async () => handleGogdlBinary()}
              className="material-icons settings folder"
            >
              <CreateNewFolder
                data-testid="setGogdlBinaryButton"
                style={{
                  color: altGogdlBin.length ? 'transparent' : '#B0ABB6'
                }}
              />
            </SvgButton>
          ) : (
            <SvgButton
              className="material-icons settings folder"
              onClick={() => setAltGogdlBin('')}
            >
              <Backspace
                data-testid="setGogdlBinaryBackspace"
                style={{ color: '#B0ABB6' }}
              />
            </SvgButton>
          )}
        </span>
        <span className="smallMessage">
          {t('other.gogdl-version', 'GOGDL Version: ')}
          {gogdlVersion}
        </span>
      </span>
      <div className="footerFlex">
        <button
          className={classNames('button', 'is-footer', {
            isSuccess: isCopiedToClipboard
          })}
          onClick={() => {
            clipboard.writeText(JSON.stringify({ ...settingsToSave }))
            setCopiedToClipboard(true)
          }}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <ContentCopyOutlined />
            </div>
            <span className="button-icon-text">
              {isCopiedToClipboard
                ? t('settings.copiedToClipboard', 'Copied to Clipboard!')
                : t(
                    'settings.copyToClipboard',
                    'Copy All Settings to Clipboard'
                  )}
            </span>
          </div>
        </button>
        <button
          className="button is-footer is-danger"
          onClick={() => ipcRenderer.send('clearCache')}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <CleaningServicesOutlined />
            </div>
            <span className="button-icon-text">
              {t('settings.clear-cache', 'Clear Heroic Cache')}
            </span>
          </div>
        </button>

        <button
          className="button is-footer is-danger"
          onClick={() => ipcRenderer.send('resetHeroic')}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <DeleteOutline />
            </div>
            <span className="button-icon-text">
              {t('settings.reset-heroic', 'Reset Heroic')}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
