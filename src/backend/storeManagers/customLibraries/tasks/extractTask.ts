import { join } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import { ExtractTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { extractFiles } from 'backend/utils'

export async function executeExtractTask(
  task: ExtractTask,
  gameFolder: string
): Promise<void> {
  const sourcePath = join(gameFolder, task.source)
  const destinationPath = join(gameFolder, task.destination || '')

  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  const result = await extractFiles({
    path: sourcePath,
    destination: destinationPath,
    strip: 0
  })

  if (result?.status === 'error') {
    throw new Error(`Extraction failed: ${result.error}`)
  }

  rmSync(sourcePath)
}
