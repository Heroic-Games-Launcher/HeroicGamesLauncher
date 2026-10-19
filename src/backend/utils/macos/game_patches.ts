import { existsSync } from 'graceful-fs'
import { open } from 'fs/promises'
import { join } from 'path'

interface BytePatch {
  offset: number
  original: string
  patched: string
}

interface GamePatch {
  id: string
  title: string
  /** Path of the patched file relative to the game's install folder */
  file: string
  /** Size of the exact build the offsets were verified against */
  size: number
  description: string
  patches: BytePatch[]
}

/**
 * Patches for exact builds of games that refuse to start under D3DMetal.
 * A patch is only applied when the file size and the bytes at every offset
 * match, and can always be reverted byte-for-byte
 */
export const GAME_PATCHES: GamePatch[] = [
  {
    id: 'hellblade2-162837',
    title: "Senua's Saga: Hellblade II (build 162837)",
    file: 'Hellblade2/Binaries/Win64/Hellblade2-Win64-Shipping.exe',
    size: 185032848,
    description:
      'skip the Nanite/Virtual Shadow Map support check that quits the game under D3DMetal, and the outdated GPU driver warning',
    patches: [
      {
        // test bl,bl; je; test al,al; jne <supported> -> jmp <supported>
        offset: 0x63ccbd3,
        original: '84db740884c00f858a050000',
        patched: 'e99105000090909090909090'
      },
      {
        // test ecx,ecx; je <no warning> -> jmp <no warning>
        offset: 0x2519973,
        original: '85c90f84f2100000',
        patched: 'e9f5100000909090'
      }
    ]
  }
]

type PatchState = 'original' | 'patched' | 'unknown'

async function readPatchStates(
  path: string,
  gamePatch: GamePatch
): Promise<PatchState[] | 'wrong-size'> {
  const file = await open(path, 'r')
  try {
    const { size } = await file.stat()
    if (size !== gamePatch.size) return 'wrong-size'

    const states: PatchState[] = []
    for (const patch of gamePatch.patches) {
      const buffer = Buffer.alloc(patch.original.length / 2)
      await file.read(buffer, 0, buffer.length, patch.offset)
      const bytes = buffer.toString('hex')
      states.push(
        bytes === patch.original
          ? 'original'
          : bytes === patch.patched
            ? 'patched'
            : 'unknown'
      )
    }
    return states
  } finally {
    await file.close()
  }
}

async function writePatches(
  path: string,
  gamePatch: GamePatch,
  apply: boolean
) {
  const file = await open(path, 'r+')
  try {
    for (const patch of gamePatch.patches) {
      const bytes = Buffer.from(apply ? patch.patched : patch.original, 'hex')
      await file.write(bytes, 0, bytes.length, patch.offset)
    }
  } finally {
    await file.close()
  }
}

/**
 * Applies (or reverts) the known patches for the game installed in one of `gameRoots`
 *
 * @returns Descriptions of what was done or why nothing could be done
 */
export async function syncGamePatches(
  gameRoots: string[],
  enabled: boolean
): Promise<string[]> {
  const messages: string[] = []

  for (const gamePatch of GAME_PATCHES) {
    const path = gameRoots
      .map((root) => join(root, gamePatch.file))
      .find((candidate) => existsSync(candidate))
    if (!path) continue

    try {
      const states = await readPatchStates(path, gamePatch)
      if (states === 'wrong-size') {
        if (enabled) {
          messages.push(
            `${gamePatch.title} patch skipped: ${path} is a different build`
          )
        }
        continue
      }
      if (states.includes('unknown')) {
        messages.push(
          `${gamePatch.title} patch skipped: unexpected bytes in ${path}, leaving it untouched`
        )
        continue
      }

      const wanted: PatchState = enabled ? 'patched' : 'original'
      if (states.every((state) => state === wanted)) continue

      await writePatches(path, gamePatch, enabled)
      messages.push(
        enabled
          ? `Patched ${path} to ${gamePatch.description}`
          : `Restored the original bytes of ${path}`
      )
    } catch (error) {
      messages.push(
        `Failed to update the ${gamePatch.title} patch: ${String(error)}`
      )
    }
  }
  return messages
}
