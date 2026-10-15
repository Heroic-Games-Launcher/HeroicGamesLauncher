import { move, moveSync } from 'fs-extra'
import { existsSync, mkdirSync } from 'graceful-fs'
import { dirname } from 'path'

export async function moveIfDestinationMissing(
  source: string,
  destination: string
): Promise<boolean> {
  if (!existsSync(source) || existsSync(destination)) return false

  mkdirSync(dirname(destination), { recursive: true })
  try {
    await move(source, destination)
    return true
  } catch (error) {
    // Another Heroic process may have completed the same migration after our
    // existence checks. In that case, the destination is authoritative.
    if (existsSync(destination)) return false
    throw error
  }
}

export function moveSyncIfDestinationMissing(
  source: string,
  destination: string
): boolean {
  if (!existsSync(source) || existsSync(destination)) return false

  mkdirSync(dirname(destination), { recursive: true })
  try {
    moveSync(source, destination)
    return true
  } catch (error) {
    if (existsSync(destination)) return false
    throw error
  }
}
