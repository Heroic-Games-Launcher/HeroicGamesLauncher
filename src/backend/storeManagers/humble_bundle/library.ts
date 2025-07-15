import {
  ExecResult,
  GameInfo,
  InstallInfo,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { HumbleBundleUser } from './user'
import { logInfo, LogPrefix } from 'backend/logger'
import { Order, OrderMap, Subproduct } from './constants'
import { apiInfoCache, gridImageCache, libraryStore } from './electronStores'
import { getGameInfo as getGameInfoGame } from './games'

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
  return getGameInfoGame(appName)
}

export async function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  options: {
    branch?: string
    build?: string
    lang?: string
    retries?: number
  }
): Promise<InstallInfo | undefined> {
  console.log('getInstallInfo', { appName })
  const products = apiInfoCache.get('humble_api_info') || {}
  const product = products[appName]

  if (!product) {
    return undefined
  }

  const url = product.downloads.find((url) => url.platform == 'windows')
    ?.download_struct?.[0]?.url?.web

  if (!url) {
    return undefined
  }

  const response = await fetch(url, { method: 'HEAD' })
  const size = response.headers.get('content-length')

  const downloadSize = size ? parseInt(size, 10) : 0

  return {
    manifest: { download_size: downloadSize, disk_size: downloadSize * 2 },
    game: {
      id: appName,
      version: '0',
      cloud_saves_supported: false,
      external_activation: '',
      app_name: appName,
      is_dlc: false,
      launch_options: [],
      path: '',
      owned_dlc: [],
      platform_versions: {
        Windows: ''
      },
      title: appName
    }
  }
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

  const allOrders = Object.values(orders)
  const currentGames = libraryStore.get('games') || []
  const games = await extractGameInfoFromOrder(allOrders)
  const mergedGames = games.map((game) => {
    const existing = currentGames.find((g) => g.app_name === game.app_name)
    return {
      ...game,
      install: existing?.install ?? game.install,
      is_installed: existing?.is_installed || false
    }
  })
  libraryStore.set('games', mergedGames)
}

export async function extractGameInfoFromProduct(
  product: Subproduct
): Promise<GameInfo | null> {
  if (!isGame(product)) {
    return null
  }
  const image = await searchImage(product.human_name)
  return {
    runner: 'humble-bundle',
    app_name: product.machine_name,
    art_cover: image || '',
    art_square: image || '',
    folder_name: product.human_name,
    install: {
      is_dlc: false
    },
    is_installed: false,
    save_folder: '',
    canRunOffline: true,
    title: product.human_name,
    extra: {
      about: {
        description: product?.display_item?.['description-text'] || '',
        shortDescription: product?.display_item?.['description-text'] || ''
      },
      reqs: [],
      genres: []
    }
  }
}

async function extractGameInfoFromOrder(orders: Order[]) {
  const games: GameInfo[] = []
  const apiCache: { [key: string]: Subproduct } = {}
  for (const order of orders) {
    for (const product of order.subproducts) {
      const gameInfo = await extractGameInfoFromProduct(product)
      if (!gameInfo) {
        continue
      }
      apiCache[product.machine_name] = product
      games.push(gameInfo)
    }
  }
  apiInfoCache.set('humble_api_info', { ...apiCache })

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
