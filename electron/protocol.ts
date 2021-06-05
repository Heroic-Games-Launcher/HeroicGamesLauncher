import { BrowserWindow } from 'electron'
import { LegendaryGame } from './games'

// TODO(adityaruplaha): Translate strings used here.
export async function handleProtocol(window : BrowserWindow, url : string) {
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  const [command, appName] = path.split('/')
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping!', appName)
  }
  const game = LegendaryGame.get(appName)
  console.log({appName, game});
  if (command === 'launch') {
    const { is_installed } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${appName}" not installed, ignoring launch request.`)
      return
    }
    return window.webContents.send('launchGame', appName)
  }
  // Lets wait for a second interation for the install command
  // if (command === 'install') {
  //   const { title, is_installed } = await game.getGameInfo()
  //   const { defaultInstallPath } = GlobalConfig.get().config
  //   if (is_installed) {
  //     console.log(`ProtocolHandler: "${appName}" already installed, ignoring install request.`)
  //     return
  //   }
  //   let path = args.get('path') || defaultInstallPath
  //   const {response, checkboxChecked} = await dialog.showMessageBox(window, {
  //     'buttons': [
  //       'No', 'Yes'
  //     ],
  //     'cancelId': 0,
  //     'checkboxChecked': true,
  //     'checkboxLabel': `Install to set path: ${path}`,
  //     'message': `Install ${title}?`,
  //     'type': 'question'
  //   })
  //   if (response === 1) {
  //     if (!checkboxChecked) {
  //       const { filePaths } = await dialog.showOpenDialog(window, {
  //         'buttonLabel': 'Install Here',
  //         'defaultPath': path,
  //         'message': 'Select Installation Path',
  //         'properties': ['createDirectory', 'openDirectory']
  //       })
  //       path = filePaths[0] || path
  //     }
  //     return await game.install(path)
  //   }
  // }
}
