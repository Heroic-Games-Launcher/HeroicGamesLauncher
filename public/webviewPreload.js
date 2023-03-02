const { ipcRenderer } = require('electron')

window.onload = () => {
  const content = document.body.innerText
  if (content.match(/"authorizationCode":/)) {
    const json = JSON.parse(document.querySelector('pre').innerText)
    ipcRenderer.sendToHost('processEpicLoginCode', json.authorizationCode)
  }
}
