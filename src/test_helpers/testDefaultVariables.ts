import {GameInfo} from 'src/types'

const game: GameInfo = {
  app_name: 'game',
  art_cover: '',
  art_logo: '',
  art_square: '',
  cloud_save_enabled: false,
  compatible_apps: [],
  developer: '',
  extra: {
    about: {
      description: '',
      shortDescription: ''
    },
    reqs: []
  },
  folder_name: '',
  install: {
    executable: '',
    install_path: '',
    install_size: '',
    is_dlc: false,
    version: ''
  },
  is_game: true,
  is_installed: false,
  is_ue_asset: false,
  is_ue_plugin: false,
  is_ue_project: false,
  namespace: null,
  save_folder: '',
  title: ''
};

const plugin: GameInfo = {
  app_name: 'plugin',
  art_cover: '',
  art_logo: '',
  art_square: '',
  cloud_save_enabled: false,
  compatible_apps: [],
  developer: '',
  extra: {
    about: {
      description: '',
      shortDescription: ''
    },
    reqs: []
  },
  folder_name: '',
  install: {
    executable: '',
    install_path: '',
    install_size: '',
    is_dlc: false,
    version: ''
  },
  is_game: false,
  is_installed: true,
  is_ue_asset: true,
  is_ue_plugin: true,
  is_ue_project: true,
  namespace: null,
  save_folder: '',
  title: ''
};

export { game, plugin};
