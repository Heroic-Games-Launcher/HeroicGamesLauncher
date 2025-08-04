import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, SelectField } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { WineInstallation } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '..'
import { Link } from 'react-router-dom'
import { MenuItem } from '@mui/material'

export default function WineVersionSelector() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [wineVersion, setWineVersion] = useSetting(
    'wineVersion',
    defaultWineVersion
  )
  const [altWine, setAltWine] = useState<WineInstallation[]>()
  const [validWine, setValidWine] = useState(true)
  const [refreshing, setRefreshing] = useState(true)
  const [showHiddenProtonsMessage, setShowHiddenProtonsMessage] =
    useState(false)

  useEffect(() => {
    const getAltWine = async () => {
      setRefreshing(true)
      const wineList = await window.api.getAlternativeWine()

      // System Wine might change names (version strings) with updates. This
      // will then lead to it not being found in the alt wine list, as it
      // is indexed by name. To resolve this, search for the current Wine
      // version by binary path and update it
      const currentWine = wineList.find((wine) => wine.bin === wineVersion.bin)
      if (currentWine) {
        setWineVersion(currentWine)
      } else {
        // If the version the user selected for this game isn't in the list
        // anymore but is still valid, add it to the list
        const isValid = await window.api.wine.isValidVersion(wineVersion)
        if (isValid) wineList.push(wineVersion)
      }

      setAltWine(wineList)
      // Avoids not updating wine config when having one wine install only
      if (wineList && wineList.length === 1) {
        setWineVersion(wineList[0])
      }
      setRefreshing(false)
    }
    void getAltWine()
    return window.api.handleWineVersionsUpdated(getAltWine)
  }, [])

  useEffect(() => {
    void window.api.requestAppSettings().then(({ showValveProton }) => {
      setShowHiddenProtonsMessage(!showValveProton)
    })
  }, [isLinux])

  useEffect(() => {
    const updateWine = async () => {
      const winePathExists = await window.api.pathExists(wineVersion.bin)
      if (!winePathExists) {
        return setValidWine(false)
      }
      return setValidWine(true)
    }
    void updateWine()
  }, [wineVersion])

  if (!altWine) {
    return <></>
  }

  return (
    <SelectField
      label={
        isLinux
          ? t('setting.wineversion')
          : t('setting.crossover-version', 'Crossover/Wine Version')
      }
      htmlId="setWineVersion"
      onChange={(event) =>
        setWineVersion(
          altWine.filter(({ name }) => name === event.target.value)[0]
        )
      }
      value={wineVersion.name}
      afterSelect={
        <>
          {!refreshing && !altWine.length && (
            <Link to={'/wine-manager'} className="smallInputInfo danger">
              {t(
                'infobox.wine-path-none-found',
                'No Wine version was found, download one from the Wine Manager'
              )}
            </Link>
          )}
          {!!altWine.length && !validWine && (
            <span className="smallInputInfo danger">
              {t(
                'infobox.wine-path-invalid',
                'Wine Path is invalid, please select another one.'
              )}
            </span>
          )}
          {isLinux && showHiddenProtonsMessage && (
            <InfoBox
              text={t(
                'setting.show_valve_proton.info_label',
                'Valve Proton versions ignored'
              )}
            >
              <span>
                {t(
                  'setting.show_valve_proton.wine_selector_warning',
                  'Valve versions of Proton are ignored by default, enable them in the Advanced global settings'
                )}
              </span>
            </InfoBox>
          )}
          {isLinux && (
            <InfoBox text={t('infobox.wine-path', 'Wine Path')}>
              <span>{wineVersion.bin}</span>
            </InfoBox>
          )}
          {isLinux && (
            <InfoBox text="infobox.help">
              <span>{t('help.wine.part1')}</span>
              <ul>
                <li>
                  <i>~/.config/heroic/tools/wine</i>
                </li>
                <li>
                  <i>~/.config/heroic/tools/proton</i>
                </li>
                <li>
                  <i>~/.steam/root/compatibilitytools.d</i>
                </li>
                <li>
                  <i>~/.steam/steamapps/common</i>
                </li>
                <li>
                  <i>~/.local/share/lutris/runners/wine</i>
                </li>
                <li>
                  <i>~/.var/app/com.valvesoftware.Steam (Steam Flatpak)</i>
                </li>
                <li>
                  <i>/usr/share/steam</i>
                </li>
              </ul>
              <span>{t('help.wine.part2')}</span>
            </InfoBox>
          )}
        </>
      }
    >
      {altWine.map(({ name }, i) => (
        <MenuItem key={i} value={name}>
          {name.replace(/(Proton-GE-Proton|Proton-GE)/, 'GE-Proton')}
        </MenuItem>
      ))}
    </SelectField>
  )
}
