import { exec } from 'child_process'

/**
 * Shuts down the system.
 */
export const shutdown = async () => {
  switch (process.platform) {
    case 'win32': {
      exec('shutdown /s /t 0')
      break
    }
    case 'linux': {
      exec('shutdown now')
      break
    }
    case 'darwin': {
      exec('shutdown -h now')
      break
    }
    default: {
      console.log('Unsupported OS')
      break
    }
  }
}
