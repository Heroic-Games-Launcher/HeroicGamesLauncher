function buildMacOsShortcutLaunchCommand(
  executable: string,
  appName: string,
  runner: string
) {
  const launchUrl = `heroic://launch?appName=${appName}&runner=${runner}`
  return `${executable} --no-gui "${launchUrl}"`
}

export { buildMacOsShortcutLaunchCommand }
