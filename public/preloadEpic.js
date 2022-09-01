const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ue', {
  signinprompt: {
    requestexchangecodesignin: (data) => {
      console.log('exchange:', data)
      ipcRenderer.send('processEpicToken', data)
    },
    registersignincompletecallback: () => {
      return
    }
  },
  common: {
    launchexternalurl: (url) => {
      console.log(url)
      return
    }
  }
})
