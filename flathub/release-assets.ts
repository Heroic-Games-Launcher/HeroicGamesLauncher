interface ReleaseAsset {
  browser_download_url: string
}

export function selectAppImageAsset<T extends ReleaseAsset>(
  assets: T[],
  architecture: 'x86_64' | 'arm64'
): T {
  const asset = assets.find((asset) =>
    asset.browser_download_url.endsWith(`-linux-${architecture}.AppImage`)
  )
  if (!asset)
    throw new Error(`No Linux ${architecture} AppImage in this release`)
  return asset
}
