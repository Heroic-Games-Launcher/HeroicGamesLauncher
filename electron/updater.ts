import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

autoUpdater.on('error', (err) => {
  dialog.showErrorBox('Error', err)
})

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox(null, {
    title: 'Heroic Games Launcher',
    message: "There isn't any update available"
  })
})

autoUpdater.on('update-available', async (result) => {
  autoUpdater.downloadUpdate(result.cancellationToken)
})

autoUpdater.on('download-progress', async (progress, bytesPsec, percent, total, transferred) => {
  console.log(`Updating Heroic: ${progress} ${bytesPsec} ${percent}% / ${total} ${transferred}`)
})

autoUpdater.on('update-downloaded', async () => {
  const diag = await dialog.showMessageBox(null, {
    title: 'Heroic Games Launcher',
    message: 'An update has been downloaded',
    detail: 'Do you want to restart Heroic?',
    buttons: ['Restart', 'Remind me later']
  })
  if (diag.response === 1) return
  app.relaunch()
  app.quit()
})

export function checkUpdates() {
  autoUpdater.checkForUpdates()
}
