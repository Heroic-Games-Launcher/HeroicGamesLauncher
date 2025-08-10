import { join } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import { spawn } from 'child_process'
import { ExtractTask } from 'backend/storeManagers/customLibraries/tasks/types'

export async function executeExtractTask(
  task: ExtractTask,
  gameFolder: string
): Promise<void> {
  const sourcePath = join(gameFolder, task.source)
  const destinationPath = join(gameFolder, task.destination || '')
  const fileExtension = '.' + sourcePath.toLowerCase().split('.').pop()

  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  await extractFile(sourcePath, destinationPath, fileExtension)
  rmSync(sourcePath)
}

async function extractFile(
  filePath: string,
  extractTo: string,
  extension: string
): Promise<void> {
  let command: string
  let args: string[]

  switch (extension) {
    case '.zip':
      command = 'unzip'
      args = ['-o', filePath, '-d', extractTo]
      break
    case '.tar':
      command = 'tar'
      args = ['-xf', filePath, '-C', extractTo]
      break
    case '.gz':
      command = 'tar'
      args = ['-xzf', filePath, '-C', extractTo]
      break
    case '.bz2':
      command = 'tar'
      args = ['-xjf', filePath, '-C', extractTo]
      break
    case '.xz':
      command = 'tar'
      args = ['-xJf', filePath, '-C', extractTo]
      break
    case '.7z':
      command = '7z'
      args = ['x', filePath, `-o${extractTo}`, '-y']
      break
    default:
      throw new Error(`Unsupported archive format: ${extension}`)
  }

  return new Promise((resolve, reject) => {
    const extractProcess = spawn(command, args)

    extractProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Extraction failed with code ${code}`))
      }
    })

    extractProcess.on('error', (error) => {
      reject(new Error(`Extraction command failed: ${error.message}`))
    })
  })
}
