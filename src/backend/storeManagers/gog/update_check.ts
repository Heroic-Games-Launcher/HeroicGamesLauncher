function normalizeEtag(etag: string | undefined): string {
  return (etag ?? '').replace(/^W\//, '').replaceAll('"', '')
}

/**
 * Mac and Windows builds move independently. Compare the installed build for
 * this platform, and treat a weak etag as the same tag.
 */
export function gogUpdateAvailable(options: {
  installedBuild?: string
  latestBuild?: string
  installedEtag?: string
  responseStatus: number
  responseEtag?: string
}): { update: boolean; etagToStore?: string } {
  const { installedBuild, latestBuild, responseStatus, responseEtag } = options
  if (installedBuild && latestBuild) {
    return { update: installedBuild !== latestBuild }
  }

  const stored = normalizeEtag(options.installedEtag)
  const remote = normalizeEtag(responseEtag)
  if (!stored) {
    return { update: false, etagToStore: remote || undefined }
  }
  return {
    update: responseStatus === 200 && remote !== '' && remote !== stored
  }
}
