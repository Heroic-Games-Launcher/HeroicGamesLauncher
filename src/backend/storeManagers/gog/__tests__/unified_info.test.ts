import { ProductsEndpointData } from 'common/types/gog'
import { productToGameInfo } from '../unified_info'

describe('productToGameInfo', () => {
  it('maps product API metadata into a usable GOG library entry', () => {
    const product = {
      id: 1971477531,
      title: '  GWENT: The Witcher Card Game  ',
      game_type: 'game',
      is_installable: true,
      images: {
        background: '//images.example/background.jpg',
        logo: '//images.example/logo.jpg',
        icon: '//images.example/icon.png',
        sidebarIcon: '//images.example/sidebar.png'
      },
      content_system_compatibility: {
        windows: true,
        osx: false,
        linux: true
      },
      description: {
        lead: 'Short description',
        full: 'Full description',
        whats_cool_about_it: ''
      }
    } as ProductsEndpointData

    expect(productToGameInfo(product, '1971477531')).toMatchObject({
      runner: 'gog',
      app_name: '1971477531',
      title: 'GWENT: The Witcher Card Game',
      art_cover: 'https://images.example/logo.jpg',
      art_square: 'https://images.example/icon.png',
      art_background: 'https://images.example/background.jpg',
      art_icon: 'https://images.example/icon.png',
      installable: true,
      is_mac_native: false,
      is_linux_native: true,
      extra: {
        about: {
          description: 'Full description',
          shortDescription: 'Short description'
        }
      }
    })
  })

  it('marks non-game products as DLC and keeps absolute image URLs', () => {
    const product = {
      id: 42,
      title: 'Expansion',
      game_type: 'dlc',
      is_installable: false,
      images: {
        background: 'https://images.example/background.jpg',
        logo: 'https://images.example/logo.jpg',
        icon: 'https://images.example/icon.png',
        sidebarIcon: 'https://images.example/sidebar.png'
      },
      content_system_compatibility: {
        windows: true,
        osx: true,
        linux: false
      }
    } as ProductsEndpointData

    expect(productToGameInfo(product)).toMatchObject({
      app_name: '42',
      title: 'Expansion',
      art_cover: 'https://images.example/logo.jpg',
      art_square: 'https://images.example/icon.png',
      install: { is_dlc: true },
      installable: false,
      is_mac_native: true,
      is_linux_native: false
    })
  })
})
