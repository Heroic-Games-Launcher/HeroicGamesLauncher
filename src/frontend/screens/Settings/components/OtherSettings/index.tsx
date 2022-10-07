import './index.css'

import React from 'react'

import { useTranslation } from 'react-i18next'
import LauncherArgs from './LauncherArgs'
import MaxRecentGames from './MaxRecentGames'
import Shortcuts from './Shortcuts'
import OfflineMode from './OfflineMode'
import SteamRuntime from './SteamRuntime'
import Mongohud from './Mongohud'
import PrimeRun from './PrimeRun'
import GameMode from './GameMode'
import ShowFPS from './ShowFPS'
import EnvVariablesTable from './EnvVariablesTable'
import WrappersTable from './WrappersTable'
import PreferedLanguage from './PreferedLanguage'
import DefaultSteamPath from './DefaultSteamPath'
import AlternativeExe from './AlternativeExe'
import AudioFix from './AudioFix'
import DiscordRPC from './DiscordRPC'

export default function OtherSettings() {
  const { t } = useTranslation()

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.other')}</h3>

      <AlternativeExe />

      <ShowFPS />

      <GameMode />

      <PrimeRun />

      <AudioFix />

      <Mongohud />

      <SteamRuntime />

      <OfflineMode />

      <Shortcuts />

      <DiscordRPC />

      <MaxRecentGames />

      <DefaultSteamPath />

      <EnvVariablesTable />

      <WrappersTable />

      <LauncherArgs />

      <PreferedLanguage />
    </>
  )
}
