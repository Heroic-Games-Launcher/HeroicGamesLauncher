import { app } from 'electron'
import pkg_json from 'backend/../../package.json'

function getHeroicVersion(): string {
  const VERSION_NUMBER = app.getVersion()
  // FIXME: Currently ESLint doesn't know that these are type-checked. I believe
  //        TS 5.X introduced support for this properly, so come back to this
  //        once we update to that
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const BETA_VERSION_NAME = pkg_json.versionNames.beta
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const STABLE_VERSION_NAME = pkg_json.versionNames.stable
  const isBetaOrAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaOrAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

export { getHeroicVersion }
