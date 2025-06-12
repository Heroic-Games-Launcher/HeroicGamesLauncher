import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, SelectField } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { WineInstallation } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '..'
import { Link } from 'react-router-dom'
import { Box, MenuItem, SvgIcon } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWineGlass } from '@fortawesome/free-solid-svg-icons'
import ProtonLogo from 'frontend/assets/proton_logo.svg?react'
import CodeweaversLogo from 'frontend/assets/codeweavers_icon.svg?react'
import { faApple } from '@fortawesome/free-brands-svg-icons'
import Badge from '@mui/material/Badge'
import { Autorenew as AutorenewIcon } from '@mui/icons-material'
import GELogo from 'frontend/assets/ge-logo.svg?react'

interface ListItemProps {
  version: WineInstallation
}

export const WineVersionListItem = React.memo(function WineVersionListItem({
  version
}: ListItemProps) {
  const { name, type } = version

  const substitutedName = useMemo(
    () => name.replace(/(Proton-GE-Proton|Proton-GE)/, 'GE-Proton'),
    [name]
  )

  const primaryIcon = useMemo(() => {
    switch (type) {
      case 'wine':
        return <FontAwesomeIcon icon={faWineGlass} />
      case 'proton':
        if (name.includes('GE')) return <GELogo />
        return <ProtonLogo />
      case 'crossover':
        return <CodeweaversLogo />
      case 'toolkit':
        return <FontAwesomeIcon icon={faApple} />
    }
  }, [name, type])

  const icon = useMemo(() => {
    if (name.includes('-latest'))
      return (
        <Box sx={{ mr: 1 }}>
          <Badge badgeContent={<AutorenewIcon sx={{ fontSize: 17.5 }} />}>
            <SvgIcon>{primaryIcon}</SvgIcon>
          </Badge>
        </Box>
      )

    return <SvgIcon sx={{ mr: 1 }}>{primaryIcon}</SvgIcon>
  }, [name, primaryIcon])

  return (
    <Box sx={{ display: 'flex', placeItems: 'center' }}>
      {icon}
      {substitutedName}
    </Box>
  )
})

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

  useEffect(() => {
    const getAltWine = async () => {
      setRefreshing(true)
      const wineList: WineInstallation[] = await window.api.getAlternativeWine()

      // System Wine might change names (version strings) with updates. This
      // will then lead to it not being found in the alt wine list, as it
      // is indexed by name. To resolve this, search for the current Wine
      // version by binary path and update it
      const currentWine = wineList.find((wine) => wine.bin === wineVersion.bin)
      if (currentWine) {
        setWineVersion(currentWine)
      }

      setAltWine(wineList)
      // Avoids not updating wine config when having one wine install only
      if (wineList && wineList.length === 1) {
        setWineVersion(wineList[0])
      }
      setRefreshing(false)
    }
    getAltWine()
    return window.api.handleWineVersionsUpdated(getAltWine)
  }, [])

  useEffect(() => {
    const updateWine = async () => {
      const winePathExists = await window.api.pathExists(wineVersion.bin)
      if (!winePathExists) {
        return setValidWine(false)
      }
      return setValidWine(true)
    }
    updateWine()
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
    >
      {altWine.map((version, i) => (
        <MenuItem key={i} value={version.name}>
          <WineVersionListItem version={version} />
        </MenuItem>
      ))}
    </SelectField>
  )
}
