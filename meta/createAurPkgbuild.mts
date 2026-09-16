import { appendFile, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const VERSION_REGEX = /^v?(\d+\.\d+\.\d+)$/
const PKGVER_REGEX = /^pkgver=(\d+\.\d+\.\d+)$/m
const PKGREL_REGEX = /^pkgrel=(\d+)$/m

function versionFromArgv(): string | null {
  const maybeVersion = process.argv.at(-1)
  if (!maybeVersion) return null

  const match = maybeVersion.match(VERSION_REGEX)
  const version = match?.[1]
  if (!version) return null

  console.log(`Got version from argv: ${version}`)
  return version
}

async function versionFromPackageJson(): Promise<string> {
  const version = await readFile(
    join(import.meta.dirname, '..', 'package.json'),
    'utf8'
  )
    .then((content) => Promise.try(JSON.parse, content))
    .then(({ version }: { version: string }) => version)
  console.log(`Got version from package.json: ${version}`)
  return version
}

async function getCurrentPkgbuild(): Promise<{
  currentPkgbuild: string
  currentVersion: string
}> {
  const pkgbuild = await fetch(
    'https://raw.githubusercontent.com/archlinux/aur/refs/heads/heroic-games-launcher-bin/PKGBUILD'
  ).then((res) => res.text())
  const version = pkgbuild.match(PKGVER_REGEX)?.[1]
  if (!version)
    return Promise.reject(
      new Error('Failed to find "pkgver=" entry in PKGBUILD')
    )
  return {
    currentPkgbuild: pkgbuild,
    currentVersion: version
  }
}

function getPkgrel(pkgbuild: string): number {
  const pkgrelStr = pkgbuild.match(PKGREL_REGEX)?.[1]
  if (!pkgrelStr) throw new Error('Failed to find "pkgrel=" entry in PKGBUILD')
  return parseInt(pkgrelStr)
}

async function logPkgverAndPkgrelIfCi(
  pkgver: string,
  pkgrel: number
): Promise<void> {
  const ci = process.env['CI']
  const githubOutput = process.env['GITHUB_OUTPUT']
  if (ci && githubOutput) {
    await appendFile(githubOutput, `pkgver=${pkgver}`)
    await appendFile(githubOutput, `pkgrel=${pkgrel}`)
  }
}

async function main(): Promise<void> {
  const newVersion = versionFromArgv() || (await versionFromPackageJson())

  const { currentPkgbuild, currentVersion } = await getCurrentPkgbuild()

  let pkgrel = 1
  if (newVersion == currentVersion) {
    const currentPkgrel = getPkgrel(currentPkgbuild)
    pkgrel = currentPkgrel + 1
  }

  await logPkgverAndPkgrelIfCi(newVersion, pkgrel)

  const newPkgbuild = currentPkgbuild
    .replace(PKGVER_REGEX, `pkgver=${newVersion}`)
    .replace(PKGREL_REGEX, `pkgrel=${pkgrel}`)

  await writeFile('./PKGBUILD', newPkgbuild)
  console.log(`Wrote updated PKGBUILD. pkgver=${newVersion}, pkgrel=${pkgrel}`)
}

void main()
