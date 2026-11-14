import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DismissibleBanner } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import type { Runner } from 'common/types'
import type { SteamDataFetchFailure, SteamDataKind } from 'common/types/steam'

/**
 * Collects failed Aurelia fetches for one game.
 */
export const useSteamDataFailures = (
  appName: string,
  runner: Runner
): SteamDataFetchFailure[] => {
  const [failures, setFailures] = useState<SteamDataFetchFailure[]>([])

  useEffect(() => {
    setFailures([])
    if (runner !== 'steam') return
    return window.api.handleSteamDataFetchFailed((_e, failure) => {
      if (failure.appId !== appName) return
      setFailures((prev) =>
        prev.some((entry) => entry.data === failure.data)
          ? prev
          : [...prev, failure]
      )
    })
  }, [appName, runner])

  return failures
}

interface Props {
  appName: string
  failures: SteamDataFetchFailure[]
}

const SteamLoginBanner = ({ appName, failures }: Props) => {
  const { t, i18n } = useTranslation('gamepage')
  const { steam } = useContext(ContextProvider)

  const loggedOut =
    !steam.username || failures.some((failure) => failure.authRequired)
  if (!loggedOut) return null

  const labels: Record<SteamDataKind, string> = {
    storeInfo: t('steam.data.storeInfo', 'store information'),
    achievements: t('steam.data.achievements', 'achievements'),
    dlc: t('steam.data.dlc', 'DLC'),
    installInfo: t('steam.data.installInfo', 'download size'),
    launchOptions: t('steam.data.launchOptions', 'launch options')
  }
  const failed = new Intl.ListFormat(i18n.language, {
    type: 'conjunction'
  }).format(failures.map((failure) => labels[failure.data]))

  const online = t('steam.loggedOut.message', 'Online features might not work.')
  const message = failed
    ? `${online} ${t('steam.loggedOut.failed', {
        defaultValue: 'Retrieving {{data}} failed.',
        data: failed
      })}`
    : online

  return (
    <DismissibleBanner
      storageKey={`steam-logged-out-banner-${appName}`}
      title={t(
        'steam.loggedOut.title',
        'Steam account not logged in to Heroic'
      )}
      variant="warning"
    >
      {message}
    </DismissibleBanner>
  )
}

export default SteamLoginBanner
