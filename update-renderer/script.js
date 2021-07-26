import { ipcRenderer } from 'electron'

ipcRenderer.on('update-progbar', (e, progress, bytesPsec, percent, total, transferred) => {
  const progbar = document.querySelector('#progbar')
  progbar.setAttribute('value', percent)
  const bytesPsecEl = document.querySelector('#bytesPsec')
  bytesPsecEl.textContent = bytesPsec
})