const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ue', {
  signinprompt: {
    requestexchangecodesignin: (data) => {
      ipcRenderer.send('processEpicLoginCode', data)
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
