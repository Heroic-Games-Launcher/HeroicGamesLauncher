import { basename, dirname } from 'path'

/**
 * Legendary looks for the manifest's launch_exe inside the directory it is
 * given. Mac manifests usually start with `Game.app/...`, so that directory
 * is the folder containing the bundle, not the bundle itself.
 */
export function legendaryImportDirectory(
  selected: string,
  launchExe: string | undefined
): string {
  if (!selected.endsWith('.app') || !launchExe) return selected
  const bundle = basename(selected)
  const relative = launchExe.replaceAll('\\', '/')
  if (relative === bundle || relative.startsWith(`${bundle}/`)) {
    return dirname(selected)
  }
  return selected
}
