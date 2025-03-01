import { TypeCheckedStoreBackend } from '../../electron_store'
import { logError, logInfo } from '../../logger/logger'

import { LegendaryGlobalConfigFolderMigration } from './migrations/legendary'

import type { TypeCheckedStore } from 'common/types/electron_store'

export interface Migration {
  identifier: string
  run(): Promise<boolean>
}

export default class MigrationComponent {
  constructor() {
    this.migrationsStore = new TypeCheckedStoreBackend('migrationsStore', {
      cwd: 'store',
      name: 'migrations'
    })
  }

  async applyMigrations() {
    const appliedMigrations = this.migrationsStore.get('appliedMigrations', [])

    // NOTE: This intentionally runs migrations sequentially to avoid race conditions
    for (const migration of this.getAllMigrations()) {
      if (appliedMigrations.includes(migration.identifier)) continue

      const wasApplied = await this.applyMigration(migration)
      if (wasApplied) appliedMigrations.push(migration.identifier)
    }

    this.migrationsStore.set('appliedMigrations', appliedMigrations)
  }

  private async applyMigration(migration: Migration): Promise<boolean> {
    logInfo(['Applying migration', `"${migration.identifier}"`])
    const result = await migration.run().catch((e: Error) => e)

    if (!result) {
      // The idea here is that the migration failed, but did so gracefully.
      // It thus (hopefully) printed out some of its own logging on why it
      // failed
      logError([
        'Migration',
        `"${migration.identifier}"`,
        'failed. More details will be available above this message'
      ])
      return false
    }

    if (result instanceof Error) {
      logError([
        'Migration',
        `"${migration.identifier}"`,
        'encountered error while applying:',
        result
      ])
      return false
    }

    logInfo(['Migration', `"${migration.identifier}"`, 'successfully applied'])
    return true
  }

  private getAllMigrations(): Migration[] {
    return [new LegendaryGlobalConfigFolderMigration()]
  }

  private readonly migrationsStore: TypeCheckedStore<'migrationsStore'>
}
