import { addHandler } from 'backend/ipc'
import { configStore } from './electronStores'
import { getCometBin, memoryLog } from 'backend/utils'
import { join } from 'path'
import { spawn } from 'child_process'
import { logInfo, LogPrefix } from 'backend/logger'

async function updateCometComponents(): Promise<string | undefined> {
  const userData = configStore.get_nodefault('userData')

  const username = userData?.username || 'unknown'

  const path = getCometBin()

  const child = spawn(join(path.dir, path.bin), [
    '--from-heroic',
    '--username',
    username,
    'overlay',
    '--force'
  ])

  child.stderr.setEncoding('utf-8')
  child.stdout.setEncoding('utf-8')

  const stdout = memoryLog()
  const stderr = memoryLog()

  const res = await new Promise<string | undefined>((res) => {
    child.stderr.on('data', (data: string) => {
      stderr.push(data)
    })
    child.stdout.on('data', (data: string) => {
      stdout.push(data)
    })

    child.on('close', (code) =>
      code
        ? res(stderr.join('').split('\n').slice(-3).join('\n'))
        : res(undefined)
    )
  })

  logInfo(['Comet components update finished\n', stderr.join('')], {
    prefix: LogPrefix.Gog
  })

  return res
}

addHandler('updateCometComponents', updateCometComponents)
