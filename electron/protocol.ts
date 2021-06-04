import { BrowserWindow, dialog } from 'electron'
import { GlobalConfig } from './config'
import { LegendaryGame } from './games'

// TODO(adityaruplaha): Translate strings used here.
export async function handleProtocol(window : BrowserWindow, url : string) {
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  const [command, args_string] = path.split('?')
  const args = new Map<string, string>()
  args_string.split(',').forEach((arg) => {
    const [k, v] = arg.split('=')
    args.set(k, v)
  })
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping!', args)
  }
  const appName = args.get('appName')
  const game = LegendaryGame.get(appName)
  if (command === 'launch') {
    const { title, is_installed } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${appName}" not installed, ignoring launch request.`)
      return
    }
    const { response } = await dialog.showMessageBox(window, {
      'buttons': [
        'No', 'Yes'
      ],
      'cancelId': 0,
      'message': `Launch ${title}?`,
      'type': 'question'
    })
    if (response === 1) {
      return await game.launch()
    }
    return
  }
  if (command === 'install') {
    const { title, is_installed } = await game.getGameInfo()
    const { defaultInstallPath } = GlobalConfig.get().config
    if (is_installed) {
      console.log(`ProtocolHandler: "${appName}" already installed, ignoring install request.`)
      return
    }
    let path = args.get('path') || defaultInstallPath
    const {response, checkboxChecked} = await dialog.showMessageBox(window, {
      'buttons': [
        'No', 'Yes'
      ],
      'cancelId': 0,
      'checkboxChecked': true,
      'checkboxLabel': `Install to set path: ${path}`,
      'message': `Install ${title}?`,
      'type': 'question'
    })
    if (response === 1) {
      if (!checkboxChecked) {
        const { filePaths } = await dialog.showOpenDialog(window, {
          'buttonLabel': 'Install Here',
          'defaultPath': path,
          'message': 'Select Installation Path',
          'properties': ['createDirectory', 'openDirectory']
        })
        path = filePaths[0] || path
      }
      return await game.install(path)
    }
  }
}
