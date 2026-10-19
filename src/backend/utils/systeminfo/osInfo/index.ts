const macOSCodenames: Record<number, string> = {
  11: 'Big Sur',
  12: 'Monterey',
  13: 'Ventura',
  14: 'Sonoma',
  15: 'Sequoia',
  26: 'Tahoe'
}

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
    case 'darwin': {
      const major = parseInt(process.getSystemVersion())
      const codename = macOSCodenames[major]
      return { name: codename ? `macOS ${codename}` : 'macOS' }
    }
    default:
      return { name: '' }
  }
}

export { getOsInfo }
