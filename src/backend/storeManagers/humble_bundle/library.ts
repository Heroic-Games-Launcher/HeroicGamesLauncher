import {
  ExecResult,
  GameInfo,
  InstallInfo,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { HumbleBundleUser } from './user'
import { logInfo, LogPrefix } from 'backend/logger'
import { library, Order, OrderMap, Subproduct } from './constants'
import { gridImageCache, libraryStore } from './electronStores'

const defaultExecResult = {
  stderr: '',
  stdout: ''
}

export async function refresh(): Promise<ExecResult | null> {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return defaultExecResult
  }
  await refreshHumble()
  loadGamesInAccount()
  return defaultExecResult
}

export function getGameInfo(
  appName: string,
  forceReload?: boolean
): GameInfo | undefined {
  return undefined
}

export function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  options: {
    branch?: string
    build?: string
    lang?: string
    retries?: number
  }
): Promise<InstallInfo | undefined> {
  return Promise.resolve(undefined)
}

export function listUpdateableGames(): Promise<string[]> {
  return Promise.resolve([])
}

export function changeGameInstallPath(appName: string, newPath: string) {
  return Promise.resolve()
}

export function changeVersionPinnedStatus(appName: string, status: boolean) {}

export function installState(appName: string, state: boolean) {}

export function getLaunchOptions(
  appName: string
): LaunchOption[] | Promise<LaunchOption[]> {
  return [
    {
      type: 'basic',
      name: '',
      parameters: ''
    }
  ]
}

async function loadGamesInAccount() {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return
  }

  console.log('refetching games humble')
}

async function refreshHumble() {
  logInfo('Refreshing Humble bundle...', LogPrefix.HumbleBundle)
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return
  }

  const response = await fetch(
    'https://www.humblebundle.com/api/v1/user/order',
    {
      redirect: 'manual',
      headers: {
        cookie: await HumbleBundleUser.getCookies()
      }
    }
  )

  let keys: string[] = (await response.json()).map(
    (r: { gamekey: string }) => r['gamekey']
  )
  const batch_size = 10
  let orders: OrderMap = {}
  while (keys.length > 0) {
    const currentKeys = keys.slice(0, batch_size)
    keys = keys.slice(batch_size, keys.length)
    const keysQuery = currentKeys
      .map((key) => `gamekeys=${encodeURIComponent(key)}`)
      .join('&')

    const response = await fetch(
      `https://www.humblebundle.com/api/v1/orders?all_tpkds=true&${keysQuery}`,
      {
        headers: {
          cookie: await HumbleBundleUser.getCookies()
        }
      }
    )

    const currentOrders = (await response.json()) as OrderMap
    orders = { ...orders, ...currentOrders }
  }

  const games = await extractGameInfoFromOrder(Object.values(orders))

  libraryStore.set('games', games)
}

async function extractGameInfoFromOrder(orders: Order[]) {
  const games: GameInfo[] = []
  orders.forEach((order) => {
    order.subproducts.forEach(async (product) => {
      console.log('>>>isGame', isGame(product))
      if (!isGame(product)) {
        return
      }
      const image = await searchImage(product.human_name)
      games.push({
        runner: 'humble-bundle',
        app_name: product.machine_name,
        art_cover: image || '',
        art_square: image || '',
        install: {
          is_dlc: false
        },
        is_installed: false,
        save_folder: '',
        canRunOffline: true,
        title: product.human_name
      })
    })
  })

  return games
}

function isGame(subproduct: Subproduct) {
  return subproduct.downloads.some((download) => {
    return (
      download.platform == 'windows' ||
      download.platform == 'linux' ||
      download.platform == 'mac'
    )
  })
}

async function searchImage(title: string) {
  const cachedImage = gridImageCache.get(title)
  if (cachedImage) {
    return cachedImage
  }

  try {
    const response = await fetch(
      `https://steamgrid.usebottles.com/api/search/${encodeURIComponent(title)}`
    )

    if (response.status === 200) {
      const steamGridImage = await response.json()

      if (steamGridImage && steamGridImage.startsWith('http')) {
        gridImageCache.set(title, steamGridImage)
        return steamGridImage
      }
    } else {
      return null
    }
  } catch (e) {
    return null
  }
  return null
}
