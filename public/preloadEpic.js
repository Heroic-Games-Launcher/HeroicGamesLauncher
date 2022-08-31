const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('ue', {
  signinprompt: {
    requestexchangecodesignin: (data) => console.log('exchange:', data),
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
