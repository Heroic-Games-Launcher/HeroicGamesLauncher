const { execFileSync } = require('child_process')
const { renameSync, rmSync } = require('fs')

const ORGANIZATION_ID = 'f7f99393-5adb-408c-8ca3-67e07cfe31e6'
const PROJECT_SLUG = 'HeroicGamesLauncher'
const SIGNING_POLICY_SLUG = 'release-signing'

exports.default = async function sign(configuration) {
  if (configuration.hash && configuration.hash.toLowerCase() !== 'sha256') {
    return
  }

  if (!process.env.SIGNPATH_API_TOKEN) {
    console.warn(
      `SIGNPATH_API_TOKEN not set, skipping signing of ${configuration.path}`
    )
    return
  }

  const outputPath = `${configuration.path}.signed`

  const commandParts = [
    "$ErrorActionPreference = 'Stop'",
    'Submit-SigningRequest' +
      ' -InputArtifactPath $env:SIGNPATH_INPUT' +
      ' -ApiToken $env:SIGNPATH_API_TOKEN' +
      ` -OrganizationId '${ORGANIZATION_ID}'` +
      ` -ProjectSlug '${PROJECT_SLUG}'` +
      ` -SigningPolicySlug '${SIGNING_POLICY_SLUG}'` +
      (process.env.SIGNPATH_ARTIFACT_CONFIGURATION
        ? ' -ArtifactConfigurationSlug $env:SIGNPATH_ARTIFACT_CONFIGURATION'
        : '') +
      ' -OutputArtifactPath $env:SIGNPATH_OUTPUT' +
      ' -WaitForCompletion'
  ]

  console.log(`Submitting ${configuration.path} to SignPath`)

  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      commandParts.join('; ')
    ],
    {
      stdio: 'inherit',
      timeout: 10 * 60 * 1000,
      env: {
        ...process.env,
        SIGNPATH_INPUT: configuration.path,
        SIGNPATH_OUTPUT: outputPath
      }
    }
  )

  rmSync(configuration.path)
  renameSync(outputPath, configuration.path)
}
