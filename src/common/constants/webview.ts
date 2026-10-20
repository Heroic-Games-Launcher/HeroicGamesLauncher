/**
 * Electron session partition names used by store webviews.
 * Keeping them here prevents naming mismatches between the login
 * flow (WebView) and the cleanup code (logout handlers).
 */
export const WEBVIEW_PARTITION = {
  epic: 'persist:epic',
  gog: 'persist:gog',
  amazon: 'persist:amazon',
  zoom: 'persist:zoom'
} as const

/** Maps runner names to their WEBVIEW_PARTITION key. */
const RUNNER_TO_PARTITION_KEY: Record<string, keyof typeof WEBVIEW_PARTITION> =
  {
    legendary: 'epic',
    gog: 'gog',
    nile: 'amazon',
    zoom: 'zoom'
  }

/**
 * Returns the Electron session partition for the given store/runner.
 * Falls back to `persist:<key>` for unrecognised values.
 */
export function getWebviewPartition(
  store: string | undefined,
  runner: string | undefined
): string {
  const key = store ?? (runner ? RUNNER_TO_PARTITION_KEY[runner] : undefined)
  if (key && key in WEBVIEW_PARTITION) {
    return WEBVIEW_PARTITION[key as keyof typeof WEBVIEW_PARTITION]
  }
  return `persist:${store ?? runner}`
}
