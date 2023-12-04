async function getOsInfo(): Promise<{ name: string; version?: string }> {
  switch (process.platform) {
    case 'win32': {
      const { osInfo_windows } = await import('./windows')
      return osInfo_windows()
    }
    case 'linux': {
      const { osInfo_linux } = await import('./linux')
      return osInfo_linux()
    }
    case 'darwin':
      // FIXME: I'd like to return the OS's codename ("Monterey", "Ventura", and
      //        so on) here, but the only way for applications to obtain those
      //        seems to be scraping a license file (https://unix.stackexchange.com/questions/234104/get-osx-codename-from-command-line)
      return { name: '' }
    default:
      return { name: '' }
  }
}

export { getOsInfo }
