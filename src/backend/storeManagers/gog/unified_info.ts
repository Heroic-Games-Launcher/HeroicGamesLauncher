import { GameInfo } from 'common/types'
import { ProductsEndpointData } from 'common/types/gog'

function normalizeImageUrl(url?: string): string {
  if (!url) return ''
  return url.startsWith('//') ? `https:${url}` : url
}

export function productToGameInfo(
  info: ProductsEndpointData,
  appName = String(info.id)
): GameInfo {
  const artCover = normalizeImageUrl(info.images.logo || info.images.icon)
  const artSquare = normalizeImageUrl(
    info.images.icon || info.images.sidebarIcon || info.images.logo
  )
  const description = info.description?.full || info.description?.lead || ''

  return {
    runner: 'gog',
    app_name: appName,
    art_cover: artCover,
    art_square: artSquare || artCover,
    art_logo: normalizeImageUrl(info.images.logo),
    art_background: normalizeImageUrl(info.images.background),
    art_icon: normalizeImageUrl(info.images.icon),
    cloud_save_enabled: false,
    extra: {
      about: {
        description,
        shortDescription: info.description?.lead || ''
      },
      reqs: []
    },
    folder_name: '',
    install: {
      is_dlc: info.game_type !== 'game'
    },
    installable: info.is_installable,
    is_installed: false,
    save_folder: '',
    title: info.title.trim(),
    canRunOffline: true,
    is_mac_native: info.content_system_compatibility.osx,
    is_linux_native: info.content_system_compatibility.linux
  }
}
