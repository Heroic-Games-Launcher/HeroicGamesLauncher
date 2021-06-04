import {GameInfo} from 'src/types'

const game: GameInfo = {
  app_name: 'game',
  art_cover: 'art_cover',
  art_logo: 'art_logo',
  art_square: 'art_square',
  cloud_save_enabled: false,
  compatible_apps: ['compatible_apps'],
  developer: 'developer',
  extra: {
    about: {
      description: 'description',
      shortDescription: 'shortDescription'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install_path',
    install_size: 'install_size',
    is_dlc: false,
    version: 'version'
  },
  is_game: true,
  is_installed: false,
  is_ue_asset: false,
  is_ue_plugin: false,
  is_ue_project: false,
  namespace: null,
  save_folder: '{appdata}/../locallow',
  title: 'title'
};

const plugin: GameInfo = {
  app_name: 'plugin',
  art_cover: 'art_cover',
  art_logo: 'art_logo',
  art_square: 'art_square',
  cloud_save_enabled: false,
  compatible_apps: [],
  developer: 'developer',
  extra: {
    about: {
      description: 'description',
      shortDescription: 'shortDescription'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install_path',
    install_size: 'install_size',
    is_dlc: false,
    version: 'version'
  },
  is_game: false,
  is_installed: true,
  is_ue_asset: true,
  is_ue_plugin: true,
  is_ue_project: true,
  namespace: null,
  save_folder: 'save_folder',
  title: 'title'
};

export { game, plugin};
