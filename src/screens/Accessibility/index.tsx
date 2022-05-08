import React, {
  ChangeEvent,
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import classNames from 'classnames'
const { ipcRenderer } = window.require('electron')

import './index.css'
import { ThemeSelector } from 'src/components/UI/ThemeSelector'

export default function Accessibility() {
  const { t } = useTranslation()
  const {
    isRTL,
    zoomPercent,
    setZoomPercent,
    contentFontFamily,
    setContentFontFamily,
    actionsFontFamily,
    setActionsFontFamily
  } = useContext(ContextProvider)

  const [fonts, setFonts] = useState<string[]>(['Cabin', 'Rubik'])

  useEffect(() => {
    const getFonts = async () => {
      const systemFonts = (await ipcRenderer.invoke('getFonts')) as string[]
      setFonts(["'Cabin', sans-serif", "'Rubik', sans-serif", ...systemFonts])
    }
    getFonts()
  }, [])

  const handleZoomLevel = (event: ChangeEvent<HTMLInputElement>) => {
    setZoomPercent(parseInt(event.target.value))
  }

  const handleContentFontFamily = (event: ChangeEvent<HTMLSelectElement>) => {
    setContentFontFamily(event.target.value)
  }

  const handleActionsFontFamily = (event: ChangeEvent<HTMLSelectElement>) => {
    setActionsFontFamily(event.target.value)
  }

  const options = useMemo(() => {
    return fonts.map((font) => {
      const style = { 'font-family': font } as CSSProperties
      return (
        <option key={font} value={font} style={style}>
          {font}
        </option>
      )
    })
  }, [fonts])

  return (
    <div className="Accessibility Settings">
      <div className="settingsWrapper">
        <h1>{t('accessibility.title', 'Accessibility')}</h1>

        <span className="setting">
          <label className={classNames('settingText', { isRTL: isRTL })}>
            {t('accessibility.zoom', 'Zoom')} ({zoomPercent}%)
          </label>
          <input
            type="range"
            value={zoomPercent}
            onChange={handleZoomLevel}
            min="80"
            max="200"
            step="10"
          />
        </span>

        <span className="setting">
          <label
            className={classNames('settingText', { isRTL: isRTL })}
            htmlFor="content-font-family"
          >
            {t(
              'accessibility.content_font_family',
              'Content Font Family (Default: "Cabin")'
            )}
          </label>
          <select
            id="content-font-family"
            value={contentFontFamily}
            onChange={handleContentFontFamily}
            className="settingSelect is-drop-down"
          >
            {options}
          </select>
        </span>

        <span className="setting">
          <label
            className={classNames('settingText', { isRTL: isRTL })}
            htmlFor="actions-font-family"
          >
            {t(
              'accessibility.actions_font_family',
              'Actions Font Family (Default: "Rubik")'
            )}
          </label>
          <select
            id="actions-font-family"
            value={actionsFontFamily}
            onChange={handleActionsFontFamily}
            className="settingSelect is-drop-down"
          >
            {options}
          </select>
        </span>

        <ThemeSelector />
      </div>
    </div>
  )
}
