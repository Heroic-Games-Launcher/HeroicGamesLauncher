import { app } from 'electron'
import pkg_json from 'backend/../../package.json'

function getHeroicVersion(): string {
  const VERSION_NUMBER = app.getVersion()
  const BETA_VERSION_NAME = pkg_json.versionNames.beta
  const STABLE_VERSION_NAME = pkg_json.versionNames.stable
  const isBetaOrAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaOrAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

export { getHeroicVersion }
