const ipcRenderer = {
  invoke: (method: string) => {
    if (method === 'getFonts') {
      return ['Arial', 'Comic Sans']
    } else {
      return {}
    }
  }
}

window.require = (mod) => {
  if (mod === 'electron') {
    return { ipcRenderer }
  }
}
