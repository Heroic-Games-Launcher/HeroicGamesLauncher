/**
 * Process-wide butlerd client accessor.
 *
 * Other modules in `storeManagers/itchio/*` should call `getClient()` rather
 * than touching `ButlerdClient` directly — that way the binary lookup, db path
 * and user-agent are resolved in one place and the daemon is spawned lazily on
 * first use.
 */

import { join } from 'path'

import { ButlerdClient, getButlerdClient } from './butlerdClient'
import { butlerDbPath } from './constants'
import { getButlerBin } from 'backend/utils'
import { app } from 'electron'

let cachedUserAgent: string | undefined

function getUserAgent(): string {
  if (!cachedUserAgent) {
    cachedUserAgent = `heroic/${app.getVersion?.() ?? 'dev'}`
  }
  return cachedUserAgent
}

export async function getClient(): Promise<ButlerdClient> {
  const { dir, bin } = getButlerBin()
  return getButlerdClient(join(dir, bin), butlerDbPath, getUserAgent())
}
