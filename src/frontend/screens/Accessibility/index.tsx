import React, {
  ChangeEvent,
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import classNames from 'classnames'
import { SelectField } from 'frontend/components/UI'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
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
    const systemFonts = (await window.api.getFonts(reload)) as string[]
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
        <h1 className="headerTitle">
          {t('accessibility.title', 'Accessibility')}
        </h1>

        <span className="rangeWrapper Field">
          <label className={classNames({ isRTL: isRTL })}>
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

        <SelectField
          htmlId="content-font-family"
          value={contentFontFamily}
          onChange={handleContentFontFamily}
          label={t(
            'accessibility.content_font_family',
            'Content Font Family (Default: "Cabin")'
          )}
        >
          {options}
        </SelectField>

        <SelectField
          htmlId="actions-font-family"
          value={actionsFontFamily}
          onChange={handleActionsFontFamily}
          label={t(
            'accessibility.actions_font_family',
            'Actions Font Family (Default: "Rubik")'
          )}
        >
          {options}
        </SelectField>

        <ThemeSelector />
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              htmlId="setAllTitlesInColor"
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
