import { exec } from 'child_process'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { getSystemInfo } from './systeminfo'

/**
 * Executes a system command, optionally on the host if running in Flatpak.
 */
async function runCommand(command: string) {
  const info = await getSystemInfo()
  let finalCommand = command

  if (info.isFlatpak) {
    finalCommand = `flatpak-spawn --host ${command}`
  }

  return new Promise<void>((resolve) => {
    exec(finalCommand, (error) => {
      if (error) {
        logError(
          [`Failed to execute power command: ${finalCommand}`, error],
          LogPrefix.Backend
        )
      } else {
        logInfo([`Executed power command: ${finalCommand}`], LogPrefix.Backend)
      }
      resolve()
    })
  })
}

/**
 * Shut down the system.
 */
export async function shutdown() {
  logInfo(['System shutdown requested'], LogPrefix.Backend)
  if (process.platform === 'win32') {
    return runCommand('shutdown /s /t 0')
  } else if (process.platform === 'darwin') {
    return runCommand('osascript -e \'tell app "System Events" to shut down\'')
  } else {
    return runCommand('systemctl poweroff')
  }
}

/**
 * Suspend the system.
 */
export async function suspend() {
  logInfo(['System suspend requested'], LogPrefix.Backend)
  if (process.platform === 'win32') {
    return runCommand('rundll32.exe powrprof.dll,SetSuspendState 0,1,0')
  } else if (process.platform === 'darwin') {
    return runCommand('osascript -e \'tell app "System Events" to sleep\'')
  } else {
    return runCommand('systemctl suspend')
  }
}

/**
 * Turn off the screen.
 */
export async function turnOffScreen() {
  logInfo(['Screen off requested'], LogPrefix.Backend)
  const info = await getSystemInfo()

  if (process.platform === 'win32') {
    // Windows: Use PowerShell to call user32.dll SendMessage to turn off monitor
    const psCommand =
      'powershell -Command "(Add-Type \'[DllImport(\\"user32.dll\\")]public static extern int SendMessage(int hWnd,int hMsg,int wParam,int lParam);\' -Name a -Passthru)::SendMessage(-1,0x0112,0xF170,2)"'
    return runCommand(psCommand)
  } else if (process.platform === 'darwin') {
    // macOS: pmset displaysleepnow
    return runCommand('pmset displaysleepnow')
  } else {
    // Linux
    if (info.displayServer === 'x11' || info.steamDeckInfo.isDeck) {
      // DPMS is common for X11 and works on Steam Deck Gamescope too
      return runCommand('xset dpms force off')
    } else if (info.displayServer === 'wayland') {
      // Try multiple Wayland methods (KDE, GNOME)
      // KDE
      void runCommand(
        'qdbus org.kde.kglobalaccel /component/org_kde_powerdevil invokeShortcut "Turn Off Screen"'
      )
      // GNOME (This locks the screen as well, which is often expected)
      void runCommand(
        "dbus-send --session --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Eval string:'Main.screenShield.lock()'"
      )
    } else {
      // Fallback
      return runCommand('xset dpms force off')
    }
  }
}
