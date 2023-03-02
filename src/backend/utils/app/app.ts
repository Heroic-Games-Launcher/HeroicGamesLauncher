import * as axios from 'axios'
import {
  GITHUB_API,
  heroicConfigPath,
  heroicGamesConfigPath,
  icon,
  isWindows
} from '../../constants'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { getMainWindow } from '../../main_window'
import { spawnSync } from 'child_process'
import { Release } from 'common/types'
import { app, dialog } from 'electron'
import { existsSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import { join } from 'path'
import {
  callAllAbortControllers,
  createAbortController,
  deleteAbortController
} from '..'
import {
  gameInfoStore,
  installStore,
  libraryStore
} from '../../legendary/electronStores'
import {
  apiInfoCache as GOGapiInfoCache,
  gogInstallInfoStore as GOGinstallInfoStore,
  libraryStore as GOGlibraryStore
} from '../../gog/electronStores'
import { runLegendaryCommand } from '../../legendary/library'
import { notify } from '../../dialog/dialog'

const { showMessageBox } = dialog

// ###########
// # private #
// ###########

/**
 * Compares 2 SemVer strings following "major.minor.patch".
 * Checks if target is newer than base.
 */
function semverGt(target: string, base: string) {
  if (!target || !base) {
    return false
  }
  target = target.replace('v', '')

  // beta to beta
  if (base.includes('-beta') && target.includes('-beta')) {
    const bSplit = base.split('-beta.')
    const tSplit = target.split('-beta.')

    // same major beta?
    if (bSplit[0] === tSplit[0]) {
      base = bSplit[1]
      target = tSplit[1]
      return target > base
    } else {
      base = bSplit[0]
      target = tSplit[0]
    }
  }

  // beta to stable
  if (base.includes('-beta')) {
    base = base.split('-beta.')[0]
  }

  // stable to beta
  if (target.includes('-beta')) {
    target = target.split('-beta.')[0]
  }

  const [bmajor, bminor, bpatch] = base.split('.').map(Number)
  const [tmajor, tminor, tpatch] = target.split('.').map(Number)

  let isGE = false
  // A pretty nice piece of logic if you ask me. :P
  isGE ||= tmajor > bmajor
  isGE ||= tmajor === bmajor && tminor > bminor
  isGE ||= tmajor === bmajor && tminor === bminor && tpatch > bpatch
  return isGE
}

// ###########
// # public #
// ###########

const getHeroicVersion = () => {
  const VERSION_NUMBER = app.getVersion()
  const BETA_VERSION_NAME = 'Caesar Clown'
  const STABLE_VERSION_NAME = 'Trafalgar Law'
  const isBetaorAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaorAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

const getCurrentChangelog = async (): Promise<Release | null> => {
  logInfo('Checking for current version changelog', LogPrefix.Backend)

  try {
    const current = app.getVersion()

    const { data: release } = await axios.default.get(
      `${GITHUB_API}/tags/v${current}`
    )

    return release as Release
  } catch (error) {
    logError(
      ['Error when checking for current Heroic changelog'],
      LogPrefix.Backend
    )
    return null
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: getHeroicVersion(),
    copyright: 'GPL V3',
    iconPath: icon,
    website: 'https://heroicgameslauncher.com'
  })
  return app.showAboutPanel()
}

// can be removed if legendary and gogdl handle SIGTERM and SIGKILL
// for us
function killPattern(pattern: string) {
  logInfo(['Trying to kill', pattern], LogPrefix.Backend)
  let ret
  if (isWindows) {
    ret = spawnSync('Stop-Process', ['-name', pattern], {
      shell: 'powershell.exe'
    })
  } else {
    ret = spawnSync('pkill', ['-f', pattern])
  }
  logInfo(['Killed', pattern], LogPrefix.Backend)
  return ret
}

async function handleExit() {
  const isLocked = existsSync(join(heroicGamesConfigPath, 'lock'))
  const mainWindow = getMainWindow()

  if (isLocked && mainWindow) {
    const { response } = await showMessageBox(mainWindow, {
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      title: i18next.t('box.quit.title', 'Exit')
    })

    if (response === 0) {
      return
    }

    // This is very hacky and can be removed if gogdl
    // and legendary handle SIGTERM and SIGKILL
    const possibleChildren = ['legendary', 'gogdl']
    possibleChildren.forEach((procName) => {
      try {
        killPattern(procName)
      } catch (error) {
        logInfo([`Unable to kill ${procName}, ignoring.`, error])
      }
    })

    // Kill all child processes
    callAllAbortControllers()
  }
  app.exit()
}

async function clearCache() {
  GOGapiInfoCache.clear()
  GOGlibraryStore.clear()
  GOGinstallInfoStore.clear()
  installStore.clear()
  libraryStore.clear()
  gameInfoStore.clear()

  const abortID = 'legendary-cleanup'
  runLegendaryCommand(['cleanup'], createAbortController(abortID)).then(() =>
    deleteAbortController(abortID)
  )
}

function resetHeroic() {
  const heroicFolders = [heroicGamesConfigPath, heroicConfigPath]
  heroicFolders.forEach((folder) => {
    rmSync(folder, { recursive: true, force: true })
  })
  // wait a sec to avoid racing conditions
  setTimeout(() => {
    app.relaunch()
    app.quit()
  }, 1000)
}

const getLatestReleases = async (): Promise<Release[]> => {
  const newReleases: Release[] = []
  logInfo('Checking for new Heroic Updates', LogPrefix.Backend)

  try {
    const { data: releases } = await axios.default.get(GITHUB_API)
    const latestStable: Release = releases.filter(
      (rel: Release) => rel.prerelease === false
    )[0]
    const latestBeta: Release = releases.filter(
      (rel: Release) => rel.prerelease === true
    )[0]

    const current = app.getVersion()

    const thereIsNewStable = semverGt(latestStable.tag_name, current)
    const thereIsNewBeta = semverGt(latestBeta.tag_name, current)

    if (thereIsNewStable) {
      newReleases.push({ ...latestStable, type: 'stable' })
    }
    if (thereIsNewBeta) {
      newReleases.push({ ...latestBeta, type: 'beta' })
    }

    if (newReleases.length) {
      notify({
        title: i18next.t('Update Available!'),
        body: i18next.t(
          'notify.new-heroic-version',
          'A new Heroic version was released!'
        )
      })
    }

    return newReleases
  } catch (error) {
    logError(
      ['Error when checking for Heroic updates', error],
      LogPrefix.Backend
    )
    return []
  }
}

export {
  getCurrentChangelog,
  handleExit,
  killPattern,
  showAboutWindow,
  clearCache,
  resetHeroic,
  getLatestReleases,
  getHeroicVersion
}

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsAppUtils = {
  semverGt
}
