import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Block,
  CheckCircle,
  OpenInNew,
  ShoppingCart
} from '@mui/icons-material'
import { CachedImage } from 'frontend/components/UI'
import { SteamDLCInfo } from 'common/types/steam'

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps'
const STEAM_STORE = 'https://store.steampowered.com/app'

interface Props {
  appName: string
}

const SteamDlcList = ({ appName }: Props) => {
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const [dlcs, setDlcs] = useState<SteamDLCInfo[]>([])
  // App ids currently mid-toggle, so their buttons can be disabled.
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const dlcStorePage = (dlcAppId: string) =>
    `/store-page?store-url=${encodeURIComponent(`${STEAM_STORE}/${dlcAppId}`)}`

  const loadDlcs = useCallback(async () => {
    try {
      setDlcs(await window.api.getSteamDlcInfo(appName))
    } catch {
      setDlcs([])
    }
  }, [appName])

  // The status icon doubles as an action: owned DLC toggles enabled/disabled
  // (`aurelia enable`/`disable`), which takes effect on the next Steam game
  // launch; unowned DLC opens its store page to buy it.
  const onStatusClick = async (dlc: SteamDLCInfo) => {
    if (!dlc.owned) {
      navigate(dlcStorePage(dlc.appId))
      return
    }
    if (busy.has(dlc.appId)) {
      return
    }
    setBusy((prev) => new Set(prev).add(dlc.appId))
    try {
      await window.api.setSteamDlcEnabled(dlc.appId, dlc.disabled)
      await loadDlcs()
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(dlc.appId)
        return next
      })
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

  // Resolve a DLC's state to an icon, style and tooltip: not owned (shop),
  // disabled (click to enable), or enabled (click to disable). The toggle is
  // applied on the next Steam game launch.
  const statusFor = (dlc: SteamDLCInfo) => {
    if (!dlc.owned) {
      return {
        className: 'notBought',
        icon: <ShoppingCart />,
        label: t('info.dlc.notBought', 'Not owned')
      }
    }
    if (dlc.disabled) {
      return {
        className: 'notInstalled',
        icon: <Block />,
        label: t('info.dlc.disabled', 'Disabled — click to enable')
      }
    }
    return {
      className: 'installed',
      icon: <CheckCircle />,
      label: t('info.dlc.enabled', 'Enabled — click to disable')
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
                disabled={busy.has(dlc.appId)}
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
