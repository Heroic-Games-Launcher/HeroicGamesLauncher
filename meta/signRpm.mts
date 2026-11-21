import { spawnSync } from 'node:child_process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const projectDir = join(import.meta.dirname, '..')
const distDir = join(projectDir, 'dist')
const publicKeyPath = join(distDir, 'RPM-GPG-KEY-heroic.asc')

type RunOptions = {
  env?: NodeJS.ProcessEnv
  input?: string
}

function run(
  command: string,
  args: string[],
  options: RunOptions = {}
): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...options.env, LC_ALL: 'C' },
    input: options.input
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(
      `\`${command} ${args.join(' ')}\` failed with exit code ${result.status}\n${result.stderr}`
    )
  }

  return result.stdout
}

async function findRpmFiles(): Promise<string[]> {
  const filesFromArgs = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('--'))
    .map((file) => resolve(file))

  if (filesFromArgs.length > 0) {
    return filesFromArgs
  }

  const entries = await readdir(distDir)
  const rpmFiles = entries
    .filter((entry) => entry.endsWith('.rpm'))
    .map((entry) => join(distDir, entry))

  if (rpmFiles.length === 0) {
    throw new Error(`No RPM packages found in ${distDir}`)
  }

  return rpmFiles
}

async function readPrivateKey(): Promise<string> {
  const privateKey = process.env.RPM_GPG_PRIVATE_KEY
  if (privateKey) {
    return privateKey
  }

  const privateKeyFile = process.env.RPM_GPG_PRIVATE_KEY_FILE
  if (privateKeyFile) {
    return readFile(privateKeyFile, 'utf8')
  }

  throw new Error(
    'Set RPM_GPG_PRIVATE_KEY to an armored private key or RPM_GPG_PRIVATE_KEY_FILE to its path'
  )
}

function findKeyId(gnupgHome: string): string {
  const configuredKeyId = process.env.RPM_GPG_KEY_ID
  if (configuredKeyId) {
    return configuredKeyId
  }

  const secretKeys = run('gpg', [
    '--batch',
    '--homedir',
    gnupgHome,
    '--with-colons',
    '--list-secret-keys'
  ])

  for (const line of secretKeys.split('\n')) {
    if (line.startsWith('fpr:')) {
      return line.split(':')[9]
    }
  }

  throw new Error('No secret key found in RPM_GPG_PRIVATE_KEY')
}

function readSignature(rpmFile: string, tag: string): string {
  return run('rpm', ['-qp', '--qf', `%{${tag}:pgpsig}`, rpmFile]).trim()
}

function assertSigned(rpmFile: string): string {
  const signature = ['RSAHEADER', 'DSAHEADER']
    .map((tag) => readSignature(rpmFile, tag))
    .find((value) => value !== '' && value !== '(none)')

  if (!signature) {
    throw new Error(`${rpmFile} has no signature after signing`)
  }

  return signature
}

async function main(): Promise<void> {
  const rpmFiles = await findRpmFiles()
  const privateKey = await readPrivateKey()
  const gnupgHome = await mkdtemp(join(tmpdir(), 'heroic-rpm-'))

  try {
    await chmod(gnupgHome, 0o700)
    run('gpg', ['--batch', '--homedir', gnupgHome, '--import'], {
      input: privateKey
    })

    const keyId = findKeyId(gnupgHome)
    const signingEnv = { GNUPGHOME: gnupgHome }

    for (const rpmFile of rpmFiles) {
      run(
        'rpmsign',
        [
          '--addsign',
          '--define',
          `_gpg_name ${keyId}`,
          '--define',
          `_gpg_path ${gnupgHome}`,
          '--define',
          '_gpg_digest_algo sha256',
          rpmFile
        ],
        { env: signingEnv }
      )
      console.log(`Signed ${rpmFile}: ${assertSigned(rpmFile)}`)
    }

    const publicKey = run('gpg', [
      '--batch',
      '--homedir',
      gnupgHome,
      '--armor',
      '--export',
      keyId
    ])
    await mkdir(distDir, { recursive: true })
    await writeFile(publicKeyPath, publicKey)
    console.log(`Wrote public key to ${publicKeyPath}`)
  } finally {
    await rm(gnupgHome, { recursive: true, force: true })
  }
}

void main()
