import { app, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater';

import { icon } from './constants'
import { checkForUpdates } from './utils';
import { logError } from './logger';
import { nativeImage } from 'electron/common';

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

autoUpdater.on('update-available', async () => {
    const { response, checkboxChecked } = await dialog.showMessageBox({
        title: 'Heroic',
        message: 'Update available',
        detail: 'There is an update available. Do you want to update Heroic?',
        checkboxLabel: 'Open changelog',
        checkboxChecked: false,
        icon: nativeImage.createFromPath(icon),
        buttons: ['No', 'Yes']
    })
    if (checkboxChecked) {
        shell.openExternal('https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases')
    }
    if (response === 1) {
        autoUpdater.downloadUpdate()
    }
    
})
autoUpdater.on('update-downloaded', async () => {
    app.relaunch()
    app.quit()
})
autoUpdater.on('error', (err) => {
    logError('failed to update', err)
    checkForUpdates() // legacy check for updates
})