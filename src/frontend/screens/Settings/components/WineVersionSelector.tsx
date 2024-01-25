import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, SelectField } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { WineInstallation } from 'common/types'
import { useSharedConfig } from 'frontend/hooks/config'
import { Link } from 'react-router-dom'

export default function WineVersionSelector() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [
    wineVersion,
    setWineVersion,
    wineVersionFetched,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useSharedConfig('wineVersion')
  const [altWine, setAltWine] = useState<WineInstallation[]>([])
  const [validWine, setValidWine] = useState(true)
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    const getAltWine = async () => {
      setRefreshing(true)
      const wineList: WineInstallation[] = await window.api.getAlternativeWine()
      setAltWine(wineList)
      // Avoids not updating wine config when having one wine install only
      if (wineList && wineList.length === 1) {
        setWineVersion(wineList[0])
      }
      setRefreshing(false)
    }
    getAltWine()
  }, [])

  useEffect(() => {
    if (!wineVersion) return
    window.api.pathExists(wineVersion.bin).then(setValidWine)
  }, [wineVersion])

  if (!wineVersionFetched) return <></>

  return (
    <SelectField
      label={
        isLinux
          ? t('setting.wineversion')
          : t('setting.crossover-version', 'Crossover/Wine Version')
      }
      htmlId="setWineVersion"
      onChange={async (event) =>
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
          {isLinux && (
            <InfoBox text={t('infobox.wine-path', 'Wine Path')}>
              <span>{wineVersion.bin}</span>
            </InfoBox>
          )}
          {isLinux && (
            <InfoBox text="infobox.help">
              <span>{t('help.wine.part1')}</span>
              <ul>
                <i>
                  <li>~/.config/heroic/tools/wine</li>
                  <li>~/.config/heroic/tools/proton</li>
                  <li>~/.steam/root/compatibilitytools.d</li>
                  <li>~/.steam/steamapps/common</li>
                  <li>~/.local/share/lutris/runners/wine</li>
                  <li>~/.var/app/com.valvesoftware.Steam (Steam Flatpak)</li>
                  <li>/usr/share/steam</li>
                </i>
              </ul>
              <span>{t('help.wine.part2')}</span>
            </InfoBox>
          )}
        </>
      }
      isSetToDefaultValue={isSetToDefaultValue}
      resetToDefaultValue={resetToDefaultValue}
    >
      {altWine.map(({ name }, i) => (
        <option key={i}>{name}</option>
      ))}
    </SelectField>
  )
}
