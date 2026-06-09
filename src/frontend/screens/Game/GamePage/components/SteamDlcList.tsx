import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  Download,
  OpenInNew,
  ShoppingCart
} from '@mui/icons-material'
import { CachedImage } from 'frontend/components/UI'
import { SteamDLCInfo } from 'common/types/steam'

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps'
const STEAM_STORE = 'https://store.steampowered.com/app'
// Opens the parent game's Properties window in the Steam client, where DLC are
// enabled/installed/removed. Steam has no reliable per-DLC install protocol, so
// this is the canonical place to manage DLC.
const STEAM_GAME_PROPERTIES = 'steam://gameproperties'

interface Props {
  appName: string
}

const SteamDlcList = ({ appName }: Props) => {
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const [dlcs, setDlcs] = useState<SteamDLCInfo[]>([])

  const dlcStorePage = (dlcAppId: string) =>
    `/store-page?store-url=${encodeURIComponent(`${STEAM_STORE}/${dlcAppId}`)}`

  // The status icon doubles as an action: owned DLC (installed or not) opens the
  // game's DLC settings in Steam (to install/manage it); unowned DLC opens its
  // store page to buy it.
  const onStatusClick = (dlc: SteamDLCInfo) => {
    if (dlc.owned) {
      window.api.openExternalUrl(`${STEAM_GAME_PROPERTIES}/${appName}`)
    } else {
      navigate(dlcStorePage(dlc.appId))
    }
  }

  useEffect(() => {
    let active = true
    window.api
      .getSteamDlcInfo(appName)
      .then((list) => {
        if (active) setDlcs(list)
      })
      .catch(() => {
        if (active) setDlcs([])
      })
    return () => {
      active = false
    }
  }, [appName])

  if (!dlcs.length) {
    return null
  }

  // Resolve a DLC's three possible states to an icon, style and tooltip:
  // installed (checkmark), owned but not installed (download), not owned (shop).
  const statusFor = (dlc: SteamDLCInfo) => {
    if (dlc.installed) {
      return {
        className: 'installed',
        icon: <CheckCircle />,
        label: t('info.dlc.installed', 'Installed')
      }
    }
    if (!dlc.owned) {
      return {
        className: 'notBought',
        icon: <ShoppingCart />,
        label: t('info.dlc.notBought', 'Not owned')
      }
    }
    return {
      className: 'notInstalled',
      icon: <Download />,
      label: t('info.dlc.notInstalled', 'Not installed')
    }
  }

  return (
    <div className="steamDlcInfo">
      <b>{t('info.dlcs', 'DLCs')}:</b>
      <ul className="steamDlcList">
        {dlcs.map((dlc) => {
          const status = statusFor(dlc)
          return (
            <li key={dlc.appId} className="steamDlcRow">
              <CachedImage
                className="steamDlcImage"
                src={`${STEAM_CDN}/${dlc.appId}/header.jpg`}
                fallback={`${STEAM_CDN}/${dlc.appId}/capsule_231x87.jpg`}
              />
              <span className="steamDlcTitle">{dlc.title}</span>
              <button
                type="button"
                className={`steamDlcStatus ${status.className}`}
                onClick={() => onStatusClick(dlc)}
                title={status.label}
                aria-label={status.label}
              >
                {status.icon}
              </button>
              <NavLink
                className="steamDlcStoreBtn"
                to={dlcStorePage(dlc.appId)}
                title={t('button.steamStore', 'Open Steam Page')}
                aria-label={t('button.steamStore', 'Open Steam Page')}
              >
                <OpenInNew />
              </NavLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SteamDlcList
