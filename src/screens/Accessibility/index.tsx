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
import { ThemeSelector } from 'src/components/UI/ThemeSelector'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
const { ipcRenderer } = window.require('electron')
import './index.css'

export default function Accessibility() {
  const { t } = useTranslation()
  const {
    isRTL,
    zoomPercent,
    setZoomPercent,
    contentFontFamily,
    setContentFontFamily,
    actionsFontFamily,
    setActionsFontFamily,
    allTilesInColor,
    setAllTilesInColor
  } = useContext(ContextProvider)

  const [fonts, setFonts] = useState<string[]>(['Cabin', 'Rubik'])
  const [refreshing, setRefreshing] = useState(false)

  const getFonts = async (reload = false) => {
    const systemFonts = (await ipcRenderer.invoke(
      'getFonts',
      reload
    )) as string[]
    setFonts(["'Cabin', sans-serif", "'Rubik', sans-serif", ...systemFonts])
  }

  const refreshFonts = () => {
    setRefreshing(true)
    getFonts(true)
  }

  const onRefreshingAnimationEnd = () => {
    setRefreshing(false)
  }

  useEffect(() => {
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
      const style = { fontFamily: font } as CSSProperties
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
            min="60"
            max="200"
            step="10"
            list="zoom-levels"
          />
          <span className="zoomHint">
            {[60, 80, 100, 120, 140, 160, 180, 200].map((zoom) => (
              <span key={zoom}>{zoom}</span>
            ))}
          </span>
          <datalist id="zoom-levels">
            {[60, 80, 100, 120, 140, 160, 180, 200].map((zoom) => (
              <option key={zoom} value={zoom}>
                {zoom}
              </option>
            ))}
          </datalist>
        </span>
        <span className="setting">
          <span className="fonts-label">
            {t('accessibility.fonts', 'Fonts')}
            <button
              className={classNames('FormControl__button', { refreshing })}
              title={t('library.refresh', 'Refresh Library')}
              onClick={refreshFonts}
              onAnimationEnd={onRefreshingAnimationEnd}
            >
              <FontAwesomeIcon
                className="FormControl__segmentedFaIcon"
                icon={faSyncAlt}
              />
            </button>
          </span>
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
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              value={allTilesInColor}
              handleChange={() => {
                setAllTilesInColor(!allTilesInColor)
              }}
              title={t(
                'accessibility.all_tiles_in_color',
                'Show all game tiles in color'
              )}
            />
          </label>
        </span>
      </div>
    </div>
  )
}
