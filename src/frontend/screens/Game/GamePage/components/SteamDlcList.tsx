import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import { Ban, CircleCheck, ExternalLink, ShoppingCart } from 'lucide-react'
import { CachedImage } from 'frontend/components/UI'
import { SteamDLCInfo } from 'common/types/steam'

interface Props {
  dlcs: SteamDLCInfo[]
  onChange: () => Promise<void>
}

const SteamDlcList = ({ dlcs, onChange }: Props) => {
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const dlcStorePage = (storeUrl: string) =>
    `/store-page?store-url=${encodeURIComponent(storeUrl)}`

  const onStatusClick = async (dlc: SteamDLCInfo) => {
    if (!dlc.owned) {
      navigate(dlcStorePage(dlc.storeUrl))
      return
    }
    if (busy.has(dlc.appId)) {
      return
    }
    setBusy((prev) => new Set(prev).add(dlc.appId))
    try {
      await window.api.setSteamDlcEnabled(dlc.appId, dlc.disabled)
      await onChange()
    } catch (error) {
      window.api.logError(`Failed to toggle Steam DLC: ${String(error)}`)
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(dlc.appId)
        return next
      })
    }
  }

  // Resolve a DLC's state to an icon
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
        icon: <Ban />,
        label: t('info.dlc.disabled', 'Disabled — click to enable')
      }
    }
    return {
      className: 'installed',
      icon: <CircleCheck />,
      label: t('info.dlc.enabled', 'Enabled — click to disable')
    }
  }

  return (
    <div className="steamDlcInfo">
      <ul className="steamDlcList">
        {dlcs.map((dlc) => {
          const status = statusFor(dlc)
          return (
            <li key={dlc.appId} className="steamDlcRow">
              <CachedImage
                className="steamDlcImage"
                src={dlc.imageUrl}
                fallback={dlc.imageFallbackUrl}
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
                to={dlcStorePage(dlc.storeUrl)}
                title={t('button.steamStore', 'Open Steam Page')}
                aria-label={t('button.steamStore', 'Open Steam Page')}
              >
                <ExternalLink />
              </NavLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SteamDlcList
