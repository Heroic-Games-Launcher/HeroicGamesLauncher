import { Game } from 'frontend/state/new/Game'
import { GameDownloadQueue } from 'frontend/state/new/GameDownloadQueue'
import { t } from 'i18next'

export function useMenuContext(game: Game, downloadQueue: GameDownloadQueue) {
  return [
    {
      // remove from install queue
      label: t('button.queue.remove'),
      onclick: () => downloadQueue.removeGame(game),
      show: game.isQueued && !game.isInstalling
    },
    {
      // stop if running
      label: t('label.playing.stop'),
      onclick: () => game.stop(),
      show: game.isPlaying
    },
    {
      // launch game
      label: t('label.playing.start'),
      onclick: () => game.play(),
      show:
        game.isInstalled &&
        !game.isPlaying &&
        !game.isUpdating &&
        !game.isQueued
    },
    {
      // update
      label: t('button.update', 'Update'),
      onclick: () => game.update(),
      show: game.hasUpdate && !game.isUpdating && !game.isQueued
    },
    {
      // install
      label: t('button.install'),
      onclick: () => game.install(),
      show: !game.isInstalled && !game.isQueued
      // || runner === 'sideload'
    },
    {
      // cancel installation/update
      label: t('button.cancel'),
      onclick: async () => game.cancelProgress(),
      show: game.isInstalling || game.isUpdating
    },
    {
      // hide
      label: t('button.hide_game', 'Hide Game'),
      onclick: () => game.hide(),
      show: !game.isHidden
    },
    {
      // unhide
      label: t('button.unhide_game', 'Unhide Game'),
      onclick: () => game.show(),
      show: game.isHidden
    },
    {
      label: t('button.add_to_favourites', 'Add To Favourites'),
      onclick: () => game.favorite(),
      show: !game.isFavourite
    },
    {
      label: t('button.remove_from_favourites', 'Remove From Favourites'),
      onclick: () => game.unFavorite(),
      show: game.isFavourite
    },
    {
      label: t('button.remove_from_recent', 'Remove From Recent'),
      onclick: async () => game.asNotRecent(),
      show: game.isRecent
    },
    // {
    // settings
    // label: t('submenu.settings')
    // onclick: () =>
    //   navigate(pathname, {
    //     state: {
    //       fromGameCard: true,
    //       runner,
    //       hasCloudSave,
    //       isLinuxNative,
    //       isMacNative
    //     }
    //   }),
    // show: game.isInstalled && !game.isUninstalling
    // },
    {
      // uninstall
      label: t('button.uninstall'),
      onclick: () => game.uninstall(),
      show: game.isInstalled && !game.isUpdating
    }
  ]
}
