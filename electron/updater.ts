import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

autoUpdater.on('error', (err) => {
  dialog.showErrorBox('Failed to update Heroic', err)
})

autoUpdater.on('update-available', async (result) => {
  autoUpdater.downloadUpdate(result.cancellationToken)
})

autoUpdater.on('download-progress', async (progress, bytesPsec, percent, total, transferred) => {
  console.log(`Updating Heroic: Progress: ${progress} B/S: ${bytesPsec} ${percent}% / Total: ${total} Transferred: ${transferred}`)
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
