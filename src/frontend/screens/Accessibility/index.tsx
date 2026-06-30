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
import useSetting from '../../hooks/useSetting'
import SettingsContext from '../Settings/SettingsContext'
import useSettingsContext from '../../hooks/useSettingsContext'
import './index.css'
import { hasHelp } from 'frontend/hooks/hasHelp'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { CoverResolution } from 'common/types'
import { MenuItem, SelectChangeEvent } from '@mui/material'

function AccessToggle({
  htmlId,
  value,
  onChange,
  title,
  isRTL
}: {
  htmlId: string
  value: boolean
  onChange: () => void
  title: string
  isRTL: boolean
}) {
  return (
    <span className="setting">
      <label className={classNames('toggleWrapper', { isRTL })}>
        <ToggleSwitch htmlId={htmlId} value={value} handleChange={onChange} title={title} />
      </label>
    </span>
  )
}

const Accessibility = React.memo(function Accessibility() {
  const { t } = useTranslation()
  const {
    isRTL,
    zoomPercent,
    setZoomPercent,
    allTilesInColor,
    setAllTilesInColor,
    hideStoreLogos,
    setHideStoreLogos,
    disableGameCardHoverScale,
    setDisableGameCardHoverScale,
    reducedMotion,
    setReducedMotion,
    coverResolution,
    setCoverResolution,
    titlesAlwaysVisible,
    setTitlesAlwaysVisible,
    setPrimaryFontFamily,
    setSecondaryFontFamily,
    disableDialogBackdropClose,
    setDisableDialogBackdropClose,
    disableAnimations,
    setDisableAnimations
  } = useContext(ContextProvider)

  hasHelp(
    'accessibility',
    t('help.title.accessibility', 'Accessibility'),
    <p>{t('help.content.accessibility', 'Shows accessibility settings.')}</p>
  )

  const [fonts, setFonts] = useState<string[]>([])
  const [contentFont, setContentFont] = useState('')
  const [actionFont, setActionFont] = useState('')
  const [smoothScrollingDisabled, setSmoothScrollingDisabled] = useSetting(
    'disableSmoothScrolling',
    false
  )

  const defaultPrimaryFont = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--default-primary-font-family')

  const defaultSecondaryFont = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--default-secondary-font-family')

  const getFonts = async () => {
    const systemFonts = await queryLocalFonts()
    setFonts([
      defaultSecondaryFont.trim(),
      defaultPrimaryFont.trim(),
      ...new Set(systemFonts.map((font) => font.family))
    ])
  }

  useEffect(() => {
    getFonts()
    const primaryFont = getComputedStyle(
      document.documentElement
    ).getPropertyValue('--primary-font-family')
    setActionFont(primaryFont.trim())

    const secondaryFont = getComputedStyle(
      document.documentElement
    ).getPropertyValue('--secondary-font-family')
    setContentFont(secondaryFont.trim())
  }, [])

  const handleZoomLevel = (event: ChangeEvent<HTMLInputElement>) => {
    setZoomPercent(parseInt(event.target.value))
  }

  const handleContentFontFamily = (event: SelectChangeEvent) => {
    setSecondaryFontFamily(event.target.value)
    setContentFont(event.target.value)
  }

  const handleActionsFontFamily = (event: SelectChangeEvent) => {
    setPrimaryFontFamily(event.target.value)
    setActionFont(event.target.value)
  }

  const options = useMemo(() => {
    return fonts.map((font) => {
      const style: CSSProperties = { fontFamily: font }
      return (
        <MenuItem key={font} value={font} style={style}>
          {font}
        </MenuItem>
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
          </span>
        </span>

        <SelectField
          htmlId="content-font-family"
          value={contentFont}
          onChange={handleContentFontFamily}
          label={t(
            'accessibility.content_font_family_default',
            'Content Font Family (Default: {{fontFamily}})',
            { fontFamily: defaultSecondaryFont.split(',')[0].trim() }
          )}
        >
          {options}
        </SelectField>

        <SelectField
          htmlId="actions-font-family"
          value={actionFont}
          onChange={handleActionsFontFamily}
          label={t(
            'accessibility.actions_font_family_default',
            'Actions Font Family (Default: {{fontFamily}})',
            { fontFamily: defaultPrimaryFont.split(',')[0].trim() }
          )}
        >
          {options}
        </SelectField>

        <ThemeSelector />

        <AccessToggle
          htmlId="disableDialogBackdropClose"
          value={disableDialogBackdropClose}
          onChange={() => setDisableDialogBackdropClose(!disableDialogBackdropClose)}
          title={t('accessibility.disable_dialog_backdrop_close', 'Disable closing dialogs by clicking outside')}
          isRTL={isRTL}
        />

        <AccessToggle
          htmlId="disableSmoothScrolling"
          value={smoothScrollingDisabled}
          onChange={() => setSmoothScrollingDisabled(!smoothScrollingDisabled)}
          title={t('accessibility.disable_smooth_scrolling', 'Disable smooth scrolling (requires restart)')}
          isRTL={isRTL}
        />

        <AccessToggle
          htmlId="disableAnimations"
          value={disableAnimations}
          onChange={() => setDisableAnimations(!disableAnimations)}
          title={t('accessibility.disable_animations', 'Disable UI animations')}
          isRTL={isRTL}
        />

        <h2 className="librarySectionLabel">{t('Library', 'Library')}</h2>

        <div className="libraryAccessibility">
          <SelectField
            htmlId="cover-resolution"
            value={coverResolution}
            onChange={(e: SelectChangeEvent) =>
              setCoverResolution(e.target.value as CoverResolution)
            }
            label={
              <>
                {t('accessibility.cover_resolution', 'Game cover resolution')}
                <InfoIcon
                  text={t(
                    'accessibility.cover_resolution_info',
                    'Higher resolution requires more resources. Medium is recommended as it has the best load times and is good enough.'
                  )}
                />
              </>
            }
          >
            <MenuItem value="low">
              {t('accessibility.cover_resolution_low', 'Low')}
            </MenuItem>
            <MenuItem value="medium">
              {t('accessibility.cover_resolution_medium', 'Medium')}
            </MenuItem>
            <MenuItem value="high">
              {t('accessibility.cover_resolution_high', 'High')}
            </MenuItem>
          </SelectField>

          <AccessToggle
            htmlId="setAllTitlesInColor"
            value={allTilesInColor}
            onChange={() => setAllTilesInColor(!allTilesInColor)}
            title={t('accessibility.all_tiles_in_color', 'Show all game tiles in color')}
            isRTL={isRTL}
          />

          <AccessToggle
            htmlId="setTitlesAlwaysVisible"
            value={titlesAlwaysVisible}
            onChange={() => setTitlesAlwaysVisible(!titlesAlwaysVisible)}
            title={t('accessibility.titles_always_visible', 'Always show titles in library')}
            isRTL={isRTL}
          />

          <AccessToggle
            htmlId="hideStoreLogos"
            value={hideStoreLogos}
            onChange={() => setHideStoreLogos(!hideStoreLogos)}
            title={t('accessibility.hide_store_logos', 'Hide store logos in library')}
            isRTL={isRTL}
          />

          <AccessToggle
            htmlId="disableGameCardHoverScale"
            value={disableGameCardHoverScale}
            onChange={() => setDisableGameCardHoverScale(!disableGameCardHoverScale)}
            title={t('accessibility.disable_game_card_hover_effects', 'Disable game card hover effects')}
            isRTL={isRTL}
          />

          <AccessToggle
            htmlId="reducedMotion"
            value={reducedMotion}
            onChange={() => setReducedMotion(!reducedMotion)}
            title={t('accessibility.reduced_motion', 'Reduce game card hover animation intensity')}
            isRTL={isRTL}
          />
        </div>
      </div>
    </div>
  )
})

export default function AccessibilityWrapper() {
  const settingsContext = useSettingsContext({ appName: 'default' })
  if (!settingsContext) return <></>
  return (
    <SettingsContext.Provider value={settingsContext}>
      <Accessibility />
    </SettingsContext.Provider>
  )
}
