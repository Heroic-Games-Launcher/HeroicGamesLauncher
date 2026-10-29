import React, {
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { LayoutGrid, MousePointerClick, Palette, Type } from 'lucide-react'
import {
  PageHeader,
  SelectField,
  SettingsCard,
  SliderField,
  ToggleSwitch
} from 'frontend/components/UI'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import useSetting from '../../hooks/useSetting'
import SettingsContext from '../Settings/SettingsContext'
import useSettingsContext from '../../hooks/useSettingsContext'
import './index.css'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { MenuItem, SelectChangeEvent } from '@mui/material'

const ZOOM_MARKS = [60, 100, 150, 200].map((value) => ({
  value,
  label: `${value}%`
}))

const Accessibility = React.memo(function Accessibility() {
  const { t } = useTranslation()
  const {
    zoomPercent,
    setZoomPercent,
    allTilesInColor,
    setAllTilesInColor,
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
        <PageHeader
          backTo="/library"
          backLabel={t('button.backToLibrary', 'Back to Library')}
          title={t('accessibility.title', 'Accessibility')}
          description={t(
            'accessibility.subtitle',
            'Adjust how Heroic looks and behaves'
          )}
          className="headerTitle"
        />

        <div className="settingsSections">
          <SettingsCard
            glyph={Palette}
            title={t('accessibility.section.appearance', 'Appearance')}
          >
            <SliderField
              htmlId="zoomLevel"
              label={`${t('accessibility.zoom', 'Zoom')} (${zoomPercent}%)`}
              value={zoomPercent}
              onChange={setZoomPercent}
              min={60}
              max={200}
              step={10}
              marks={ZOOM_MARKS}
            />
            <ThemeSelector />
          </SettingsCard>

          <SettingsCard glyph={Type} title={t('accessibility.fonts', 'Fonts')}>
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
          </SettingsCard>

          <SettingsCard
            glyph={LayoutGrid}
            title={t('accessibility.section.library', 'Library')}
          >
            <ToggleSwitch
              htmlId="setAllTitlesInColor"
              value={allTilesInColor}
              handleChange={() => setAllTilesInColor(!allTilesInColor)}
              title={t(
                'accessibility.all_tiles_in_color',
                'Show all game tiles in color'
              )}
            />
            <ToggleSwitch
              htmlId="setTitlesAlwaysVisible"
              value={titlesAlwaysVisible}
              handleChange={() => setTitlesAlwaysVisible(!titlesAlwaysVisible)}
              title={t(
                'accessibility.titles_always_visible',
                'Always show titles in library'
              )}
            />
          </SettingsCard>

          <SettingsCard
            glyph={MousePointerClick}
            title={t('accessibility.section.motion', 'Motion & Interaction')}
          >
            <ToggleSwitch
              htmlId="disableAnimations"
              value={disableAnimations}
              handleChange={() => setDisableAnimations(!disableAnimations)}
              title={t(
                'accessibility.disable_animations',
                'Disable UI animations'
              )}
            />
            <ToggleSwitch
              htmlId="disableSmoothScrolling"
              value={smoothScrollingDisabled}
              handleChange={() =>
                setSmoothScrollingDisabled(!smoothScrollingDisabled)
              }
              title={t(
                'accessibility.disable_smooth_scrolling',
                'Disable smooth scrolling (requires restart)'
              )}
            />
            <ToggleSwitch
              htmlId="disableDialogBackdropClose"
              value={disableDialogBackdropClose}
              handleChange={() =>
                setDisableDialogBackdropClose(!disableDialogBackdropClose)
              }
              title={t(
                'accessibility.disable_dialog_backdrop_close',
                'Disable closing dialogs by clicking outside'
              )}
            />
          </SettingsCard>
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
