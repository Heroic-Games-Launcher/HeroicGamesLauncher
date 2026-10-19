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
  const cleaned = selected.replace(/\/+$/, '')
  if (!cleaned.toLowerCase().endsWith('.app') || !launchExe) return selected
  const bundle = basename(cleaned).toLowerCase()
  const relative = launchExe.replaceAll('\\', '/').replace(/^\/+/, '')
  const lower = relative.toLowerCase()
  if (lower === bundle || lower.startsWith(`${bundle}/`)) {
    return dirname(cleaned)
  }
  return cleaned
}
