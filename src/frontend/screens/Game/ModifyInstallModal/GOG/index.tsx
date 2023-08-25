import { GameInfo } from 'common/types'
import { BuildItem, GogInstallInfo } from 'common/types/gog'
import { SelectField, UpdateComponent } from 'frontend/components/UI'
import { getInstallInfo, getPreferredInstallLanguage } from 'frontend/helpers'
import DLCDownloadListing from 'frontend/screens/Library/components/InstallModal/DownloadDialog/DLCDownloadListing'
import Collapsible from 'frontend/components/UI/Collapsible/Collapsible'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BuildSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/BuildSelector'
import GameLanguageSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/GameLanguageSelector'

interface GOGModifyInstallModal {
  gameInfo: GameInfo
  onClose: () => void
}

export default function GOGModifyInstallModal({
  gameInfo,
  onClose
}: GOGModifyInstallModal) {
  const { t, i18n } = useTranslation('gamepage')
  const [gameInstallInfo, setGameInstallInfo] = useState<GogInstallInfo>()

  const [installLanguages, setInstallLanguages] = useState<string[]>([])
  const [installLanguage, setInstallLanguage] = useState<string>(
    gameInfo.install.language ?? 'en-US'
  )

  const [branches, setBranches] = useState<Array<string | null>>([])
  const [branch, setBranch] = useState<string | undefined>()

  // undefined means latest from current branch
  const [selectedBuild, setSelectedBuild] = useState<string | undefined>(
    gameInfo.install.pinnedVersion ? gameInfo.install.buildId : undefined
  )
  const [builds, setBuilds] = useState<BuildItem[]>([])
  const [currentBuildNotAvailable, setCurrentBuildNotAvailable] =
    useState<boolean>(false)

  const [installedDlcs, setInstalledDlcs] = useState<string[]>([])

  const handleConfirm = () => {
    const gameBuild = selectedBuild || builds[0].build_id
    const versionPinned = !!selectedBuild
    const buildModified = gameBuild !== gameInfo.install.buildId
    const languageModified = installLanguage !== gameInfo.install.language
    const branchModified = branch !== gameInfo.install.branch

    console.log('-----')
    console.log('buildModified', buildModified)
    console.log('branchModified', branchModified)
    console.log('languageModified', languageModified)
    console.log('versionPinned', versionPinned)
    console.log('-----')

    const gameModified = buildModified || branchModified || languageModified
    console.log('Game modified', gameModified)
    onClose()
  }

  useEffect(() => {
    async function get() {
      const installInfo = (await getInstallInfo(
        gameInfo.app_name,
        'gog',
        gameInfo.install.platform || 'windows',
        undefined,
        branch || gameInfo.install.branch
      )) as GogInstallInfo | null
      if (!installInfo) {
        // TODO: Handle error
        return
      }
      setGameInstallInfo(installInfo)
    }
    get()
  }, [branch])

  useEffect(() => {
    if (gameInstallInfo && 'builds' in gameInstallInfo.manifest) {
      const currentBranch = branch || null
      const newBuilds = (gameInstallInfo.manifest.builds || [])
        .filter((build) => build.branch === currentBranch)
        .sort(
          (a, b) =>
            new Date(b.date_published).getTime() -
            new Date(a.date_published).getTime()
        )
      const currentBuildInList = newBuilds.find(
        (build) => build.build_id === gameInfo.install.buildId
      )
      if (branch === gameInfo.install.branch) {
        setCurrentBuildNotAvailable(!currentBuildInList)
        console.log(currentBuildNotAvailable)
      }
      if (newBuilds.length > 0) {
        setSelectedBuild(selectedBuild ? newBuilds[0].build_id : undefined)
      }
      setBuilds(newBuilds)
    }
  }, [gameInstallInfo, branch, gameInfo.install])

  useEffect(() => {
    if (gameInstallInfo) {
      if ('languages' in gameInstallInfo.manifest) {
        setInstallLanguages(gameInstallInfo.manifest.languages.sort())
        if (!gameInstallInfo.manifest.languages.includes(installLanguage)) {
          setInstallLanguage(
            getPreferredInstallLanguage(
              gameInstallInfo.manifest.languages,
              i18n.languages
            )
          )
        }
      }

      if ('branches' in gameInstallInfo.game) {
        setBranches(gameInstallInfo.game.branches || [])
      }

      setInstalledDlcs(gameInfo.install.installedDLCs || [])
    }
  }, [gameInstallInfo, gameInfo.install])

  const DLCList = gameInstallInfo?.game.owned_dlc || []

  return gameInstallInfo ? (
    <>
      <Collapsible
        isOpen
        isCollapsible={DLCList.length > 0}
        summary={t('modifyInstall.versionCollapsable', 'Game Version')}
      >
        <div className="ModifyInstall__branch">
          <SelectField
            label={t('game.branch.select', 'Select beta channel')}
            htmlId="modify-branches"
            value={String(branch)}
            onChange={(e) => {
              const value = e.target.value
              if (value === 'null') {
                setBranch(undefined)
              } else if (value === 'heroic-update-passwordOption') {
                // Handle password setting
              } else {
                setBranch(e.target.value)
              }
            }}
          >
            {branches.map((branch) => (
              <option value={String(branch)} key={String(branch)}>
                {branch || t('game.branch.disabled', 'Disabled')}
              </option>
            ))}
            <option value={'heroic-update-passwordOption'}>
              {t(
                'game.branch.setPrivateBranchPassword',
                'Set private channel password'
              )}
            </option>
          </SelectField>
        </div>

        {installLanguages.length > 1 && (
          <div className="ModifyInstall__languages">
            <GameLanguageSelector
              installLanguages={installLanguages}
              setInstallLanguage={setInstallLanguage}
              installPlatform={gameInfo.install.platform ?? 'windows'}
              installLanguage={installLanguage}
            />
          </div>
        )}

        <div className="ModifyInstall__version">
          <BuildSelector
            gameBuilds={builds}
            selectedBuild={selectedBuild}
            setSelectedBuild={setSelectedBuild}
          />
        </div>
      </Collapsible>
      {DLCList.length > 0 && (
        <Collapsible
          isOpen
          isCollapsible
          summary={t('modifyInstall.dlcsCollapsible', 'DLC')}
        >
          <div className="ModifyInstall__gogDlcs">
            <DLCDownloadListing
              DLCList={DLCList}
              dlcsToInstall={installedDlcs}
              setDlcsToInstall={setInstalledDlcs}
            />
          </div>
        </Collapsible>
      )}
      <button className="button is-success" onClick={handleConfirm}>
        OK
      </button>
    </>
  ) : (
    <UpdateComponent inline />
  )
}
